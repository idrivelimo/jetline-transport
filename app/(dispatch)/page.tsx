import Link from "next/link";

import { listBookings } from "@/app/lib/bookings";
import { DEFAULT_VIEW, isView, type View } from "@/app/lib/views";
import { formatDate, formatTime, todayInTimezone } from "@/app/lib/format";
import { getSettings } from "@/app/lib/settings";
import { RunSheet } from "@/app/components/run-sheet";
import type { Booking } from "@/app/lib/schema";

/** One line of running text under the date — no stat tiles. */
function summary(view: View, rows: Booking[]): string {
  const n = rows.length;
  const trips = `${n} trip${n === 1 ? "" : "s"}`;

  switch (view) {
    case "upcoming": {
      if (n === 0) return "Nothing booked ahead";
      const { clock, meridiem } = formatTime(rows[0].pickupTime);
      return `${trips} ahead, next at ${clock} ${meridiem}`;
    }
    case "in_progress":
      return n === 0 ? "Nothing on the road" : `${trips} on the road`;
    case "completed":
      return `${trips} completed`;
    case "canceled":
      return `${n} canceled`;
    case "all":
      return `${n} booking${n === 1 ? "" : "s"} on record`;
  }
}

function emptyMessage(view: View, search: string): string {
  if (search) return `Nothing matches “${search}”.`;
  switch (view) {
    case "upcoming":
      return "No trips booked ahead. Add the first one.";
    case "in_progress":
      return "No trip is on the road right now.";
    case "completed":
      return "No trips completed yet.";
    case "canceled":
      return "No bookings have been canceled.";
    case "all":
      return "No bookings yet. Add the first one.";
  }
}

export default async function DispatchPage(props: PageProps<"/">) {
  const params = await props.searchParams;

  const rawView = typeof params.view === "string" ? params.view : undefined;
  const view: View = isView(rawView) ? rawView : DEFAULT_VIEW;
  const search = typeof params.q === "string" ? params.q : "";

  const [rows, settings] = await Promise.all([listBookings(view, search), getSettings()]);

  // The operator's day, not the server's — Netlify runs in UTC.
  const todayIso = todayInTimezone(settings.timezone);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[26px] leading-tight font-medium text-ink">
            {formatDate(todayIso)}
          </h1>
          <p className="mt-1 text-sm text-slate">{summary(view, rows)}</p>
        </div>

        <div className="flex items-center gap-3">
          <form action="/" method="get" className="flex items-center">
            <input type="hidden" name="view" value={view} />
            <input
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Search name, phone or place"
              aria-label="Search bookings"
              className="w-60 rounded-sm border border-rule bg-card px-3 py-2 text-sm text-ink
                         placeholder:text-slate/70 focus:border-brass focus:outline-none"
            />
          </form>

          <Link
            href="/bookings/new"
            className="rounded-sm bg-ink px-4 py-2 text-sm font-medium text-card
                       transition-colors hover:bg-ink-soft"
          >
            New booking
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="border border-rule bg-card px-5 py-12 text-center">
          <p className="text-sm text-slate">{emptyMessage(view, search)}</p>
        </div>
      ) : (
        <RunSheet bookings={rows} view={view} />
      )}
    </>
  );
}
