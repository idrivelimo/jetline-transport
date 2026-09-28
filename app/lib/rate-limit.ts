import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";

import { authAttemptsCollection, db } from "./db";

/**
 * Throttles the shared password.
 *
 * One password on a public URL is guessable, so failed attempts are counted per
 * IP and the lockout grows. The counter lives in the database because a Map in
 * module scope is per-instance, and serverless gives an attacker a fresh
 * instance for free.
 */

const FREE_ATTEMPTS = 5;
const FIRST_LOCK_SECONDS = 60;
const MAX_LOCK_SECONDS = 60 * 60;

/** Netlify sets x-nf-client-connection-ip; x-forwarded-for is the fallback. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return h.get("x-nf-client-connection-ip") ?? forwarded ?? "unknown";
}

/**
 * Keyed by a hash of the IP: the fallback header is client-supplied, and a raw
 * value could contain a "/" or anything else a document ID can't hold.
 */
function attemptRef(ip: string) {
  return authAttemptsCollection().doc(createHash("sha256").update(ip).digest("hex"));
}

export type Lock = { locked: true; until: Date } | { locked: false };

export async function checkLock(ip: string): Promise<Lock> {
  const lockedUntil = (await attemptRef(ip).get()).data()?.lockedUntil;

  if (lockedUntil && lockedUntil > new Date()) {
    return { locked: true, until: lockedUntil };
  }
  return { locked: false };
}

/**
 * Counts one failure and extends the lock. Done in a transaction so two
 * requests arriving together can't both read the old count and slip through:
 * Firestore reruns the loser against the winner's count.
 */
export async function recordFailure(ip: string): Promise<Lock> {
  const ref = attemptRef(ip);

  const lockedUntil = await db().runTransaction(async (tx) => {
    const previous = (await tx.get(ref)).data()?.attempts ?? 0;
    const attempts = previous + 1;

    const lockSeconds = Math.min(
      FIRST_LOCK_SECONDS * 2 ** (previous - FREE_ATTEMPTS),
      MAX_LOCK_SECONDS,
    );
    const until = attempts > FREE_ATTEMPTS ? new Date(Date.now() + lockSeconds * 1000) : null;

    tx.set(ref, { ip, attempts, lockedUntil: until, updatedAt: new Date() });
    return until;
  });

  return lockedUntil ? { locked: true, until: lockedUntil } : { locked: false };
}

/** A correct password wipes the slate. */
export async function clearAttempts(ip: string): Promise<void> {
  await attemptRef(ip).delete();
}
