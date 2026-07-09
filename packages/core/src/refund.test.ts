import { describe, expect, it } from "vitest";
import { buildRefund } from "./refund.js";
import { buildSale, renderReceiptText, type CartLine } from "./sale.js";

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
];

function paidSale() {
  return buildSale({
    tenantId: TENANT,
    locationId: LOC,
    lines,
    taxConfig: { rate: 0.08, inclusive: false },
    method: "cash",
    tenderedMinor: 10000,
    now: 1_700_000_000_000,
  });
}

describe("refund creates reversing rows (§1.4, §12 gate)", () => {
  it("reverses payment and returns stock — original is untouched", () => {
    const sale = paidSale();
    const result = buildRefund(
      sale.order,
      sale.lines,
      "Lumière Cosmetics",
      "USD",
      "en-US",
    );

    // negative payment for the full total
    expect(result.refundPayment.amountMinor).toBe(-sale.order.totalMinor);
    expect(result.refundPayment.status).toBe("refunded");

    // positive movement returning the 2 units to stock (reason adjustment)
    expect(result.refundMovements).toHaveLength(1);
    expect(result.refundMovements[0]!.delta).toBe(2);
    expect(result.refundMovements[0]!.reason).toBe("adjustment");
    expect(result.refundMovements[0]!.refId).toBe(sale.order.id);

    // the original sale rows are not mutated (append-only, §1.4)
    expect(sale.payment.amountMinor).toBeGreaterThan(0);
    expect(sale.movements[0]!.delta).toBe(-2);
  });

  it("reprints a refund receipt with negative totals", () => {
    const sale = paidSale();
    const { receipt } = buildRefund(
      sale.order,
      sale.lines,
      "Lumière Cosmetics",
      "USD",
      "en-US",
    );
    const text = renderReceiptText(receipt).join("\n");
    expect(text).toContain("*** REFUND ***");
    expect(receipt.totals.totalMinor).toBe(-sale.order.totalMinor);
  });
});
