import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "jetline_session";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Read config at call time, not module load. A missing secret should fail the
 * request that needs it rather than crash the whole server on import — and it
 * keeps the failure visible in logs instead of a blank 500 at boot.
 */
function requireEnv(name: "APP_PASSWORD" | "SESSION_SECRET"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. The app cannot authenticate without it.`);
  return value;
}

function signingKey(): Uint8Array {
  return new TextEncoder().encode(requireEnv("SESSION_SECRET"));
}

/**
 * Compare in constant time so a network observer can't narrow the password down
 * one character at a time. Hashing first sidesteps `timingSafeEqual` throwing on
 * length-mismatched buffers — and the digest length itself leaks nothing.
 */
export function passwordMatches(candidate: string): boolean {
  const expected = createHash("sha256").update(requireEnv("APP_PASSWORD")).digest();
  const actual = createHash("sha256").update(candidate).digest();
  return timingSafeEqual(expected, actual);
}

export type SessionPayload = { sub: "operator"; expiresAt: number };

async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(signingKey());
}

/** Returns the payload for a valid, unexpired session, or null. Never throws. */
export async function decrypt(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, signingKey(), { algorithms: ["HS256"] });
    return payload.sub === "operator" ? (payload as unknown as SessionPayload) : null;
  } catch {
    // Tampered, expired, or signed with a rotated secret — all mean "no session".
    return null;
  }
}

export async function createSession(): Promise<void> {
  const expiresAt = Date.now() + SESSION_MAX_AGE_MS;
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, await encrypt({ sub: "operator", expiresAt }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(expiresAt),
    path: "/",
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

export async function readSession(): Promise<SessionPayload | null> {
  return decrypt((await cookies()).get(COOKIE_NAME)?.value);
}

export { COOKIE_NAME };
