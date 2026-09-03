import "server-only";

import { and, asc, gte, inArray, lte, ne, type SQL } from "drizzle-orm";

import { db } from "./db";
import { bookings, type Booking } from "./schema";
import { verifySession } from "./dal";

/**
 * Trips selected for billing.
 *
 * The date range filters on `pickup_date`, not `pickup_at`: an invoice covers
 * calendar days as the operator wrote them ("1–30 September"), not a window of
 * UTC instants that would clip the edges of those days.
 */

export type InvoiceQuery = {
  from?: string;
  to?: string;
  includeCanceled: boolean;
};

function rangeCondition({ from, to, includeCanceled }: InvoiceQuery): SQL | undefined {
  return and(
    from ? gte(bookings.pickupDate, from) : undefined,
    to ? lte(bookings.pickupDate, to) : undefined,
    // Canceled trips are off the bill unless asked for — you don't invoice a
    // trip that never ran.
    includeCanceled ? undefined : ne(bookings.status, "canceled"),
  );
}

export async function listForInvoice(query: InvoiceQuery): Promise<Booking[]> {
  await verifySession();
  return db()
    .select()
    .from(bookings)
    .where(rangeCondition(query))
    .orderBy(asc(bookings.pickupAt));
}

/**
 * The rows that actually go on the PDF. Re-read from the database rather than
 * trusting figures posted by the form, so the invoice bills what is on record.
 */
export async function getBookingsForInvoice(ids: string[]): Promise<Booking[]> {
  await verifySession();
  if (ids.length === 0) return [];
  return db()
    .select()
    .from(bookings)
    .where(inArray(bookings.id, ids))
    .orderBy(asc(bookings.pickupAt));
}
