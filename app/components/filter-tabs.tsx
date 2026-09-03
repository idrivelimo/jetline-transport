"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { VIEWS, type View } from "@/app/lib/views";

const LABELS: Record<View, string> = {
  upcoming: "Upcoming",
  in_progress: "In progress",
  completed: "Completed",
  canceled: "Canceled",
  all: "All",
};

/** Tab order puts the working views first and the archive last. */
const ORDER: View[] = ["upcoming", "in_progress", "completed", "canceled", "all"];

export function FilterTabs() {
  const params = useSearchParams();
  const pathname = usePathname();
  const active = (params.get("view") ?? "upcoming") as View;
  const search = params.get("q") ?? "";

  // Tabs always navigate to the run sheet, even from a booking form.
  const href = (view: View) => {
    const next = new URLSearchParams();
    next.set("view", view);
    if (search) next.set("q", search);
    return `/?${next}`;
  };

  return (
    // nowrap so the row scrolls sideways on a phone instead of stacking.
    <nav className="flex items-center gap-x-5 whitespace-nowrap">
      {ORDER.map((view) => {
        const isActive = pathname === "/" && VIEWS.includes(active) && active === view;
        return (
          <Link
            key={view}
            href={href(view)}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "border-b-2 border-brass pb-0.5 text-sm text-card"
                : "border-b-2 border-transparent pb-0.5 text-sm text-rule/60 transition-colors hover:text-card"
            }
          >
            {LABELS[view]}
          </Link>
        );
      })}
    </nav>
  );
}
