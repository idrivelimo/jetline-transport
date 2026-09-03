import Link from "next/link";

import { listBookings } from "@/app/lib/bookings";
import { DEFAULT_VIEW, isSoonestFirst, isView, type View } from "@/app/lib/views";
import { formatDate, formatTime, relativeDayLabel, todayInTimezone } from "@/app/lib/format";
import { getSettings } from "@/app/lib/settings";
import { RunSheet } from "@/app/components/run-sheet";
import type { Booking } from "@/app/lib/schema";

const VIEW_TITLES: Record<View, string> = {
  upcoming: "Upcoming",
  in_progress: "On the road",
  completed: "Completed",
  canceled: "Canceled",
  all: "All bookings",
};

/** One line of running text under the heading — no stat tiles. */
function summary(view: View, rows: Booking[], filtered: boolean): string {
  const n = rows.length;
  const trips = `${n} trip${n === 1 ? "" : "s"}`;

  if (filtered) return n === 0 ? "No trips match" : trips;

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

function emptyMessage(view: View, search: string, date: string): string {
  if (search && date) return `Nothing matches “${search}” on that day.`;
  if (search) return `Nothing matches “${search}”.`;
  if (date) return "No trips booked for that day.";
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
  const date = typeof params.date === "string" ? params.date : "";

  const [rows, settings] = await Promise.all([
    listBookings(view, search, date),
    getSettings(),
  ]);

  // The operator's day, not the server's — Netlify runs in UTC.
  const today = todayInTimezone(settings.timezone);

  const filtered = Boolean(search || date);

  // Filtering to a day makes that day the subject of the page. "Today" carries
  // the heading when it applies, and the full date drops to the line beneath.
  const relative = date ? relativeDayLabel(date, today) : null;
  const heading = date ? (relative ?? formatDate(date)) : VIEW_TITLES[view];
  const subline = relative
    ? `${formatDate(date)}. ${summary(view, rows, filtered)}`
    : summary(view, rows, filtered);

  return (
    <>
      <div className="mb-6">
        <h1 className="font-serif text-[26px] leading-tight font-medium text-ink">
          {heading}
        </h1>
        <p className="mt-1 text-sm text-slate">{subline}</p>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <form method="get" className="flex flex-1 flex-wrap items-end gap-2">
          <input type="hidden" name="view" value={view} />

          <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-64">
            <label htmlFor="q" className="text-[13px] text-slate">
              Search
            </label>
            <input
              id="q"
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Name, phone or place"
              className="w-full rounded-sm border border-rule bg-card px-3 py-2 text-sm text-ink
                         placeholder:text-slate/70 focus:border-brass focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="date" className="text-[13px] text-slate">
              Day
            </label>
            <input
              id="date"
              type="date"
              name="date"
              defaultValue={date}
              className="rounded-sm border border-rule bg-card px-3 py-2 text-sm text-ink
                         focus:border-brass focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="rounded-sm border border-ink px-3 py-2 text-sm font-medium text-ink
                       transition-colors hover:bg-ink hover:text-card"
          >
            Show
          </button>

          {filtered && (
            <Link
              href={`/?view=${view}`}
              className="py-2 text-sm text-slate underline-offset-2 hover:text-ink hover:underline"
            >
              Clear
            </Link>
          )}
        </form>

        <Link
          href="/bookings/new"
          className="rounded-sm bg-ink px-4 py-2 text-center text-sm font-medium text-card
                     transition-colors hover:bg-ink-soft sm:self-end"
        >
          New booking
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="border border-rule bg-card px-4 py-12 text-center sm:px-5">
          <p className="text-sm text-slate">{emptyMessage(view, search, date)}</p>
        </div>
      ) : (
        <RunSheet bookings={rows} today={today} soonestFirst={isSoonestFirst(view)} />
      )}
    </>
  );
}
