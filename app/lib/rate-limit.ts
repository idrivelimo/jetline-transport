import "server-only";

import { headers } from "next/headers";
import { eq, sql } from "drizzle-orm";

import { db } from "./db";
import { authAttempts } from "./schema";

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

export type Lock = { locked: true; until: Date } | { locked: false };

export async function checkLock(ip: string): Promise<Lock> {
  const [row] = await db()
    .select({ lockedUntil: authAttempts.lockedUntil })
    .from(authAttempts)
    .where(eq(authAttempts.ip, ip));

  if (row?.lockedUntil && row.lockedUntil > new Date()) {
    return { locked: true, until: row.lockedUntil };
  }
  return { locked: false };
}

/**
 * Counts one failure and extends the lock. Done in a single upsert so two
 * requests arriving together can't both read the old count and slip through.
 */
export async function recordFailure(ip: string): Promise<Lock> {
  const [row] = await db()
    .execute(
      sql`
        insert into auth_attempts (ip, attempts, locked_until, updated_at)
        values (${ip}, 1, null, now())
        on conflict (ip) do update set
          attempts = auth_attempts.attempts + 1,
          locked_until = case
            when auth_attempts.attempts + 1 > ${FREE_ATTEMPTS}
            then now() + make_interval(secs => least(
                   ${FIRST_LOCK_SECONDS} * power(2, auth_attempts.attempts - ${FREE_ATTEMPTS}),
                   ${MAX_LOCK_SECONDS}))
            else null
          end,
          updated_at = now()
        returning locked_until
      `,
    )
    .then((r) => r.rows as { locked_until: Date | null }[]);

  return row?.locked_until ? { locked: true, until: row.locked_until } : { locked: false };
}

/** A correct password wipes the slate. */
export async function clearAttempts(ip: string): Promise<void> {
  await db().delete(authAttempts).where(eq(authAttempts.ip, ip));
}
