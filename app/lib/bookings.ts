import "server-only";

import { and, asc, desc, eq, gt, ilike, lte, or, sql, type SQL } from "drizzle-orm";

import { db } from "./db";
import { bookings, type Booking } from "./schema";
import { ASSUMED_TRIP_MS } from "./booking-status";
import { verifySession } from "./dal";
import { getSettings } from "./settings";
import type { BookingInput } from "./validation";
import { isSoonestFirst, type View } from "./views";

/**
 * Every read and write goes through verifySession() first. Proxy redirects
 * signed-out visitors, but this is the boundary that actually holds.
 */

const TRIP_SECONDS = ASSUMED_TRIP_MS / 1000;

/** The end of a booking's assumed trip window, in SQL. */
const tripEnd = sql`now() - make_interval(secs => ${TRIP_SECONDS})`;

/**
 * The filters mirror displayStatus() exactly, sharing ASSUMED_TRIP_MS so the
 * list and the label can't disagree about when a trip is over.
 */
function viewCondition(view: View): SQL | undefined {
  switch (view) {
    case "upcoming":
      return and(eq(bookings.status, "scheduled"), gt(bookings.pickupAt, sql`now()`));
    case "in_progress":
      return and(
        eq(bookings.status, "scheduled"),
        lte(bookings.pickupAt, sql`now()`),
        gt(bookings.pickupAt, tripEnd),
      );
    case "completed":
      return or(
        eq(bookings.status, "completed"),
        and(eq(bookings.status, "scheduled"), lte(bookings.pickupAt, tripEnd)),
      );
    case "canceled":
      return eq(bookings.status, "canceled");
    case "all":
      return undefined;
  }
}

/**
 * Substring match, so "555" and "pear" both find something. The full-text index
 * on the table is available if the row count ever makes this too slow.
 */
function searchCondition(term: string): SQL | undefined {
  const q = `%${term.trim()}%`;
  if (term.trim() === "") return undefined;
  return or(
    ilike(bookings.customerName, q),
    ilike(bookings.phone, q),
    ilike(bookings.pickupLocation, q),
    ilike(bookings.dropoffLocation, q),
  );
}

function ordering(view: View) {
  return isSoonestFirst(view) ? asc(bookings.pickupAt) : desc(bookings.pickupAt);
}

/** Narrows to a single calendar day, as the operator wrote it. */
function dayCondition(date: string): SQL | undefined {
  return date ? eq(bookings.pickupDate, date) : undefined;
}

export async function listBookings(
  view: View,
  search = "",
  date = "",
): Promise<Booking[]> {
  await verifySession();
  const where = and(viewCondition(view), searchCondition(search), dayCondition(date));
  return db().select().from(bookings).where(where).orderBy(ordering(view));
}

export async function getBooking(id: string): Promise<Booking | null> {
  await verifySession();
  const [row] = await db().select().from(bookings).where(eq(bookings.id, id));
  return row ?? null;
}

/**
 * Resolves the operator's local date and time into an absolute instant using
 * the company timezone. Postgres owns this conversion because it carries the
 * IANA database, so daylight saving is handled without a JS date library.
 */
function pickupInstant(input: BookingInput, timezone: string): SQL {
  return sql`(${input.pickupDate}::date + ${input.pickupTime}::time) at time zone ${timezone}`;
}

export async function createBooking(input: BookingInput): Promise<Booking> {
  await verifySession();
  const { timezone } = await getSettings();

  const [row] = await db()
    .insert(bookings)
    .values({ ...input, pickupAt: pickupInstant(input, timezone) })
    .returning();
  return row;
}

export async function updateBooking(id: string, input: BookingInput): Promise<void> {
  await verifySession();
  const { timezone } = await getSettings();

  await db()
    .update(bookings)
    .set({ ...input, pickupAt: pickupInstant(input, timezone), updatedAt: new Date() })
    .where(eq(bookings.id, id));
}

/** Soft — the row stays, so it can be restored and still appear on an invoice. */
export async function cancelBooking(id: string): Promise<void> {
  await verifySession();
  await db()
    .update(bookings)
    .set({ status: "canceled", updatedAt: new Date() })
    .where(eq(bookings.id, id));
}

export async function restoreBooking(id: string): Promise<void> {
  await verifySession();
  await db()
    .update(bookings)
    .set({ status: "scheduled", completedAt: null, updatedAt: new Date() })
    .where(eq(bookings.id, id));
}

/** Manual override, allowed at any time — including before the pickup. */
export async function completeBooking(id: string): Promise<void> {
  await verifySession();
  await db()
    .update(bookings)
    .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
    .where(eq(bookings.id, id));
}

/** Hard, permanent. The UI asks for confirmation before calling this. */
export async function deleteBooking(id: string): Promise<void> {
  await verifySession();
  await db().delete(bookings).where(eq(bookings.id, id));
}
