import type { StoredStatus } from "./booking-status";

/**
 * The shape of each Firestore collection.
 *
 * Firestore enforces no schema, so these types are the schema: every write goes
 * through app/lib/db.ts and the modules built on it, and nothing else writes to
 * the database. There are no migrations. A field added later must be optional
 * on read (see the defaults in app/lib/settings.ts) because older documents
 * won't have it.
 *
 * Timestamps are stored as Firestore Timestamps and come back as Dates.
 */

/** `bookings/{id}`, where the ID is a UUID the app mints. */
export type Booking = {
  id: string;
  customerName: string;
  phone: string;
  email: string | null;

  // As the operator typed them, in company-local time: "YYYY-MM-DD" and
  // "HH:MM:SS". These are what the form shows and what the run sheet prints.
  // The date is also what invoices filter on, and sorts correctly as a string.
  pickupDate: string;
  pickupTime: string;

  // The same moment as an absolute instant, resolved through settings.timezone
  // at write time. Everything that compares against "now" reads this, never the
  // two fields above: comparing a naive local time against a UTC clock flips a
  // booking's status hours early or late.
  pickupAt: Date;

  pickupLocation: string;
  dropoffLocation: string;
  vehicle: string;
  passengers: number;

  // Money stays a string end to end: a float loses cents.
  price: string;

  notes: string | null;

  // 'in progress' is deliberately absent: it is a window in time, derived from
  // pickupAt, never stored. See app/lib/booking-status.ts.
  status: StoredStatus;
  completedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
};

/** `settings/company` — the one settings document, and the invoice letterhead. */
export type Settings = {
  companyName: string;
  phone: string;
  email: string;
  address: string;

  // IANA name. Interprets pickupDate + pickupTime into pickupAt, so it must be
  // right before the first booking is entered.
  timezone: string;

  // Printed on invoices so the customer can claim an input tax credit. Null
  // when the operator isn't registered for HST.
  hstNumber: string | null;
  updatedAt: Date;
};

/** `authAttempts/{sha256 of ip}` — throttles the shared password. */
export type AuthAttempt = {
  ip: string;
  attempts: number;
  lockedUntil: Date | null;
  updatedAt: Date;
};
