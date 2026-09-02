import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, decrypt } from "@/app/lib/session";

/**
 * Optimistic sign-in check.
 *
 * This exists so a signed-out visitor lands on /login instead of watching a page
 * shell flash before its data check redirects them. It is deliberately not the
 * security boundary — that is `verifySession()` in app/lib/dal.ts, called inside
 * each page, Server Action and Route Handler. Per Next's docs, proxy runs on
 * prefetches too, so it only reads the cookie and never touches the database.
 */
export async function proxy(request: NextRequest) {
  const session = await decrypt(request.cookies.get(COOKIE_NAME)?.value);
  if (session) return NextResponse.next();

  const login = new URL("/login", request.url);

  // Send them back where they were headed once they sign in. Path only — an
  // attacker-supplied absolute URL here would be an open redirect.
  const intended = request.nextUrl.pathname + request.nextUrl.search;
  if (intended !== "/") login.searchParams.set("from", intended);

  const response = NextResponse.redirect(login);
  // A stale or tampered cookie should not survive the bounce.
  response.cookies.delete(COOKIE_NAME);
  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except: the login page, Next's own assets, and static files.
     * Route Handlers under /api are intentionally included — they gate
     * themselves with hasSession(), and this stops unauthenticated requests
     * one layer earlier.
     */
    "/((?!login|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
