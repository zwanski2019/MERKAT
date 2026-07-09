import { describe, expect, it } from "vitest";
import {
  outstandingQty,
  poTotalMinor,
  purchaseOrderInputSchema,
  supplierInputSchema,
  type PurchaseOrderLine,
} from "./purchasing.js";

const lines: PurchaseOrderLine[] = [
  { productId: "p1", name: "Serum", qty: 24, unitCostMinor: 1200 },
  { productId: "p2", name: "Lipstick", qty: 12, unitCostMinor: 700 },
];

describe("purchasing (§14)", () => {
  it("totals a purchase order", () => {
    expect(poTotalMinor(lines)).toBe(24 * 1200 + 12 * 700);
  });

  it("tracks outstanding quantity for partial receiving", () => {
    expect(outstandingQty(lines)).toBe(36);
    const partial = lines.map((l) => ({ ...l, receivedQty: l.qty - 2 }));
    expect(outstandingQty(partial)).toBe(4); // 2 remaining per line
  });

  it("validates supplier + PO input", () => {
    expect(supplierInputSchema.safeParse({ name: "ACME" }).success).toBe(true);
    expect(supplierInputSchema.safeParse({ name: " " }).success).toBe(false);
    expect(
      purchaseOrderInputSchema.safeParse({ supplierId: "s1", lines }).success,
    ).toBe(true);
    expect(
      purchaseOrderInputSchema.safeParse({ supplierId: "s1", lines: [] })
        .success,
    ).toBe(false);
  });
});
