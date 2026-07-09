/**
 * Refunds (CLAUDE.md §1.4, §13). A refund never destroys the original sale — it
 * appends reversing rows: a negative payment, positive stock movements that
 * return the goods to inventory (through the same ledger, §1.3), and a refund
 * receipt to reprint. The original order is marked `refunded`.
 */
import { newId } from "./id.js";
import type { StockMovement } from "./inventory.js";
import type { Order, OrderLine, Payment, SaleReceipt } from "./sale.js";

export interface RefundResult {
  /** Negative payment recording money returned. */
  readonly refundPayment: Payment;
  /** Positive movements returning stock (reason `adjustment`, ref = order). */
  readonly refundMovements: StockMovement[];
  readonly receipt: SaleReceipt;
  readonly refundedTotalMinor: number;
}

/** Build the reversing rows + receipt for a full refund of an order. */
export function buildRefund(
  order: Order,
  lines: readonly OrderLine[],
  businessName: string,
  currency: string,
  locale: string,
  opts: { staffId?: string | null; now?: number } = {},
): RefundResult {
  const now = opts.now ?? Date.now();

  const refundPayment: Payment = {
    id: newId(),
    orderId: order.id,
    method: "cash", // Phase 6 refunds to cash; card refund via Stripe later
    amountMinor: -order.totalMinor,
    status: "refunded",
    providerRef: null,
  };

  const refundMovements: StockMovement[] = lines
    .filter((l) => l.productId || l.variantId)
    .map((l) => ({
      id: newId(),
      productId: l.productId,
      variantId: l.variantId,
      locationId: order.locationId,
      delta: l.qty, // return to stock
      reason: "adjustment",
      refId: order.id,
      staffId: opts.staffId ?? null,
      createdAt: now,
    }));

  const receipt: SaleReceipt = {
    orderId: order.id,
    businessName,
    currency,
    locale,
    createdAt: now,
    kind: "refund",
    lines: lines.map((l) => ({
      name: l.name,
      qty: l.qty,
      lineTotalMinor: -l.lineTotalMinor,
    })),
    totals: {
      subtotalMinor: -order.subtotalMinor,
      discountMinor: order.discountMinor,
      taxMinor: -order.taxMinor,
      totalMinor: -order.totalMinor,
    },
    method: "cash",
    tenderedMinor: -order.totalMinor,
    changeMinor: 0,
  };

  return {
    refundPayment,
    refundMovements,
    receipt,
    refundedTotalMinor: order.totalMinor,
  };
}
