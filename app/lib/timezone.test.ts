import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { zonedTimeToInstant } from "./timezone.ts";

const iso = (date: string, time: string, zone: string) =>
  zonedTimeToInstant(date, time, zone).toISOString();

describe("zonedTimeToInstant", () => {
  test("an evening pickup in summer lands on the next UTC day", () => {
    assert.equal(iso("2026-07-10", "21:00", "America/Toronto"), "2026-07-11T01:00:00.000Z");
  });

  test("winter uses standard time", () => {
    assert.equal(iso("2026-01-15", "09:30", "America/Toronto"), "2026-01-15T14:30:00.000Z");
  });

  test("seconds are optional and honoured", () => {
    assert.equal(iso("2026-01-15", "09:30:00", "America/Toronto"), "2026-01-15T14:30:00.000Z");
    assert.equal(iso("2026-01-15", "09:30:15", "America/Toronto"), "2026-01-15T14:30:15.000Z");
  });

  test("crosses a year boundary", () => {
    assert.equal(iso("2026-12-31", "23:30", "America/Toronto"), "2027-01-01T04:30:00.000Z");
  });

  test("handles zones with a half-hour offset", () => {
    assert.equal(iso("2026-03-14", "09:00", "Asia/Kolkata"), "2026-03-14T03:30:00.000Z");
  });

  test("UTC is the identity", () => {
    assert.equal(iso("2026-03-14", "18:00", "UTC"), "2026-03-14T18:00:00.000Z");
  });

  describe("spring forward (Toronto, 8 March 2026)", () => {
    test("either side of the gap resolves normally", () => {
      assert.equal(iso("2026-03-08", "01:59", "America/Toronto"), "2026-03-08T06:59:00.000Z");
      assert.equal(iso("2026-03-08", "03:00", "America/Toronto"), "2026-03-08T07:00:00.000Z");
    });

    test("a time inside the gap moves forward past it, as Postgres does", () => {
      assert.equal(iso("2026-03-08", "02:30", "America/Toronto"), "2026-03-08T07:30:00.000Z");
    });
  });

  describe("fall back (Toronto, 1 November 2026)", () => {
    test("a time that happens twice takes the later one, as Postgres does", () => {
      assert.equal(iso("2026-11-01", "01:30", "America/Toronto"), "2026-11-01T06:30:00.000Z");
    });

    test("either side of the overlap resolves normally", () => {
      assert.equal(iso("2026-11-01", "00:30", "America/Toronto"), "2026-11-01T04:30:00.000Z");
      assert.equal(iso("2026-11-01", "02:00", "America/Toronto"), "2026-11-01T07:00:00.000Z");
    });
  });

  describe("southern hemisphere (Sydney)", () => {
    test("the overlap in April takes the later reading", () => {
      assert.equal(iso("2026-04-05", "02:30", "Australia/Sydney"), "2026-04-04T16:30:00.000Z");
    });

    test("the gap in October moves forward past it", () => {
      assert.equal(iso("2026-10-04", "02:30", "Australia/Sydney"), "2026-10-03T16:30:00.000Z");
    });
  });
});
