import { describe, expect, it } from "vitest";
import { buildSale, type CartLine, type TenantBranding } from "@merkat/core";
import { SeedOrderStore } from "../orders/store.js";
import { createOrdersStore } from "./orders.js";

const BRANDING: TenantBranding = {
  id: "0191a000-0000-7000-8000-000000000001",
  name: "Lumière",
  businessType: "retail",
  accentHex: "#E11D74",
  logoUrl: null,
  currency: "USD",
  locale: "en-US",
  taxConfig: { rate: 0.08, inclusive: false },
};

const lines: CartLine[] = [
  {
    key: "p1",
    productId: "0191a000-0000-7000-8000-000000000001",
    variantId: null,
    name: "Serum",
    unitPriceMinor: 2999,
    qty: 2,
  },
];

function sale() {
  return buildSale({
    tenantId: BRANDING.id,
    locationId: "0191a000-0000-7000-8000-0000000000f0",
    lines,
    taxConfig: BRANDING.taxConfig,
    method: "cash",
    tenderedMinor: 10000,
  });
}

describe("orders store — record + refund (§1.4, §12 gate)", () => {
  it("records a sale and refunds it with reversing rows", () => {
    const store = createOrdersStore(new SeedOrderStore());
    const s = sale();
    store.getState().recordSale(s);
    expect(store.getState().orders).toHaveLength(1);

    const outcome = store.getState().refund(s.order.id, BRANDING);
    expect(outcome).not.toBeNull();
    // reversing movement returns the 2 units, receipt is a refund
    expect(outcome!.refundMovements[0]!.delta).toBe(2);
    expect(outcome!.receipt.kind).toBe("refund");

    // original order is marked refunded (not destroyed), with a negative payment
    const record = store.getState().orders[0]!;
    expect(record.order.status).toBe("refunded");
    expect(record.payments.some((p) => p.amountMinor < 0)).toBe(true);
  });

  it("refuses to refund the same order twice", () => {
    const store = createOrdersStore(new SeedOrderStore());
    const s = sale();
    store.getState().recordSale(s);
    expect(store.getState().refund(s.order.id, BRANDING)).not.toBeNull();
    expect(store.getState().refund(s.order.id, BRANDING)).toBeNull();
  });
});
