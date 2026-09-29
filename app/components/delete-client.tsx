"use client";

import { useState } from "react";

import { removeClient } from "@/app/clients/actions";

/** Two steps, like deleting a booking. Invoices already sent are unaffected. */
export function DeleteClient({ id, name }: { id: string; name: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm text-slate underline-offset-2 transition-colors hover:text-ink hover:underline"
      >
        Delete client
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <p className="text-sm text-ink">
        Delete {name}? Invoices you&rsquo;ve already downloaded are unaffected.
      </p>
      <form action={removeClient}>
        <input type="hidden" name="id" value={id} />
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
