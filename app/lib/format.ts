/**
 * Display helpers.
 *
 * These read `pickup_date` and `pickup_time` as the strings the operator typed,
 * never via `new Date(...)`. Parsing "2026-03-14" with the Date constructor
 * treats it as UTC and can show the day before — the conversion to an instant
 * already happened once, in `pickup_at`, and must not happen again here.
 */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export type ClockTime = { clock: string; meridiem: "am" | "pm" };

/** "21:00:00" -> { clock: "9:00", meridiem: "pm" } */
export function formatTime(time: string): ClockTime {
  const [rawHour, minute] = time.split(":");
  const hour24 = Number(rawHour);
  const meridiem = hour24 < 12 ? "am" : "pm";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { clock: `${hour12}:${minute}`, meridiem };
}

/** "2026-03-14" -> "Saturday, 14 March" */
export function formatDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday}, ${d} ${MONTHS[m - 1]}`;
}

/** "2026-03-14" -> "14 Mar 2026", for dense archive rows. */
export function formatDateShort(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${d} ${MONTHS[m - 1].slice(0, 3)} ${y}`;
}

/** "145.00" -> "$145.00". The value is already a string; keep it that way. */
export function formatMoney(amount: string): string {
  const [whole, cents = "00"] = amount.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `$${grouped}.${cents.padEnd(2, "0")}`;
}

export function formatPassengers(count: number): string {
  return `${count} passenger${count === 1 ? "" : "s"}`;
}

/**
 * Money is handled as integer cents throughout. 0.1 + 0.2 is not 0.3 in
 * floating point, and an invoice total that is a cent out is a real problem.
 */
export function toCents(amount: string): number {
  const [whole, fraction = "0"] = amount.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));
}

export function fromCents(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

export function sumMoney(values: string[]): string {
  return fromCents(values.reduce((total, value) => total + toCents(value), 0));
}

/**
 * Today's calendar date where the company operates, as YYYY-MM-DD.
 *
 * The server runs in UTC on Netlify, so `new Date().getFullYear()` and friends
 * would give the operator the wrong day for several hours each evening. The
 * company timezone is the only one that matters for "today".
 */
export function todayInTimezone(timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** First and last calendar day of the month containing `date` (YYYY-MM-DD). */
export function monthBounds(date: string): { from: string; to: string } {
  const [y, m] = date.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, "0");
  return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(lastDay).padStart(2, "0")}` };
}

/** Shifts a YYYY-MM-DD date by whole days, staying in calendar-date space. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + days));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(
    shifted.getUTCDate(),
  ).padStart(2, "0")}`;
}

/**
 * "Today" / "Tomorrow" / "Yesterday" where it helps a dispatcher orient, and
 * null everywhere else so the date itself does the work.
 */
export function relativeDayLabel(date: string, today: string): string | null {
  if (date === today) return "Today";
  if (date === addDays(today, 1)) return "Tomorrow";
  if (date === addDays(today, -1)) return "Yesterday";
  return null;
}

/** "2026-09-02" -> "2 Sep". The year belongs in the period line, not every row. */
export function formatDayMonth(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return `${d} ${MONTHS[m - 1].slice(0, 3)}`;
}

/**
 * The span an invoice covers, said the way a person would: "2 to 4 September
 * 2026", not two full dates joined by a dash. Collapses whatever the two ends
 * share.
 */
export function formatDateRange(from: string, to: string): string {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);

  if (from === to) return `${fd} ${MONTHS[fm - 1]} ${fy}`;
  if (fy === ty && fm === tm) return `${fd} to ${td} ${MONTHS[tm - 1]} ${ty}`;
  if (fy === ty) return `${fd} ${MONTHS[fm - 1]} to ${td} ${MONTHS[tm - 1]} ${ty}`;
  return `${fd} ${MONTHS[fm - 1]} ${fy} to ${td} ${MONTHS[tm - 1]} ${ty}`;
}
