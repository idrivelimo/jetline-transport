import { Fragment } from "react";
import Link from "next/link";

import type { Booking } from "@/app/lib/schema";
import { displayStatus, statusLabel, type DisplayStatus } from "@/app/lib/booking-status";
import {
  formatDate,
  formatMoney,
  formatPassengers,
  formatTime,
  relativeDayLabel,
} from "@/app/lib/format";
import { changeBookingStatus } from "@/app/bookings/actions";

/**
 * The run sheet: trips in time order under the day they run, separated by
 * hairlines rather than cut into cards. Brass appears only on a trip that is
 * happening right now.
 *
 * Grouping by day is what makes the order legible — a list spanning several
 * dates reads as random when every row shows only a clock time.
 */

function TimeGutter({ booking, live }: { booking: Booking; live: boolean }) {
  const { clock, meridiem } = formatTime(booking.pickupTime);

  return (
    <div
      className={`flex shrink-0 items-baseline gap-1.5 sm:w-16 sm:flex-col sm:items-end sm:gap-0
                  sm:border-r sm:pr-4 ${live ? "sm:border-brass" : "sm:border-rule"}`}
    >
      <span className={`tabular text-[15px] font-medium ${live ? "text-brass" : "text-ink"}`}>
        {clock}
      </span>
      <span className="text-xs text-slate">{meridiem}</span>
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

function BookingRow({ booking }: { booking: Booking }) {
  const status = displayStatus(booking.status, booking.pickupAt);
  const canceled = status === "canceled";
  const live = status === "in_progress";

  return (
    <li
      className={`border-t border-rule border-l-2 first:border-t-0 ${
        live ? "border-l-brass" : "border-l-transparent"
      }`}
    >
      <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:gap-5 sm:px-5 sm:py-4">
        <TimeGutter booking={booking} live={live} />

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

          <p className={`mt-0.5 text-sm ${canceled ? "text-slate" : "text-ink-soft"}`}>
            {booking.pickupLocation} <span className="text-slate">to</span>{" "}
            {booking.dropoffLocation}
          </p>

          <div className="mt-1 flex flex-wrap gap-x-6 gap-y-0.5 text-[13px] text-slate">
            <span>{booking.vehicle}</span>
            <span className="tabular">{formatPassengers(booking.passengers)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-start sm:gap-1.5">
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
      </div>
    </li>
  );
}

function DayHeading({ date, today }: { date: string; today: string }) {
  const relative = relativeDayLabel(date, today);

  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-rule bg-paper/60 px-4 py-2 sm:px-5">
      {relative ? (
        <>
          <span className="text-sm font-medium text-ink">{relative}</span>
          <span className="text-[13px] text-slate">{formatDate(date)}</span>
        </>
      ) : (
        <span className="text-sm font-medium text-ink">{formatDate(date)}</span>
      )}
    </div>
  );
}

/** Marks where the present sits among today's trips. */
function NowRule() {
  return (
    <li className="flex items-center gap-3 border-t border-rule border-l-2 border-l-brass px-4 py-1.5 sm:px-5">
      <span className="text-xs font-medium text-brass">Now</span>
      <span className="h-px flex-1 bg-brass/40" />
    </li>
  );
}

/** Consecutive runs of the same pickup date, in the order the rows arrived. */
function groupByDay(bookings: Booking[]): { date: string; rows: Booking[] }[] {
  const groups: { date: string; rows: Booking[] }[] = [];
  for (const booking of bookings) {
    const last = groups[groups.length - 1];
    if (last && last.date === booking.pickupDate) last.rows.push(booking);
    else groups.push({ date: booking.pickupDate, rows: [booking] });
  }
  return groups;
}

export function RunSheet({
  bookings,
  today,
  soonestFirst,
}: {
  bookings: Booking[];
  today: string;
  soonestFirst: boolean;
}) {
  const groups = groupByDay(bookings);

  return (
    <div className="overflow-hidden border border-rule bg-card">
      {groups.map((group) => {
        // Within today, the rule shows how much of the day is already behind.
        // The crossing point flips with the sort: reading forwards it is the
        // first trip still to come, reading backwards the first already run.
        const crossed = (b: Booking) =>
          soonestFirst ? b.pickupAt.getTime() > Date.now() : b.pickupAt.getTime() <= Date.now();
        const nowIndex = group.date === today ? group.rows.findIndex(crossed) : -1;

        // Nothing on the far side: the present sits after the last row.
        const ruleAtEnd = group.date === today && nowIndex === -1;

        return (
          <section key={group.date}>
            <DayHeading date={group.date} today={today} />
            <ol>
              {group.rows.map((booking, i) => (
                <Fragment key={booking.id}>
                  {i === nowIndex && <NowRule />}
                  <BookingRow booking={booking} />
                </Fragment>
              ))}
              {ruleAtEnd && <NowRule />}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
