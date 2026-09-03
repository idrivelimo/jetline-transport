"use client";

import { useState } from "react";

import type { Booking } from "@/app/lib/schema";
import { formatDateShort, formatMoney, sumMoney } from "@/app/lib/format";

/**
 * The draft invoice. Ticking a row adds it to the total on the last line, the
 * way an invoice actually reads — line items, a rule, then what's owed.
 *
 * Rows arrive pre-selected, so billing a whole date range is one action and
 * hand-picking is a matter of unticking what doesn't belong.
 */
export function InvoiceBuilder({
  bookings,
  includeCanceled,
}: {
  bookings: Booking[];
  includeCanceled: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(bookings.map((b) => b.id)),
  );

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const allSelected = selected.size === bookings.length && bookings.length > 0;
  const chosen = bookings.filter((b) => selected.has(b.id));
  const total = sumMoney(chosen.map((b) => b.price));

  return (
    <form action="/api/invoices" method="post">
      <input type="hidden" name="includeCanceled" value={String(includeCanceled)} />

      <div className="border border-rule bg-card">
        <div className="flex items-center gap-3 border-b border-rule px-5 py-2.5">
          <input
            id="select-all"
            type="checkbox"
            checked={allSelected}
            onChange={() =>
              setSelected(allSelected ? new Set() : new Set(bookings.map((b) => b.id)))
            }
            className="size-4 accent-brass"
          />
          <label htmlFor="select-all" className="text-[13px] text-slate">
            {allSelected ? "Everything is on this invoice" : "Put everything on this invoice"}
          </label>
        </div>

        <ul>
          {bookings.map((booking) => {
            const isOn = selected.has(booking.id);
            const canceled = booking.status === "canceled";
            return (
              <li key={booking.id} className="border-b border-rule last:border-b-0">
                <label className="flex cursor-pointer items-baseline gap-3 px-5 py-3 hover:bg-paper/40">
                  <input
                    type="checkbox"
                    name="bookingId"
                    value={booking.id}
                    checked={isOn}
                    onChange={() => toggle(booking.id)}
                    className="size-4 shrink-0 translate-y-0.5 accent-brass"
                  />

                  <span className="tabular w-24 shrink-0 text-[13px] text-slate">
                    {formatDateShort(booking.pickupDate)}
                  </span>

                  <span
                    className={`w-40 shrink-0 truncate text-sm ${
                      canceled ? "text-slate line-through" : "text-ink"
                    }`}
                  >
                    {booking.customerName}
                  </span>

                  <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">
                    {booking.pickupLocation} <span className="text-slate">to</span>{" "}
                    {booking.dropoffLocation}
                  </span>

                  <span className="w-20 shrink-0 text-[13px] text-slate">{booking.vehicle}</span>

                  <span
                    className={`tabular w-24 shrink-0 text-right text-sm ${
                      isOn ? "text-ink" : "text-slate/50"
                    }`}
                  >
                    {formatMoney(booking.price)}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        {/* The total sits in the price column, as the invoice's own last line. */}
        <div className="flex items-baseline gap-3 border-t-2 border-ink px-5 py-3.5">
          <span className="flex-1 text-sm text-slate">
            {chosen.length === 0
              ? "Nothing selected"
              : `${chosen.length} trip${chosen.length === 1 ? "" : "s"}`}
          </span>
          <span className="tabular w-24 shrink-0 text-right text-lg font-medium text-brass">
            {formatMoney(total)}
          </span>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-4">
        <button
          type="submit"
          disabled={chosen.length === 0}
          className="rounded-sm bg-brass px-4 py-2.5 text-[15px] font-medium text-card
                     transition-colors hover:bg-[#96722f] disabled:opacity-50"
        >
          Download invoice
        </button>
        {chosen.length === 0 && (
          <p className="text-sm text-slate">Tick the trips you want to bill.</p>
        )}
      </div>
    </form>
  );
}
