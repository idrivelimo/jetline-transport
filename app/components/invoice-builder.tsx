"use client";

import { useState } from "react";

import type { Booking } from "@/app/lib/schema";
import { formatDateShort, formatMoney } from "@/app/lib/format";
import { HST_LABEL, invoiceTotals } from "@/app/lib/tax";

/**
 * The draft invoice. Ticking a row adds it to the total on the last line, the
 * way an invoice actually reads — line items, a rule, then what's owed.
 *
 * Rows arrive pre-selected and taxed, so billing a whole date range with HST is
 * one action; hand-picking is a matter of unticking what doesn't belong.
 *
 * Two columns of checkboxes, each headed by its own "all" control: the left one
 * decides what is billed, the right one what carries HST.
 *
 * On a phone each line item stacks; from `sm` up the fields become columns.
 */
export function InvoiceBuilder({
  bookings,
  includeCanceled,
}: {
  bookings: Booking[];
  includeCanceled: boolean;
}) {
  const allIds = () => new Set(bookings.map((b) => b.id));
  const [selected, setSelected] = useState<Set<string>>(allIds);
  const [taxed, setTaxed] = useState<Set<string>>(allIds);

  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  const allSelected = selected.size === bookings.length && bookings.length > 0;
  const chosen = bookings.filter((b) => selected.has(b.id));
  // Only rows actually on the invoice count toward "everything is taxed".
  const allTaxed = chosen.length > 0 && chosen.every((b) => taxed.has(b.id));

  const totals = invoiceTotals(
    chosen.map((b) => ({ amount: b.price, taxable: taxed.has(b.id) })),
  );
  const hasTax = totals.tax !== "0.00";

  return (
    <form action="/api/invoices" method="post">
      <input type="hidden" name="includeCanceled" value={String(includeCanceled)} />

      <div className="border border-rule bg-card">
        <div className="flex items-center gap-3 border-b border-rule px-4 py-2.5 sm:px-5">
          <input
            id="select-all"
            type="checkbox"
            checked={allSelected}
            onChange={() => setSelected(allSelected ? new Set() : allIds())}
            className="size-4 shrink-0 accent-brass"
          />
          <label htmlFor="select-all" className="text-[13px] text-slate">
            {allSelected ? "Everything is on this invoice" : "Put everything on this invoice"}
          </label>

          <div className="ml-auto flex items-center gap-2">
            <label htmlFor="tax-all" className="text-[13px] text-slate">
              {HST_LABEL}
            </label>
            <input
              id="tax-all"
              type="checkbox"
              checked={allTaxed}
              disabled={chosen.length === 0}
              onChange={() =>
                setTaxed(allTaxed ? new Set() : new Set(chosen.map((b) => b.id)))
              }
              className="size-4 shrink-0 accent-brass disabled:opacity-40"
            />
          </div>
        </div>

        <ul>
          {bookings.map((booking) => {
            const isOn = selected.has(booking.id);
            const isTaxed = isOn && taxed.has(booking.id);
            const canceled = booking.status === "canceled";
            return (
              <li
                key={booking.id}
                className="flex items-start gap-3 border-b border-rule px-4 py-3 last:border-b-0 hover:bg-paper/40 sm:items-baseline sm:px-5"
              >
                {/* Selection: the label wraps the content so the row is clickable. */}
                <label className="flex min-w-0 flex-1 cursor-pointer gap-3 sm:items-baseline">
                  <input
                    type="checkbox"
                    name="bookingId"
                    value={booking.id}
                    checked={isOn}
                    onChange={() => setSelected((s) => toggle(s, booking.id))}
                    className="size-4 shrink-0 translate-y-1 accent-brass sm:translate-y-0.5"
                  />

                  <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
                    <span className="tabular text-[13px] text-slate sm:w-24 sm:shrink-0">
                      {formatDateShort(booking.pickupDate)}
                    </span>

                    <span
                      className={`text-sm sm:w-36 sm:shrink-0 sm:truncate ${
                        canceled ? "text-slate line-through" : "text-ink"
                      }`}
                    >
                      {booking.customerName}
                    </span>

                    <span className="text-sm text-ink-soft sm:min-w-0 sm:flex-1 sm:truncate">
                      {booking.pickupLocation} <span className="text-slate">to</span>{" "}
                      {booking.dropoffLocation}
                    </span>

                    {/* One line on a phone; two ordinary columns from sm up. */}
                    <span className="flex items-baseline justify-between gap-3 sm:contents">
                      <span className="text-[13px] text-slate sm:w-20 sm:shrink-0">
                        {booking.vehicle}
                      </span>
                      <span
                        className={`tabular text-sm sm:w-24 sm:shrink-0 sm:text-right ${
                          isOn ? "text-ink" : "text-slate/50"
                        }`}
                      >
                        {formatMoney(booking.price)}
                      </span>
                    </span>
                  </span>
                </label>

                {/* Outside the label above: nesting one label in another breaks both. */}
                <div className="flex shrink-0 items-center gap-1.5 pt-0.5 sm:w-16 sm:justify-end sm:pt-0">
                  <label
                    htmlFor={`tax-${booking.id}`}
                    className="text-[13px] text-slate sm:hidden"
                  >
                    HST
                  </label>
                  <input
                    id={`tax-${booking.id}`}
                    type="checkbox"
                    name="taxedId"
                    value={booking.id}
                    checked={isTaxed}
                    disabled={!isOn}
                    aria-label={`Charge HST on ${booking.customerName}'s trip`}
                    onChange={() => setTaxed((s) => toggle(s, booking.id))}
                    className="size-4 accent-brass disabled:opacity-30"
                  />
                </div>
              </li>
            );
          })}
        </ul>

        {/* Totals sit in the price column, as the invoice's own last lines. */}
        <div className="border-t-2 border-ink px-4 py-3.5 sm:px-5">
          {hasTax && (
            <>
              <div className="flex items-baseline gap-3 text-sm text-slate">
                <span className="flex-1">
                  {chosen.length === 1 ? "1 trip" : `${chosen.length} trips`}
                </span>
                <span className="tabular w-24 shrink-0 text-right">
                  {formatMoney(totals.subtotal)}
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-3 text-sm text-slate">
                <span className="flex-1">
                  {HST_LABEL}
                  {totals.mixed && " on some trips"}
                </span>
                <span className="tabular w-24 shrink-0 text-right">
                  {formatMoney(totals.tax)}
                </span>
              </div>
            </>
          )}

          <div className={`flex items-baseline gap-3 ${hasTax ? "mt-2.5 border-t border-rule pt-2.5" : ""}`}>
            <span className="flex-1 text-sm text-slate">
              {hasTax
                ? "Total"
                : chosen.length === 0
                  ? "Nothing selected"
                  : `${chosen.length} trip${chosen.length === 1 ? "" : "s"}`}
            </span>
            <span className="tabular w-24 shrink-0 text-right text-lg font-medium text-brass">
              {formatMoney(totals.total)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4">
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
