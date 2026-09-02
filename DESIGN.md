# Design notes

Working notes for the visual system. Kept so later passes don't re-litigate
settled choices or drift back toward defaults.

## The idea

The dashboard is a **run sheet**, not a dashboard — the chronological trip
document a chauffeur actually carries. A limo day is a timeline, so the list is
always in time order and a brass "now" rule sits in it at the current time.
Filters change which trips are present, never the shape of the page.

One bold element: that now-rule. Everything else stays quiet.

## Tokens

| Token | Value | Role |
| --- | --- | --- |
| `--ink` | `#17212F` | Navy. Body text, nav band. Genuinely navy, not tinted black. |
| `--paper` | `#EFE8DA` | Page ground. Manila/oyster, deliberately warmer and more saturated than the generic `#F4F1EA` cream. |
| `--card` | `#FBF8F2` | Lifted surface for the run sheet. |
| `--brass` | `#A8813C` | Accent. Marks what is live, and nothing else. |
| `--slate` | `#5A6675` | Secondary text. |
| `--rule` | `#D9CFBD` | Hairlines, in paper tone. |

Status encoding is functional, not decorative: **in progress** is the only
filled state, in brass, because it's the only one happening now. Upcoming is
outlined, completed is quiet slate, canceled is struck through.

## Type

- **Spectral** (serif) — wordmark and headings. Engraved, slightly severe,
  suits ink-navy. Chosen over Playfair / Instrument Serif, which are the
  current defaults.
- **IBM Plex Sans** — all data and UI. Real tabular figures for times, prices
  and passenger counts. Chosen over Inter/Geist.
- `font-variant-numeric: tabular-nums` anywhere numbers are compared down a
  column.

## Rules kept from the brief's skill

- No all-caps labels, no eyebrow labels above headings.
- No single-word accenting inside a headline.
- No middle-dot meta strings (`A · B · C`).
- No monospace standing in for "data".
- No `→` appended to buttons. Buttons name their action: "Save booking",
  "Cancel trip", "Restore".
- Motion only in response to an action. The now-rule doesn't animate in.

## Revised away from (don't reintroduce)

- Card grid of bookings with pill statuses — the SaaS-card kit.
- Stat tiles across the top (`4 trips` / `$845 booked`) — the default hero
  treatment. Replaced by one line of running text under the date.
