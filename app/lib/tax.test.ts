import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { invoiceTotals, taxOn } from "./tax.ts";

describe("taxOn", () => {
  test("works out 13% of a realistic invoice", () => {
    assert.equal(taxOn("1410.00"), "183.30");
  });

  test("works out 13% of one fare", () => {
    assert.equal(taxOn("185.00"), "24.05");
  });

  test("rounds to the nearest cent rather than truncating", () => {
    // 0.05 * 0.13 = 0.0065 -> rounds up to a cent.
    assert.equal(taxOn("0.05"), "0.01");
    // 0.03 * 0.13 = 0.0039 -> rounds down to nothing.
    assert.equal(taxOn("0.03"), "0.00");
  });
});

describe("invoiceTotals", () => {
  const taxable = (amount: string) => ({ amount, taxable: true });
  const exempt = (amount: string) => ({ amount, taxable: false });

  test("taxes every line by default", () => {
    const t = invoiceTotals([taxable("185.00"), taxable("185.00"), taxable("145.00")]);
    assert.deepEqual(t, { subtotal: "515.00", tax: "66.95", total: "581.95", mixed: false });
  });

  test("leaves an exempt line out of the tax but not the subtotal", () => {
    const t = invoiceTotals([taxable("100.00"), exempt("100.00")]);
    assert.equal(t.subtotal, "200.00");
    assert.equal(t.tax, "13.00");
    assert.equal(t.total, "213.00");
    assert.equal(t.mixed, true);
  });

  test("no tax at all when every line is exempt", () => {
    const t = invoiceTotals([exempt("185.00"), exempt("145.00")]);
    assert.deepEqual(t, { subtotal: "330.00", tax: "0.00", total: "330.00", mixed: false });
  });

  test("taxes the taxable subtotal as a whole, not line by line", () => {
    // Per-line rounding would give 0.01 + 0.01 + 0.01 = 0.03; on the subtotal
    // 0.15 * 0.13 = 0.0195, which is 0.02. The subtotal figure is the correct one.
    const t = invoiceTotals([taxable("0.05"), taxable("0.05"), taxable("0.05")]);
    assert.equal(t.tax, "0.02");
    assert.equal(t.total, "0.17");
  });

  test("an empty invoice totals zero", () => {
    assert.deepEqual(invoiceTotals([]), {
      subtotal: "0.00", tax: "0.00", total: "0.00", mixed: false,
    });
  });
});
