/**
 * Shared between the server data layer and the client filter tabs, so it must
 * stay free of `server-only` imports.
 */
export const VIEWS = ["upcoming", "in_progress", "completed", "canceled", "all"] as const;
export type View = (typeof VIEWS)[number];

export function isView(value: string | undefined): value is View {
  return VIEWS.includes(value as View);
}

export const DEFAULT_VIEW: View = "upcoming";

/**
 * Which way a view reads. What's still to come is soonest-first; an archive is
 * most-recent-first. Shared so the query's ORDER BY and the run sheet's "now"
 * rule can't disagree about which direction the list runs.
 */
export function isSoonestFirst(view: View): boolean {
  return view === "upcoming" || view === "in_progress";
}
