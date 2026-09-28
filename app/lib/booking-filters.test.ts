import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { byPickup, matchesSearch, matchesView, storedStatusesFor } from "./booking-filters.ts";
import { ASSUMED_TRIP_MS, STORED_STATUSES, type StoredStatus } from "./booking-status.ts";
import { VIEWS } from "./views.ts";

const NOW = new Date("2026-03-14T18:00:00Z");
const pickup = (offsetMs: number) => new Date(NOW.getTime() + offsetMs);
const booking = (status: StoredStatus, offsetMs: number) => ({ status, pickupAt: pickup(offsetMs) });

const MINUTE = 60 * 1000;

// Either side of every boundary, plus the far past and future.
const OFFSETS = [
  -ASSUMED_TRIP_MS * 100,
  -ASSUMED_TRIP_MS - 1,
  -ASSUMED_TRIP_MS,
  -ASSUMED_TRIP_MS + 1,
  -1,
  0,
  1,
  ASSUMED_TRIP_MS * 100,
];

describe("matchesView", () => {
  test("upcoming is scheduled with the pickup still ahead", () => {
    assert.equal(matchesView(booking("scheduled", MINUTE), "upcoming", NOW), true);
    assert.equal(matchesView(booking("scheduled", 0), "upcoming", NOW), false);
    assert.equal(matchesView(booking("completed", MINUTE), "upcoming", NOW), false);
    assert.equal(matchesView(booking("canceled", MINUTE), "upcoming", NOW), false);
  });

  test("in progress runs from the pickup until one assumed trip later", () => {
    assert.equal(matchesView(booking("scheduled", 0), "in_progress", NOW), true);
    assert.equal(matchesView(booking("scheduled", -ASSUMED_TRIP_MS + 1), "in_progress", NOW), true);
    assert.equal(matchesView(booking("scheduled", -ASSUMED_TRIP_MS), "in_progress", NOW), false);
    assert.equal(matchesView(booking("scheduled", 1), "in_progress", NOW), false);
  });

  test("completed includes finished trips the sweep hasn't stored yet", () => {
    assert.equal(matchesView(booking("completed", MINUTE), "completed", NOW), true);
    assert.equal(matchesView(booking("scheduled", -ASSUMED_TRIP_MS), "completed", NOW), true);
    assert.equal(matchesView(booking("scheduled", -ASSUMED_TRIP_MS + 1), "completed", NOW), false);
    assert.equal(matchesView(booking("canceled", -ASSUMED_TRIP_MS * 2), "completed", NOW), false);
  });

  test("canceled is only canceled", () => {
    assert.equal(matchesView(booking("canceled", MINUTE), "canceled", NOW), true);
    assert.equal(matchesView(booking("scheduled", MINUTE), "canceled", NOW), false);
  });

  test("all takes everything", () => {
    for (const status of STORED_STATUSES) {
      for (const offset of OFFSETS) {
        assert.equal(matchesView(booking(status, offset), "all", NOW), true);
      }
    }
  });

  test("every booking lands in exactly one view besides all", () => {
    for (const status of STORED_STATUSES) {
      for (const offset of OFFSETS) {
        const views = VIEWS.filter((v) => v !== "all" && matchesView(booking(status, offset), v, NOW));
        assert.equal(views.length, 1, `${status} at ${offset}: ${views.join(", ")}`);
      }
    }
  });
});

describe("storedStatusesFor", () => {
  test("asks Firestore for every stored status that can appear in the view", () => {
    for (const view of VIEWS) {
      const fetched = storedStatusesFor(view);
      for (const status of STORED_STATUSES) {
        for (const offset of OFFSETS) {
          if (!matchesView(booking(status, offset), view, NOW)) continue;
          assert.ok(
            fetched === null || fetched.includes(status),
            `${view} shows ${status} bookings but doesn't fetch them`,
          );
        }
      }
    }
  });
});

describe("matchesSearch", () => {
  const trip = {
    customerName: "Ada Pearson",
    phone: "416-555-0199",
    pickupLocation: "Pearson Airport, Terminal 1",
    dropoffLocation: "Royal York Hotel",
  };

  test("an empty or blank term matches everything", () => {
    assert.equal(matchesSearch(trip, ""), true);
    assert.equal(matchesSearch(trip, "   "), true);
  });

  test("matches a substring of any searchable field, ignoring case", () => {
    assert.equal(matchesSearch(trip, "ada"), true);
    assert.equal(matchesSearch(trip, "555"), true);
    assert.equal(matchesSearch(trip, "TERMINAL"), true);
    assert.equal(matchesSearch(trip, "royal york"), true);
  });

  test("trims the term", () => {
    assert.equal(matchesSearch(trip, "  pear  "), true);
  });

  test("misses when no field contains the term", () => {
    assert.equal(matchesSearch(trip, "union station"), false);
  });

  test("treats wildcard characters literally", () => {
    assert.equal(matchesSearch(trip, "%"), false);
    assert.equal(matchesSearch(trip, "_"), false);
  });
});

describe("byPickup", () => {
  const early = { pickupAt: pickup(0) };
  const late = { pickupAt: pickup(MINUTE) };

  test("soonest first", () => {
    assert.deepEqual([late, early].sort(byPickup(true)), [early, late]);
  });

  test("most recent first", () => {
    assert.deepEqual([early, late].sort(byPickup(false)), [late, early]);
  });
});
