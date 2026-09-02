import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { ASSUMED_TRIP_MS, displayStatus, shouldAutoComplete } from "./booking-status.ts";

const PICKUP = new Date("2026-03-14T18:00:00Z");
const at = (offsetMs: number) => new Date(PICKUP.getTime() + offsetMs);

const MINUTE = 60 * 1000;

describe("displayStatus", () => {
  test("a canceled booking stays canceled, whatever the clock says", () => {
    assert.equal(displayStatus("canceled", PICKUP, at(-MINUTE)), "canceled");
    assert.equal(displayStatus("canceled", PICKUP, at(ASSUMED_TRIP_MS * 10)), "canceled");
  });

  test("a manually completed booking stays completed, even before its pickup", () => {
    assert.equal(displayStatus("completed", PICKUP, at(-ASSUMED_TRIP_MS)), "completed");
  });

  test("scheduled and not yet due reads as upcoming", () => {
    assert.equal(displayStatus("scheduled", PICKUP, at(-MINUTE)), "upcoming");
  });

  describe("boundaries", () => {
    test("flips to in progress exactly at the pickup instant", () => {
      assert.equal(displayStatus("scheduled", PICKUP, at(-1)), "upcoming");
      assert.equal(displayStatus("scheduled", PICKUP, at(0)), "in_progress");
    });

    test("flips to completed exactly one assumed trip later", () => {
      assert.equal(displayStatus("scheduled", PICKUP, at(ASSUMED_TRIP_MS - 1)), "in_progress");
      assert.equal(displayStatus("scheduled", PICKUP, at(ASSUMED_TRIP_MS)), "completed");
    });
  });
});

describe("shouldAutoComplete", () => {
  test("sweeps a scheduled booking once its trip window has passed", () => {
    assert.equal(shouldAutoComplete("scheduled", PICKUP, at(ASSUMED_TRIP_MS)), true);
  });

  test("leaves a scheduled booking alone mid-trip", () => {
    assert.equal(shouldAutoComplete("scheduled", PICKUP, at(ASSUMED_TRIP_MS - MINUTE)), false);
  });

  test("never touches a canceled booking, however old", () => {
    assert.equal(shouldAutoComplete("canceled", PICKUP, at(ASSUMED_TRIP_MS * 100)), false);
  });

  test("never re-sweeps an already completed booking", () => {
    assert.equal(shouldAutoComplete("completed", PICKUP, at(ASSUMED_TRIP_MS * 100)), false);
  });
});

describe("timezone independence", () => {
  /**
   * The reason `pickup_at` exists. A 9pm pickup in Toronto (UTC-4 in March) is
   * 01:00 UTC the next day. Comparing the naive "21:00" against a UTC clock
   * would call this trip finished while the car is still on the road; comparing
   * instants gets it right regardless of where the server runs.
   */
  const torontoPickup9pm = new Date("2026-03-15T01:00:00Z");

  test("a 9pm Toronto pickup is still upcoming at 10pm UTC", () => {
    const now = new Date("2026-03-14T22:00:00Z");
    assert.equal(displayStatus("scheduled", torontoPickup9pm, now), "upcoming");
    assert.equal(shouldAutoComplete("scheduled", torontoPickup9pm, now), false);
  });

  test("the naive reading would have wrongly swept it", () => {
    // What a naive `date + time` comparison would have produced: 21:00 read as
    // UTC, four hours ahead of the real instant, already past the trip window.
    const naive = new Date("2026-03-14T21:00:00Z");
    const now = new Date("2026-03-15T00:30:00Z");
    assert.equal(shouldAutoComplete("scheduled", naive, now), true);
    assert.equal(shouldAutoComplete("scheduled", torontoPickup9pm, now), false);
  });
});
