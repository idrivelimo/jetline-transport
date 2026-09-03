import { fromCents, toCents } from "./format.ts";

/**
 * Ontario HST.
 *
 * A single rate, because the company operates in one province. If Jetline ever
 * bills from another province this becomes a Settings field rather than a
 * constant — the rest of the calculation does not change.
 */
export const HST_RATE = 0.13;
export const HST_LABEL = "HST (13%)";

/** Tax on an amount, rounded to the nearest cent. */
export function taxOn(amount: string, rate: number = HST_RATE): string {
  return fromCents(Math.round(toCents(amount) * rate));
}

export type InvoiceTotals = {
  subtotal: string;
  tax: string;
  total: string;
  /** Whether any line on the invoice was billed without tax. */
  mixed: boolean;
};

/**
 * Totals for a set of line amounts, where `taxable` says which of them carry
 * HST. Tax is worked out on the taxable subtotal as a whole rather than per
 * line, so the invoice never drifts a cent from the sum of its own rows.
 */
export function invoiceTotals(
  lines: { amount: string; taxable: boolean }[],
  rate: number = HST_RATE,
): InvoiceTotals {
  const subtotalCents = lines.reduce((t, l) => t + toCents(l.amount), 0);
  const taxableCents = lines.reduce((t, l) => (l.taxable ? t + toCents(l.amount) : t), 0);
  const taxCents = Math.round(taxableCents * rate);

  return {
    subtotal: fromCents(subtotalCents),
    tax: fromCents(taxCents),
    total: fromCents(subtotalCents + taxCents),
    mixed: lines.some((l) => !l.taxable) && lines.some((l) => l.taxable),
  };
}
