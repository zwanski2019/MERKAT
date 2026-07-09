/**
 * Orders data source (CLAUDE.md §4, §5). Persists completed sales and handles
 * refunds as reversing rows (§1.4) — the original order is never destroyed, it
 * is marked `refunded` and a negative payment + stock-returning movements are
 * appended. Same iface+mock pattern; Phase 5's synced SQLite backs it later.
 */
import {
  buildRefund,
  type Order,
  type OrderLine,
  type Payment,
  type Sale,
  type SaleReceipt,
  type StockMovement,
  type TenantBranding,
} from "@merkat/core";

export interface OrderRecord {
  readonly order: Order;
  readonly lines: readonly OrderLine[];
  readonly payments: readonly Payment[];
}

export interface RefundOutcome {
  /** Movements the caller applies to inventory (returns stock). */
  readonly refundMovements: readonly StockMovement[];
  readonly receipt: SaleReceipt;
}

export interface OrderStore {
  recordSale(sale: Sale): void;
  listOrders(): OrderRecord[];
  getOrder(id: string): OrderRecord | undefined;
  /** Refund a paid order; returns the reversing movements + receipt, or null. */
  refund(
    id: string,
    branding: TenantBranding,
    staffId?: string | null,
  ): RefundOutcome | null;
}

/** Build a reprintable receipt from a stored order. */
export function receiptFor(
  record: OrderRecord,
  branding: TenantBranding,
): SaleReceipt {
  const { order, lines, payments } = record;
  const tender = payments.find((p) => p.amountMinor > 0) ?? payments[0];
  return {
    orderId: order.id,
    businessName: branding.name,
    currency: branding.currency,
    locale: branding.locale,
    createdAt: order.createdAt,
    kind: "sale",
    lines: lines.map((l) => ({
      name: l.name,
      qty: l.qty,
      lineTotalMinor: l.lineTotalMinor,
    })),
    totals: {
      subtotalMinor: order.subtotalMinor,
      discountMinor: order.discountMinor,
      taxMinor: order.taxMinor,
      totalMinor: order.totalMinor,
    },
    method: tender?.method ?? "cash",
    tenderedMinor: tender?.amountMinor ?? order.totalMinor,
    changeMinor: Math.max(0, (tender?.amountMinor ?? 0) - order.totalMinor),
  };
}

export class SeedOrderStore implements OrderStore {
  private records: OrderRecord[] = [];

  recordSale(sale: Sale): void {
    this.records = [
      { order: sale.order, lines: sale.lines, payments: [sale.payment] },
      ...this.records,
    ];
  }

  listOrders(): OrderRecord[] {
    return [...this.records];
  }

  getOrder(id: string): OrderRecord | undefined {
    return this.records.find((r) => r.order.id === id);
  }

  refund(
    id: string,
    branding: TenantBranding,
    staffId: string | null = null,
  ): RefundOutcome | null {
    const record = this.getOrder(id);
    if (!record || record.order.status === "refunded") return null;

    const result = buildRefund(
      record.order,
      record.lines,
      branding.name,
      branding.currency,
      branding.locale,
      { staffId },
    );

    // Append the reversing payment; mark the original order refunded (§1.4).
    const updated: OrderRecord = {
      order: { ...record.order, status: "refunded" },
      lines: record.lines,
      payments: [...record.payments, result.refundPayment],
    };
    this.records = this.records.map((r) => (r.order.id === id ? updated : r));

    return { refundMovements: result.refundMovements, receipt: result.receipt };
  }
}
