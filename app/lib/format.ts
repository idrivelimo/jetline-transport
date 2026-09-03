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
 * Adds prices without ever making them floats. 0.1 + 0.2 is not 0.3, and an
 * invoice total that is a cent out is a real problem, so the arithmetic happens
 * in integer cents and comes back as a string.
 */
export function sumMoney(values: string[]): string {
  const cents = values.reduce((total, value) => {
    const [whole, fraction = "0"] = value.split(".");
    return total + Number(whole) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));
  }, 0);
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
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
