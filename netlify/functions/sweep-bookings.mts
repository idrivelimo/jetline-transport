import type { Config } from "@netlify/functions";

import { bookingsCollection, FAILED_PRECONDITION, hasCode, NOT_FOUND } from "../../app/lib/db";
import { shouldAutoComplete } from "../../app/lib/booking-status";

/**
 * Marks finished trips complete, hourly.
 *
 * The dashboard already *shows* a trip as completed once its window has passed,
 * but that is computed at render time. This is what makes it true in the
 * database, so the status is right even if nobody opens the app for a week —
 * and so invoices bill off stored state rather than a derived guess.
 *
 * Runs in the Netlify Functions runtime, not Next, so it imports only the
 * modules with no `server-only` guard. The boundary comes from
 * shouldAutoComplete(), which shares displayStatus()'s rule, so the sweep and
 * the run sheet can never disagree about when a trip is over.
 */
export default async () => {
  try {
    const now = new Date();

    // Only 'scheduled' bookings qualify. A booking marked complete by hand keeps
    // its completedAt, and a canceled booking is never revived.
    const scheduled = await bookingsCollection().where("status", "==", "scheduled").get();
    const due = scheduled.docs.filter((doc) => {
      const { status, pickupAt } = doc.data();
      return shouldAutoComplete(status, pickupAt, now);
    });

    // Each write only lands if the booking is unchanged since it was read, so
    // one canceled or edited in the meantime is left alone. It's reconsidered
    // next hour.
    const results = await Promise.allSettled(
      due.map((doc) =>
        doc.ref.update(
          { status: "completed", completedAt: now, updatedAt: now },
          { lastUpdateTime: doc.updateTime },
        ),
      ),
    );

    const failure = results.find(
      (r): r is PromiseRejectedResult =>
        r.status === "rejected" && !hasCode(r.reason, FAILED_PRECONDITION, NOT_FOUND),
    );
    if (failure) throw failure.reason;

    const swept = due
      .filter((_, i) => results[i].status === "fulfilled")
      .map((doc) => doc.data());

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
  }
};

export const config: Config = {
  schedule: "@hourly",
};
