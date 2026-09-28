import "server-only";

import { randomUUID } from "node:crypto";
import type { Query, UpdateData } from "firebase-admin/firestore";

import { bookingRef, bookingsCollection, hasCode, NOT_FOUND } from "./db";
import type { Booking } from "./schema";
import { byPickup, matchesSearch, matchesView, storedStatusesFor } from "./booking-filters";
import { verifySession } from "./dal";
import { getSettings } from "./settings";
import { zonedTimeToInstant } from "./timezone";
import type { BookingInput } from "./validation";
import { isSoonestFirst, type View } from "./views";

/**
 * Every read and write goes through verifySession() first. Proxy redirects
 * signed-out visitors, but this is the boundary that actually holds.
 */

/**
 * Firestore narrows by one field, so no composite index is needed. The view,
 * the search and the ordering are then applied in memory (booking-filters.ts).
 */
async function candidates(view: View, date: string): Promise<Booking[]> {
  let query: Query<Booking> = bookingsCollection();

  if (date) {
    // A single day holds a handful of trips, so it's the tighter filter.
    query = query.where("pickupDate", "==", date);
  } else {
    const statuses = storedStatusesFor(view);
    if (statuses) query = query.where("status", "in", statuses);
  }

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => doc.data());
}

export async function listBookings(
  view: View,
  search = "",
  date = "",
): Promise<Booking[]> {
  await verifySession();
  const now = new Date();
  const rows = await candidates(view, date);
  return rows
    .filter((b) => matchesView(b, view, now) && matchesSearch(b, search))
    .sort(byPickup(isSoonestFirst(view)));
}

export async function getBooking(id: string): Promise<Booking | null> {
  await verifySession();
  const snapshot = await bookingRef(id)?.get();
  return snapshot?.data() ?? null;
}

/**
 * The fields derived from what the operator typed. The instant is resolved
 * through the company timezone here, once; nothing downstream converts again.
 */
function fromInput(input: BookingInput, timezone: string) {
  // Always stored with seconds, so every document has one shape whichever form
  // the input took.
  const pickupTime = input.pickupTime.length === 5 ? `${input.pickupTime}:00` : input.pickupTime;
  return {
    ...input,
    pickupTime,
    pickupAt: zonedTimeToInstant(input.pickupDate, pickupTime, timezone),
  };
}

export async function createBooking(input: BookingInput): Promise<Booking> {
  await verifySession();
  const { timezone } = await getSettings();

  const now = new Date();
  const booking: Booking = {
    id: randomUUID(),
    ...fromInput(input, timezone),
    status: "scheduled",
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await bookingsCollection().doc(booking.id).create(booking);
  return booking;
}

/**
 * `update` refuses to create a document, so a booking deleted in another tab
 * stays deleted. The change is dropped rather than failing the page.
 */
async function patch(id: string, fields: UpdateData<Booking>): Promise<void> {
  const ref = bookingRef(id);
  if (!ref) return;
  try {
    await ref.update({ ...fields, updatedAt: new Date() });
  } catch (error) {
    if (!hasCode(error, NOT_FOUND)) throw error;
  }
}

export async function updateBooking(id: string, input: BookingInput): Promise<void> {
  await verifySession();
  const { timezone } = await getSettings();
  await patch(id, fromInput(input, timezone));
}

/** Soft — the document stays, so it can be restored and still appear on an invoice. */
export async function cancelBooking(id: string): Promise<void> {
  await verifySession();
  await patch(id, { status: "canceled" });
}

export async function restoreBooking(id: string): Promise<void> {
  await verifySession();
  await patch(id, { status: "scheduled", completedAt: null });
}

/** Manual override, allowed at any time — including before the pickup. */
export async function completeBooking(id: string): Promise<void> {
  await verifySession();
  await patch(id, { status: "completed", completedAt: new Date() });
}

/** Hard, permanent. The UI asks for confirmation before calling this. */
export async function deleteBooking(id: string): Promise<void> {
  await verifySession();
  await bookingRef(id)?.delete();
}
