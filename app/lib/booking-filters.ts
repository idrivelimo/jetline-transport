import { displayStatus, type StoredStatus } from "./booking-status.ts";
import type { View } from "./views.ts";
import type { Booking } from "./schema.ts";

/**
 * What the run sheet shows, as plain functions over bookings.
 *
 * Firestore can't express "in progress" (a time window relative to now), an OR
 * across fields, or a substring search, so it narrows by stored status and the
 * rest happens here. A view is defined as exactly the bookings displayStatus()
 * labels with it, so the list and the label can't disagree.
 */

/**
 * The stored statuses that can show up in a view: what to ask Firestore for.
 * Must cover every booking matchesView() accepts. Null means everything.
 *
 * "scheduled" stays small, because the hourly sweep moves finished trips out
 * of it, so reading all of it for the live views is cheap.
 */
export function storedStatusesFor(view: View): StoredStatus[] | null {
  switch (view) {
    case "upcoming":
    case "in_progress":
      return ["scheduled"];
    case "completed":
      // Includes scheduled trips the sweep hasn't reached yet.
      return ["scheduled", "completed"];
    case "canceled":
      return ["canceled"];
    case "all":
      return null;
  }
}

export function matchesView(
  booking: Pick<Booking, "status" | "pickupAt">,
  view: View,
  now: Date = new Date(),
): boolean {
  return view === "all" || displayStatus(booking.status, booking.pickupAt, now) === view;
}

type Searchable = Pick<Booking, "customerName" | "phone" | "pickupLocation" | "dropoffLocation">;

/** Case-insensitive substring match, so "555" and "pear" both find something. */
export function matchesSearch(booking: Searchable, term: string): boolean {
  const q = term.trim().toLowerCase();
  if (q === "") return true;
  return [booking.customerName, booking.phone, booking.pickupLocation, booking.dropoffLocation]
    .some((field) => field.toLowerCase().includes(q));
}

export function byPickup(soonestFirst: boolean) {
  return (a: Pick<Booking, "pickupAt">, b: Pick<Booking, "pickupAt">) =>
    soonestFirst
      ? a.pickupAt.getTime() - b.pickupAt.getTime()
      : b.pickupAt.getTime() - a.pickupAt.getTime();
}
