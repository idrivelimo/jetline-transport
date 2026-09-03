"use client";

import { useState } from "react";

import { changeBookingStatus } from "@/app/bookings/actions";

/**
 * Two steps, because this one can't be undone. Cancelling a trip is the
 * reversible option and stays a single click on the run sheet.
 */
export function DeleteBooking({ id, customerName }: { id: string; customerName: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm text-slate underline-offset-2 transition-colors hover:text-ink hover:underline"
      >
        Delete permanently
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <p className="text-sm text-ink">
        Delete {customerName}&rsquo;s booking for good? Cancelling keeps the record.
      </p>
      <form action={changeBookingStatus} className="flex items-center gap-3">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="intent" value="delete" />
        <button
          type="submit"
          className="rounded-sm border border-ink px-3 py-1.5 text-sm font-medium text-ink
                     transition-colors hover:bg-ink hover:text-card"
        >
          Delete
        </button>
      </form>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-sm text-slate underline-offset-2 hover:text-ink hover:underline"
      >
        Keep it
      </button>
    </div>
  );
}
