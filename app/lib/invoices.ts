import "server-only";

import type { DocumentSnapshot, Query } from "firebase-admin/firestore";

import { bookingRef, bookingsCollection, db } from "./db";
import type { Booking } from "./schema";
import { byPickup } from "./booking-filters";
import { verifySession } from "./dal";

/**
 * Trips selected for billing.
 *
 * The date range filters on `pickupDate`, not `pickupAt`: an invoice covers
 * calendar days as the operator wrote them ("1–30 September"), not a window of
 * UTC instants that would clip the edges of those days. "YYYY-MM-DD" sorts as
 * a string, so Firestore can range over it directly.
 */

export type InvoiceQuery = {
  from?: string;
  to?: string;
  includeCanceled: boolean;
};

export async function listForInvoice({
  from,
  to,
  includeCanceled,
}: InvoiceQuery): Promise<Booking[]> {
  await verifySession();

  let query: Query<Booking> = bookingsCollection();
  if (from) query = query.where("pickupDate", ">=", from);
  if (to) query = query.where("pickupDate", "<=", to);

  const snapshot = await query.get();
  return (
    snapshot.docs
      .map((doc) => doc.data())
      // Canceled trips are off the bill unless asked for — you don't invoice a
      // trip that never ran.
      .filter((b) => includeCanceled || b.status !== "canceled")
      .sort(byPickup(true))
  );
}

/**
 * The rows that actually go on the PDF. Re-read from the database rather than
 * trusting figures posted by the form, so the invoice bills what is on record.
 */
export async function getBookingsForInvoice(ids: string[]): Promise<Booking[]> {
  await verifySession();

  // A repeated ID would otherwise come back once per mention and bill twice.
  const refs = [...new Set(ids)]
    .map(bookingRef)
    .filter((ref) => ref !== null);
  if (refs.length === 0) return [];

  // getAll's typings drop the references' converter, but it applies them.
  const snapshots = (await db().getAll(...refs)) as DocumentSnapshot<Booking>[];
  return snapshots
    .map((snapshot) => snapshot.data())
    .filter((b) => b !== undefined)
    .sort(byPickup(true));
}
