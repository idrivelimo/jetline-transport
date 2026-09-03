import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  addDays,
  formatDate,
  formatDateRange,
  formatDayMonth,
  formatMoney,
  formatTime,
  monthBounds,
  relativeDayLabel,
  sumMoney,
  todayInTimezone,
} from "./format.ts";

describe("sumMoney", () => {
  test("adds cents exactly where floats would drift", () => {
    // 0.1 + 0.2 === 0.30000000000000004 in floating point.
    assert.equal(sumMoney(["0.10", "0.20"]), "0.30");
  });

  test("carries cents into dollars", () => {
    assert.equal(sumMoney(["145.50", "220.75"]), "366.25");
  });

  test("handles a realistic invoice", () => {
    assert.equal(sumMoney(["145.00", "220.00", "480.50", "675.00"]), "1520.50");
  });

  test("an empty selection totals zero", () => {
    assert.equal(sumMoney([]), "0.00");
  });
});

describe("formatMoney", () => {
  test("groups thousands", () => {
    assert.equal(formatMoney("1520.50"), "$1,520.50");
    assert.equal(formatMoney("145.00"), "$145.00");
  });
});

describe("formatTime", () => {
  test("converts to 12-hour with meridiem", () => {
    assert.deepEqual(formatTime("21:00:00"), { clock: "9:00", meridiem: "pm" });
    assert.deepEqual(formatTime("00:30:00"), { clock: "12:30", meridiem: "am" });
    assert.deepEqual(formatTime("12:15:00"), { clock: "12:15", meridiem: "pm" });
  });
});

describe("formatDate", () => {
  test("reads the stored date without a timezone shift", () => {
    // new Date("2026-03-14") parses as UTC and can render as the 13th.
    assert.equal(formatDate("2026-03-14"), "Saturday, 14 March");
  });
});

describe("todayInTimezone", () => {
  test("returns a YYYY-MM-DD date", () => {
    assert.match(todayInTimezone("America/Toronto"), /^\d{4}-\d{2}-\d{2}$/);
  });

  test("zones on opposite sides of the dateline can disagree on the day", () => {
    const auckland = todayInTimezone("Pacific/Auckland");
    const honolulu = todayInTimezone("Pacific/Honolulu");
    assert.notEqual(auckland, honolulu);
  });
});

describe("monthBounds", () => {
  test("spans a 30-day month", () => {
    assert.deepEqual(monthBounds("2026-09-15"), { from: "2026-09-01", to: "2026-09-30" });
  });

  test("spans a 31-day month", () => {
    assert.deepEqual(monthBounds("2026-01-05"), { from: "2026-01-01", to: "2026-01-31" });
  });

  test("gets February right in a leap year", () => {
    assert.deepEqual(monthBounds("2028-02-10"), { from: "2028-02-01", to: "2028-02-29" });
  });
});

describe("addDays", () => {
  test("crosses a month boundary", () => {
    assert.equal(addDays("2026-09-30", 1), "2026-10-01");
    assert.equal(addDays("2026-10-01", -1), "2026-09-30");
  });

  test("crosses a year boundary", () => {
    assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  });

  test("handles a leap day", () => {
    assert.equal(addDays("2028-02-28", 1), "2028-02-29");
    assert.equal(addDays("2028-03-01", -1), "2028-02-29");
  });
});

describe("relativeDayLabel", () => {
  const today = "2026-09-03";
  test("names the days either side of today", () => {
    assert.equal(relativeDayLabel("2026-09-03", today), "Today");
    assert.equal(relativeDayLabel("2026-09-04", today), "Tomorrow");
    assert.equal(relativeDayLabel("2026-09-02", today), "Yesterday");
  });

  test("leaves anything further out to the date itself", () => {
    assert.equal(relativeDayLabel("2026-09-05", today), null);
    assert.equal(relativeDayLabel("2026-08-31", today), null);
  });
});

describe("formatDateRange", () => {
  test("collapses a range inside one month", () => {
    assert.equal(formatDateRange("2026-09-02", "2026-09-04"), "2 to 4 September 2026");
  });

  test("keeps both months when they differ", () => {
    assert.equal(formatDateRange("2026-08-28", "2026-09-03"), "28 August to 3 September 2026");
  });

  test("keeps both years when they differ", () => {
    assert.equal(formatDateRange("2025-12-28", "2026-01-03"), "28 December 2025 to 3 January 2026");
  });

  test("a single day is just that day", () => {
    assert.equal(formatDateRange("2026-09-02", "2026-09-02"), "2 September 2026");
  });
});

describe("formatDayMonth", () => {
  test("drops the year for a line item", () => {
    assert.equal(formatDayMonth("2026-09-02"), "2 Sep");
    assert.equal(formatDayMonth("2026-12-25"), "25 Dec");
  });
});
