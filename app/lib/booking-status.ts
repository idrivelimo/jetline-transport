/**
 * Booking status, in one place.
 *
 * A booking stores only three states. "In progress" is never stored — it is a
 * window in time, derived from `pickupAt`. The dashboard and the hourly sweep
 * both import from here so their idea of "finished" cannot drift apart.
 */

/** We don't collect a drop-off time, so we assume a trip runs this long. */
export const ASSUMED_TRIP_MS = 3 * 60 * 60 * 1000;

export const STORED_STATUSES = ["scheduled", "completed", "canceled"] as const;
export type StoredStatus = (typeof STORED_STATUSES)[number];

export const DISPLAY_STATUSES = [
  "upcoming",
  "in_progress",
  "completed",
  "canceled",
] as const;
export type DisplayStatus = (typeof DISPLAY_STATUSES)[number];

/**
 * What the operator should see for a booking right now.
 *
 * `pickupAt` is an absolute instant, so no timezone is needed here — the
 * conversion from the operator's local date/time happens once, at write time.
 */
export function displayStatus(
  stored: StoredStatus,
  pickupAt: Date,
  now: Date = new Date(),
): DisplayStatus {
  if (stored === "canceled") return "canceled";
  if (stored === "completed") return "completed";

  const sincePickup = now.getTime() - pickupAt.getTime();
  if (sincePickup < 0) return "upcoming";
  if (sincePickup < ASSUMED_TRIP_MS) return "in_progress";
  return "completed";
}

/**
 * Whether the sweep should persist `completed` for this booking.
 *
 * Deliberately the same boundary as the last branch of `displayStatus`: between
 * hourly runs the dashboard shows "Completed" and the database has not caught up
 * yet. Only `scheduled` rows qualify, which is why a manual "mark complete" on a
 * future booking is never undone and a canceled booking is never touched.
 */
export function shouldAutoComplete(
  stored: StoredStatus,
  pickupAt: Date,
  now: Date = new Date(),
): boolean {
  return stored === "scheduled" && displayStatus(stored, pickupAt, now) === "completed";
}

const LABELS: Record<DisplayStatus, string> = {
  upcoming: "Upcoming",
  in_progress: "In progress",
  completed: "Completed",
  canceled: "Canceled",
};

export function statusLabel(status: DisplayStatus): string {
  return LABELS[status];
}
