import { describe, expect, it } from "vitest";
import {
  buildReceipt,
  buildSale,
  computeTotals,
  renderReceiptText,
  type CartLine,
} from "./sale.js";

const LOC = "0191a000-0000-7000-8000-0000000000f0";
const TENANT = "0191a000-0000-7000-8000-000000000001";

const lines: CartLine[] = [
  {
    key: "p1",
    productId: "0191a000-0000-7000-8000-000000000001",
    variantId: null,
    name: "Serum",
    unitPriceMinor: 2999,
    qty: 2,
  },
  {
    key: "p2",
    productId: "0191a000-0000-7000-8000-000000000002",
    variantId: null,
    name: "Lipstick",
    unitPriceMinor: 1899,
    qty: 1,
  },
];

describe("totals (§1.5)", () => {
  it("adds exclusive tax on top of subtotal", () => {
    const t = computeTotals(lines, { rate: 0.08, inclusive: false });
    expect(t.subtotalMinor).toBe(7897); // 2*2999 + 1899
    expect(t.taxMinor).toBe(Math.round(7897 * 0.08)); // 632
    expect(t.totalMinor).toBe(7897 + 632);
  });

  it("extracts inclusive tax from the total", () => {
    const t = computeTotals(lines, { rate: 0.1, inclusive: true });
    expect(t.totalMinor).toBe(7897);
    expect(t.taxMinor).toBe(Math.round(7897 - 7897 / 1.1));
  });

  it("applies an order discount before tax", () => {
    const t = computeTotals(lines, { rate: 0.08, inclusive: false }, 897);
    expect(t.totalMinor).toBe(7000 + Math.round(7000 * 0.08));
  });
});

describe("buildSale (§1.3, §1.4)", () => {
  it("mints order + lines + payment + one negative sale movement per line", () => {
    const sale = buildSale({
      tenantId: TENANT,
      locationId: LOC,
      staffId: null,
      lines,
      taxConfig: { rate: 0.08, inclusive: false },
      method: "cash",
      tenderedMinor: 10000,
      now: 1_700_000_000_000,
    });

    expect(sale.order.status).toBe("paid");
    expect(sale.lines).toHaveLength(2);
    expect(sale.movements).toHaveLength(2);
    // sale movements are negative and reference the order (ledger, §1.3)
    expect(
      sale.movements.every((m) => m.delta < 0 && m.reason === "sale"),
    ).toBe(true);
    expect(sale.movements.every((m) => m.refId === sale.order.id)).toBe(true);
    expect(sale.movements[0]!.delta).toBe(-2);
    // change = tendered - total
    expect(sale.changeMinor).toBe(10000 - sale.order.totalMinor);
  });

  it("refuses to charge an empty cart", () => {
    expect(() =>
      buildSale({
        tenantId: TENANT,
        locationId: LOC,
        lines: [],
        method: "cash",
        tenderedMinor: 0,
      }),
    ).toThrow();
  });
});

describe("receipt", () => {
  it("renders a monospaced receipt with total + change", () => {
    const sale = buildSale({
      tenantId: TENANT,
      locationId: LOC,
      lines,
      taxConfig: { rate: 0.08, inclusive: false },
      method: "cash",
      tenderedMinor: 10000,
    });
    const text = renderReceiptText(
      buildReceipt(sale, "Lumière Cosmetics", "USD", "en-US"),
    ).join("\n");
    expect(text).toContain("Lumière Cosmetics");
    expect(text).toContain("TOTAL");
    expect(text).toContain("Change");
    expect(text).toContain("2 x Serum");
  });
});
