import { Fragment } from "react";
import Link from "next/link";

import type { Booking } from "@/app/lib/schema";
import { displayStatus, statusLabel, type DisplayStatus } from "@/app/lib/booking-status";
import { formatDateShort, formatMoney, formatPassengers, formatTime } from "@/app/lib/format";
import { changeBookingStatus } from "@/app/bookings/actions";
import type { View } from "@/app/lib/views";

/**
 * The run sheet: trips in time order, separated by hairlines rather than cut
 * into cards. Brass appears only on a trip that is happening right now.
 */

function TimeGutter({ booking, status }: { booking: Booking; status: DisplayStatus }) {
  const { clock, meridiem } = formatTime(booking.pickupTime);
  const live = status === "in_progress";

  return (
    <div
      className={`w-16 shrink-0 border-r pr-4 text-right ${
        live ? "border-brass" : "border-rule"
      }`}
    >
      <div className={`tabular text-[15px] font-medium ${live ? "text-brass" : "text-ink"}`}>
        {clock}
      </div>
      <div className="text-xs text-slate">{meridiem}</div>
    </div>
  );
}

function StatusMark({ status }: { status: DisplayStatus }) {
  if (status === "in_progress") {
    return (
      <span className="rounded-sm bg-brass px-1.5 py-0.5 text-xs font-medium text-card">
        {statusLabel(status)}
      </span>
    );
  }
  if (status === "upcoming") return null; // The default state needs no badge.
  return <span className="text-xs text-slate">{statusLabel(status)}</span>;
}

function RowAction({ id, intent, children }: { id: string; intent: string; children: string }) {
  return (
    <form action={changeBookingStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="intent" value={intent} />
      <button
        type="submit"
        className="text-xs text-slate underline-offset-2 transition-colors hover:text-ink hover:underline"
      >
        {children}
      </button>
    </form>
  );
}

function BookingRow({ booking, showDate }: { booking: Booking; showDate: boolean }) {
  const status = displayStatus(booking.status, booking.pickupAt);
  const canceled = status === "canceled";

  return (
    <li
      className={`flex gap-x-5 border-t border-rule px-5 py-4 first:border-t-0 ${
        status === "in_progress" ? "border-l-2 border-l-brass" : "border-l-2 border-l-transparent"
      }`}
    >
      <TimeGutter booking={booking} status={status} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <Link
            href={`/bookings/${booking.id}/edit`}
            className={`text-[15px] font-medium underline-offset-2 hover:underline ${
              canceled ? "text-slate line-through" : "text-ink"
            }`}
          >
            {booking.customerName}
          </Link>
          <StatusMark status={status} />
        </div>

        <p className={`mt-0.5 truncate text-sm ${canceled ? "text-slate" : "text-ink-soft"}`}>
          {booking.pickupLocation} <span className="text-slate">to</span> {booking.dropoffLocation}
        </p>

        <div className="mt-1 flex flex-wrap gap-x-6 gap-y-0.5 text-[13px] text-slate">
          {showDate && <span className="tabular">{formatDateShort(booking.pickupDate)}</span>}
          <span>{booking.vehicle}</span>
          <span className="tabular">{formatPassengers(booking.passengers)}</span>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <div className={`tabular text-[15px] ${canceled ? "text-slate" : "text-ink"}`}>
          {formatMoney(booking.price)}
        </div>
        <div className="flex gap-x-3">
          {booking.status === "canceled" ? (
            <RowAction id={booking.id} intent="restore">Restore</RowAction>
          ) : (
            <>
              {booking.status !== "completed" && (
                <RowAction id={booking.id} intent="complete">Mark complete</RowAction>
              )}
              <RowAction id={booking.id} intent="cancel">Cancel</RowAction>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

/** Marks where the present sits between trips still to come and trips already run. */
function NowRule() {
  return (
    <li className="flex items-center gap-3 border-t border-rule bg-paper/50 px-5 py-1.5">
      <span className="text-xs font-medium text-brass">Now</span>
      <span className="h-px flex-1 bg-brass/40" />
    </li>
  );
}

export function RunSheet({ bookings, view }: { bookings: Booking[]; view: View }) {
  // Only the archive spans past and future, so that's the only place the rule
  // marks a real boundary.
  const nowIndex =
    view === "all" ? bookings.findIndex((b) => b.pickupAt.getTime() < Date.now()) : -1;

  const showDate = view !== "upcoming" && view !== "in_progress";

  return (
    <ol className="overflow-hidden border border-rule bg-card">
      {bookings.map((booking, i) => (
        <Fragment key={booking.id}>
          {i === nowIndex && <NowRule />}
          <BookingRow booking={booking} showDate={showDate} />
        </Fragment>
      ))}
    </ol>
  );
}
