import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import {
  getFirestore,
  Timestamp,
  type DocumentData,
  type Firestore,
  type FirestoreDataConverter,
  type PartialWithFieldValue,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";

import type { AuthAttempt, Booking, Client, Settings } from "./schema";

/**
 * The Firestore client, through the Admin SDK.
 *
 * Admin credentials bypass Firestore security rules, so the database itself
 * should deny all client access (production-mode rules do) and this server
 * code is the only way in.
 *
 * No `server-only` guard here: the hourly sweep imports this from the Netlify
 * Functions runtime, where that guard throws. Every Next module that uses it
 * carries the guard instead.
 */

function app(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const projectId = process.env.FIREBASE_PROJECT_ID;

  // The local emulator takes no credentials. firebase-admin reads
  // FIRESTORE_EMULATOR_HOST itself and routes every call there.
  if (process.env.FIRESTORE_EMULATOR_HOST) return initializeApp({ projectId });

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Env vars can't hold real newlines reliably, so the key is stored with
  // literal "\n" sequences and restored here.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "No database connection: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and " +
        "FIREBASE_PRIVATE_KEY must all be set. They come from a Firebase " +
        "service-account key; the README explains where to get one.",
    );
  }

  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

export function db(): Firestore {
  return getFirestore(app());
}

/** Timestamps come back as Firestore's own type; the app deals in Dates. */
function withDates(data: DocumentData): DocumentData {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      value instanceof Timestamp ? value.toDate() : value,
    ]),
  );
}

function converter<T extends object>(): FirestoreDataConverter<T> {
  return {
    toFirestore: (model: PartialWithFieldValue<T>) => model as DocumentData,
    fromFirestore: (snapshot: QueryDocumentSnapshot) => withDates(snapshot.data()) as T,
  };
}

function withIdConverter<T extends { id: string }>(): FirestoreDataConverter<T> {
  return {
    // The ID is the document's name, not a field, so the two can't disagree.
    toFirestore: (model: PartialWithFieldValue<T>) =>
      Object.fromEntries(Object.entries(model).filter(([key]) => key !== "id")),
    fromFirestore: (snapshot: QueryDocumentSnapshot) =>
      ({ ...withDates(snapshot.data()), id: snapshot.id }) as T,
  };
}

/**
 * IDs arrive from URLs and form fields. Anything but a UUID of the kind the app
 * mints is not a booking or client, and one containing a slash would address a
 * different document path entirely, so it never reaches Firestore.
 */
const APP_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function bookingsCollection() {
  return db().collection("bookings").withConverter(withIdConverter<Booking>());
}

export function bookingRef(id: string) {
  return APP_ID.test(id) ? bookingsCollection().doc(id) : null;
}

export function clientsCollection() {
  return db().collection("clients").withConverter(withIdConverter<Client>());
}

export function clientRef(id: string) {
  return APP_ID.test(id) ? clientsCollection().doc(id) : null;
}

export function settingsDoc() {
  return db().collection("settings").doc("company").withConverter(converter<Settings>());
}

export function authAttemptsCollection() {
  return db().collection("authAttempts").withConverter(converter<AuthAttempt>());
}

/** The gRPC status codes Firestore reports that callers act on. */
export const NOT_FOUND = 5;
export const ALREADY_EXISTS = 6;
export const FAILED_PRECONDITION = 9;

export function hasCode(error: unknown, ...codes: number[]): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "number" && codes.includes(code);
}
