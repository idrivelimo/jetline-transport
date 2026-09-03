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

## Invoicing

The screen is the **draft invoice**, not a form that produces one. Line items,
a rule, then the total — the total sits in the price column as the list's last
line, so the page reads the way the document reads.

The brief's "two modes" (date range *or* hand-pick) are one flow: the range
filters what's on screen, the checkboxes choose from it, and rows arrive
pre-ticked. Billing a whole month is one action; hand-picking is unticking.

Brass keeps its meaning — the thing that is live. On the run sheet that's the
trip happening now; here it's the total, the number that moves as you work.

Column headers appear in the PDF and not on screen: the document is formal and
earns them, the working view doesn't need labels over self-evident columns.

The PDF uses the built-in Times-Roman and Helvetica rather than embedded
Spectral and IBM Plex. Same serif/sans relationship, no font binaries in the
repo, and nothing to download at runtime inside a serverless function.
Registering the real faces is a drop-in change if the brand match matters more.

### Also revised away from
- Tabs or a radio to pick "mode" — collapsed into the single flow above.
- A floating "3 selected / $845" summary card — the SaaS default.
- "Generate PDF" as a button label. It says "Download invoice": what you get,
  not what the system does.
