import type { Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq, lt, sql } from "drizzle-orm";
import type { Pool } from "pg";

import { bookings } from "../../app/lib/schema";
import { ASSUMED_TRIP_MS } from "../../app/lib/booking-status";

/**
 * Marks finished trips complete, hourly.
 *
 * The dashboard already *shows* a trip as completed once its window has passed,
 * but that is computed at render time. This is what makes it true in the
 * database, so the status is right even if nobody opens the app for a week —
 * and so invoices bill off stored state rather than a derived guess.
 *
 * Runs in the Netlify Functions runtime, not Next, so it builds its own client
 * and imports only the modules with no `server-only` guard. The boundary comes
 * from ASSUMED_TRIP_MS, shared with displayStatus(), so the sweep and the run
 * sheet can never disagree about when a trip is over.
 */
export default async (req: Request) => {
  const connection = getDatabase();
  const db = drizzle(connection.pool as Pool, { schema: { bookings } });

  try {
    // Only 'scheduled' rows qualify. A booking marked complete by hand keeps
    // its completed_at, and a canceled booking is never revived.
    const swept = await db
      .update(bookings)
      .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(bookings.status, "scheduled"),
          lt(bookings.pickupAt, sql`now() - make_interval(secs => ${ASSUMED_TRIP_MS / 1000})`),
        ),
      )
      .returning({ id: bookings.id, customerName: bookings.customerName });

    const summary =
      swept.length === 0
        ? "No trips to close out."
        : `Closed out ${swept.length} trip${swept.length === 1 ? "" : "s"}: ${swept
            .map((b) => b.customerName)
            .join(", ")}`;

    console.log(summary);
    return Response.json({ swept: swept.length, ids: swept.map((b) => b.id) });
  } catch (error) {
    // Let the failure surface in the function log rather than passing silently;
    // a sweep that quietly stops would leave stale statuses with no signal.
    console.error("Sweep failed:", error);
    throw error;
  } finally {
    await connection.pool.end();
  }
};

export const config: Config = {
  schedule: "@hourly",
};
