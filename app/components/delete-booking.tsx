"use client";

import { useState } from "react";

import { changeBookingStatus } from "@/app/bookings/actions";

/**
 * Two steps, because this one can't be undone. Cancelling a trip is the
 * reversible option and stays a single click on the run sheet.
 *
 * `compact` is the run-sheet row version: same flow, sized to sit beside the
 * other row actions. `returnTo` is where to land afterwards, for pages that
 * show only this booking and would otherwise be left pointing at nothing.
 */
export function DeleteBooking({
  id,
  customerName,
  compact = false,
  returnTo,
}: {
  id: string;
  customerName: string;
  compact?: boolean;
  returnTo?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const text = compact ? "text-xs" : "text-sm";

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={`${text} text-slate underline-offset-2 transition-colors hover:text-ink hover:underline`}
      >
        {compact ? "Delete" : "Delete permanently"}
      </button>
    );
  }

  return (
    <div className={`flex flex-wrap items-center ${compact ? "justify-end gap-3" : "gap-4"}`}>
      <p className={`${text} text-ink`}>
        {compact ? (
          "Delete for good?"
        ) : (
          <>Delete {customerName}&rsquo;s booking for good? Cancelling keeps the record.</>
        )}
      </p>
      <form action={changeBookingStatus} className="flex items-center gap-3">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="intent" value="delete" />
        {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
        <button
          type="submit"
          aria-label={`Delete ${customerName}'s booking`}
          className={`rounded-sm border border-ink font-medium text-ink transition-colors
                     hover:bg-ink hover:text-card ${compact ? "px-2 py-0.5 text-xs" : "px-3 py-1.5 text-sm"}`}
        >
          Delete
        </button>
      </form>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className={`${text} text-slate underline-offset-2 hover:text-ink hover:underline`}
      >
        Keep it
      </button>
    </div>
  );
}
