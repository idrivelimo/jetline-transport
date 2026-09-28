---
name: verify
description: Confirm a Jetline feature actually works in the running app, not just that it compiles. Use after finishing any feature, before reporting it done.
---

# Verify

A green build proves the types line up. It does not prove a booking saves, a
status flips, or a signed-out visitor is kept out. Exercise the real thing.

## Order

1. `npm run typecheck` — fast, catches the obvious.
2. `npm test` — the pure logic, especially `app/lib/booking-status.ts`.
3. `npm run build` — catches server/client boundary mistakes that `tsc` misses.
4. Then everything below, against a running server.

Report what you actually ran and paste real output. If a step was skipped, say
so. Never describe a check you did not perform.

## Running the app

```bash
npm run dev          # http://localhost:3000
netlify dev          # use this instead when the scheduled function is involved
```

Start it in the background and wait for readiness rather than sleeping:

```bash
until grep -qE "Ready in|Error|EADDRINUSE" <dev-log>; do sleep 0.5; done
```

## Auth is the gate — check it every time

Every feature that touches booking data must be unreachable signed out. Checking
this needs no browser:

```bash
curl -s -o /dev/null -w "status=%{http_code} redirect=%{redirect_url}\n" http://localhost:3000/<route>
```

A page must answer `307` to `/login`; a Route Handler must answer `401`. Also
confirm the **response body carries no booking data** — a redirect status with a
rendered payload underneath is still a leak:

```bash
curl -s http://localhost:3000/<route> | head -c 300
```

To test the signed-in path without a browser, mint a cookie with the same secret
the app uses (`jose`, `HS256`, payload `{sub:"operator"}`, `SESSION_SECRET` from
`.env.local`) and send it as `Cookie: jetline_session=<token>`. Worth re-running
the negative cases after any change to `app/lib/session.ts` or `proxy.ts`:
a token signed with the wrong secret, one with a different `sub`, and an expired
one must each be rejected.

## Per-feature checks

Point the app at the dev Firebase project or the Firestore emulator, never at
production. The emulator needs Java 21+ and a `firebase.json`; start it with
`npx firebase-tools emulators:start --only firestore --project demo-jetline`,
then run the app with `FIRESTORE_EMULATOR_HOST=127.0.0.1:<port>` and
`FIREBASE_PROJECT_ID=demo-jetline`. Read documents back with a short
`firebase-admin` script using the same two variables.

**Bookings** — create one through the form and confirm the document in Firestore,
not just that the UI redirected. Edit it, cancel it, restore it, and delete it,
confirming the document each time.
Cancel must be reversible; delete must not.

**Status** — the derived label and the stored column are different things. Seed a
booking either side of each boundary (before pickup, mid-trip, past the trip
window) and confirm the run sheet's label. Then invoke the sweep and confirm the
stored `status` changed only for the rows that should change — never a canceled
one, never a manually completed one.

**Timezone** — enter a booking for an evening hour and confirm `pickupAt` in the
database is the correct UTC instant for the settings timezone, not the naive time.
This is the bug the column exists to prevent, so check it after any change to how
bookings are written.

**Invoices** — generate a PDF, open it, and read it. Confirm the letterhead
matches Settings, the line items match the selection, canceled bookings are
excluded unless opted in, and the total equals the line items summed by hand.

## Finishing

Say plainly what passed and what did not. A feature is done when it has been
exercised in the running app — not when it builds.
