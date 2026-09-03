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
