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

The document aims at hotel stationery rather than a software receipt: a
confident masthead over the brass rule, a period line that states what is being
billed in words, generous row rhythm, and a totals block aligned to the amount
column instead of one more table row. Line items drop the year — the period line
carries it, unless the invoice straddles two years, in which case every line
spells it out.

The PDF uses the built-in Times-Roman and Helvetica rather than embedded
Spectral and IBM Plex. Same serif/sans relationship, no font binaries in the
repo, and nothing to download at runtime inside a serverless function.
Registering the real faces is a drop-in change if the brand match matters more.

### Also revised away from
- Tabs or a radio to pick "mode" — collapsed into the single flow above.
- A floating "3 selected / $845" summary card — the SaaS default.
- "Generate PDF" as a button label. It says "Download invoice": what you get,
  not what the system does.

## Days are the run sheet's spine

Rows are grouped under the day they run, with **Today** / **Tomorrow** /
**Yesterday** carrying the heading where they help and the full date beside
them. A list spanning several dates reads as randomly ordered when every row
shows only a clock time — which is exactly what happened when the Upcoming view
hid dates on the assumption it covered a single day.

The now-rule lives inside today's group, marking how much of the day is behind.
Its position flips with the sort direction, so `isSoonestFirst()` in
`app/lib/views.ts` is the single source of truth for which way a list runs —
the query's ORDER BY and the rule both read it.

## Mobile

One breakpoint, `sm` (640px). Below it:

- The header keeps the wordmark and account links on one line and drops the
  filter tabs to their own row, scrolling sideways rather than stacking.
- A booking row stacks: time inline at the top, then customer and route, then
  price and actions sharing the last line.
- Invoice line items stack, with vehicle and price sharing a row. `sm:contents`
  dissolves that wrapper above the breakpoint so they become ordinary columns.
- Page padding drops from `px-6` to `px-4`.

No fixed width without an `sm:` prefix is wide enough to overflow a 360px
screen — worth re-checking whenever a column is added.

## HST

Every trip is taxed by default. Two columns of checkboxes head the line items —
the left decides what is billed, the right what carries HST — and each has its
own "all" control at the top, so removing tax from everything and removing it
from one trip are the same gesture at different scales.

Tax is worked out on the taxable subtotal as a whole, never summed per line:
rounding each line separately drifts from the invoice's own arithmetic. All of
it runs in integer cents (`app/lib/tax.ts`).

The PDF grows a Tax column **only when an invoice is mixed** — on an all-taxed
invoice the column would say the same thing on every row. Exempt lines read
"None" rather than a dash: a blank cell looks like an oversight, and an em dash
is a glyph risk in the PDF's built-in encoding.

The HST registration number lives in Settings and prints in the letterhead. It
is what makes the document a tax invoice a customer can claim against; it is
optional because an operator under the small-supplier threshold has none.
