/**
 * Turning the operator's wall-clock time into an absolute instant.
 *
 * The runtime's Intl carries the IANA database, so daylight saving is handled
 * without a date library. This takes over what Postgres used to do with
 * `(date + time) at time zone tz`, including its answer at the two moments a
 * year when wall-clock time is not a one-to-one mapping.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How far `timeZone` is ahead of UTC at `instant`, in milliseconds. `instant`
 * must be a whole second, since the formatted parts stop at seconds.
 */
function offsetAt(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const wallClockAsUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return wallClockAsUtc - instant;
}

/**
 * "2026-03-14" + "21:00" in "America/Toronto" -> 2026-03-15T01:00:00Z.
 *
 * The offsets a day either side bracket any transition. Where they differ:
 * - in a spring-forward gap (02:30 on the night the clocks jump), neither
 *   reading is real, so the pre-transition offset applies, landing at 03:30;
 * - in a fall-back overlap (01:30 happens twice), both are real, and the
 *   later one wins.
 * Both match Postgres.
 */
export function zonedTimeToInstant(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm, ss = 0] = time.split(":").map(Number);
  const wallClockAsUtc = Date.UTC(y, m - 1, d, hh, mm, ss);

  const before = offsetAt(wallClockAsUtc - DAY_MS, timeZone);
  const after = offsetAt(wallClockAsUtc + DAY_MS, timeZone);

  const valid = [wallClockAsUtc - before, wallClockAsUtc - after].filter(
    (candidate, i) => offsetAt(candidate, timeZone) === (i === 0 ? before : after),
  );

  return new Date(valid.length > 0 ? Math.max(...valid) : wallClockAsUtc - before);
}
