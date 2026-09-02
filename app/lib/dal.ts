import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { readSession, type SessionPayload } from "./session";

/**
 * The authorization gate.
 *
 * `proxy.ts` redirects signed-out visitors, but that is a convenience, not the
 * boundary: proxy coverage depends on a matcher, and Next's own docs warn that
 * moving a route or editing the matcher can silently drop a page out of it.
 * So every page, Server Action and Route Handler that touches booking data
 * calls one of these first.
 *
 * `cache()` memoizes per render pass, so a page and the components inside it
 * share a single verification.
 */

/** For pages and Server Actions: sends signed-out visitors to /login. */
export const verifySession = cache(async (): Promise<SessionPayload> => {
  const session = await readSession();
  if (!session) redirect("/login");
  return session;
});

/**
 * For Route Handlers, which should answer 401 rather than redirect — a fetch
 * following a redirect to an HTML login page is a confusing failure mode.
 */
export const hasSession = cache(async (): Promise<boolean> => {
  return (await readSession()) !== null;
});

/** Standard 401 for Route Handlers, with no detail that would help a guesser. */
export function unauthorized(): Response {
  return new Response("Unauthorized", { status: 401 });
}
