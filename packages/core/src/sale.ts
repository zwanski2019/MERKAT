/**
 * Point-of-sale domain (CLAUDE.md §4, Phase 4). A sale is append-only
 * financial data (§1.4): charging a cart produces an immutable order + order
 * lines + payment, and one signed `sale` stock movement per line (§1.3) so
 * inventory decrements through the same ledger. Corrections are new rows
 * (refunds/voids), never destructive edits — those come in Phase 6.
 *
 * Money is integer minor units (§1.5); tax is computed then rounded to minor
 * units at this edge.
 */
import { newId } from "./id.js";
import { formatMoney, money } from "./money.js";
import type { TaxConfig } from "./auth.js";

export type PaymentMethod = "cash" | "card" | "mobile";

export interface CartLine {
  /** Stable UI key (product or variant identity). */
  readonly key: string;
  readonly productId: string | null;
  readonly variantId: string | null;
  readonly name: string;
  readonly unitPriceMinor: number;
  readonly qty: number;
}

export interface OrderTotals {
  readonly subtotalMinor: number;
  readonly discountMinor: number;
  readonly taxMinor: number;
  readonly totalMinor: number;
}

export function lineTotalMinor(
  line: Pick<CartLine, "unitPriceMinor" | "qty">,
): number {
  return line.unitPriceMinor * line.qty;
}

/** Compute order totals from cart lines, tax config, and any order discount. */
export function computeTotals(
  lines: readonly CartLine[],
  taxConfig?: TaxConfig,
  discountMinor = 0,
): OrderTotals {
  const subtotal = lines.reduce((sum, l) => sum + lineTotalMinor(l), 0);
  const net = Math.max(0, subtotal - discountMinor);
  const rate = taxConfig?.rate ?? 0;
  const tax = taxConfig?.inclusive
    ? Math.round(net - net / (1 + rate))
    : Math.round(net * rate);
  const total = taxConfig?.inclusive ? net : net + tax;
  return {
    subtotalMinor: subtotal,
    discountMinor,
    taxMinor: tax,
    totalMinor: total,
  };
}

export interface Order {
  readonly id: string;
  readonly tenantId: string;
  readonly locationId: string;
  readonly customerId: string | null;
  readonly channel: "in_store" | "online";
  readonly status: "open" | "paid" | "refunded" | "voided";
  readonly subtotalMinor: number;
  readonly taxMinor: number;
  readonly discountMinor: number;
  readonly totalMinor: number;
  readonly openedBy: string | null;
  readonly closedAt: number | null;
  readonly createdAt: number;
}

export interface OrderLine {
  readonly id: string;
  readonly orderId: string;
  readonly productId: string | null;
  readonly variantId: string | null;
  readonly name: string;
  readonly qty: number;
  readonly unitPriceMinor: number;
  readonly lineTotalMinor: number;
}

export interface Payment {
  readonly id: string;
  readonly orderId: string;
  readonly method: PaymentMethod;
  readonly amountMinor: number;
  readonly status: "paid";
}

/** A sale's minted rows: the order, its lines, the payment, and stock movements. */
export interface Sale {
  readonly order: Order;
  readonly lines: readonly OrderLine[];
  readonly payment: Payment;
  readonly movements: readonly SaleMovement[];
  readonly changeMinor: number;
}

export interface SaleMovement {
  readonly id: string;
  readonly productId: string | null;
  readonly variantId: string | null;
  readonly locationId: string;
  readonly delta: number; // negative for a sale
  readonly reason: "sale";
  readonly refId: string; // order id
  readonly staffId: string | null;
  readonly createdAt: number;
}

export interface BuildSaleInput {
  readonly tenantId: string;
  readonly locationId: string;
  readonly staffId?: string | null;
  readonly customerId?: string | null;
  readonly lines: readonly CartLine[];
  readonly taxConfig?: TaxConfig;
  readonly discountMinor?: number;
  readonly method: PaymentMethod;
  /** Cash tendered; for card/mobile pass the total. */
  readonly tenderedMinor: number;
  readonly now?: number;
}

/** Build an immutable sale from a cart (§1.3, §1.4). Pure — no I/O. */
export function buildSale(input: BuildSaleInput): Sale {
  if (input.lines.length === 0) throw new Error("Cannot charge an empty cart.");
  const now = input.now ?? Date.now();
  const orderId = newId();
  const totals = computeTotals(
    input.lines,
    input.taxConfig,
    input.discountMinor ?? 0,
  );

  const lines: OrderLine[] = input.lines.map((l) => ({
    id: newId(),
    orderId,
    productId: l.productId,
    variantId: l.variantId,
    name: l.name,
    qty: l.qty,
    unitPriceMinor: l.unitPriceMinor,
    lineTotalMinor: lineTotalMinor(l),
  }));

  const movements: SaleMovement[] = input.lines.map((l) => ({
    id: newId(),
    productId: l.productId,
    variantId: l.variantId,
    locationId: input.locationId,
    delta: -l.qty,
    reason: "sale",
    refId: orderId,
    staffId: input.staffId ?? null,
    createdAt: now,
  }));

  const order: Order = {
    id: orderId,
    tenantId: input.tenantId,
    locationId: input.locationId,
    customerId: input.customerId ?? null,
    channel: "in_store",
    status: "paid",
    subtotalMinor: totals.subtotalMinor,
    taxMinor: totals.taxMinor,
    discountMinor: totals.discountMinor,
    totalMinor: totals.totalMinor,
    openedBy: input.staffId ?? null,
    closedAt: now,
    createdAt: now,
  };

  const payment: Payment = {
    id: newId(),
    orderId,
    method: input.method,
    amountMinor: input.tenderedMinor,
    status: "paid",
  };

  const changeMinor = Math.max(0, input.tenderedMinor - totals.totalMinor);
  return { order, lines, payment, movements, changeMinor };
}

// ── receipt (ESC/POS is Rust-side, §7; here we render text for preview) ──────
export interface SaleReceipt {
  readonly orderId: string;
  readonly businessName: string;
  readonly currency: string;
  readonly locale: string;
  readonly createdAt: number;
  readonly lines: readonly {
    name: string;
    qty: number;
    lineTotalMinor: number;
  }[];
  readonly totals: OrderTotals;
  readonly method: PaymentMethod;
  readonly tenderedMinor: number;
  readonly changeMinor: number;
}

export function buildReceipt(
  sale: Sale,
  businessName: string,
  currency: string,
  locale: string,
): SaleReceipt {
  return {
    orderId: sale.order.id,
    businessName,
    currency,
    locale,
    createdAt: sale.order.createdAt,
    lines: sale.lines.map((l) => ({
      name: l.name,
      qty: l.qty,
      lineTotalMinor: l.lineTotalMinor,
    })),
    totals: {
      subtotalMinor: sale.order.subtotalMinor,
      discountMinor: sale.order.discountMinor,
      taxMinor: sale.order.taxMinor,
      totalMinor: sale.order.totalMinor,
    },
    method: sale.payment.method,
    tenderedMinor: sale.payment.amountMinor,
    changeMinor: sale.changeMinor,
  };
}

const WIDTH = 40;

function row(left: string, right: string): string {
  const gap = Math.max(1, WIDTH - left.length - right.length);
  return left + " ".repeat(gap) + right;
}

/** Render a receipt as monospaced lines (preview + the ESC/POS text basis). */
export function renderReceiptText(receipt: SaleReceipt): string[] {
  const fmt = (minor: number): string =>
    formatMoney(money(minor, receipt.currency), receipt.locale);
  const out: string[] = [];
  out.push(receipt.businessName);
  out.push(new Date(receipt.createdAt).toLocaleString(receipt.locale));
  out.push(`Order ${receipt.orderId.slice(0, 8)}`);
  out.push("-".repeat(WIDTH));
  for (const l of receipt.lines) {
    out.push(row(`${l.qty} x ${l.name}`, fmt(l.lineTotalMinor)));
  }
  out.push("-".repeat(WIDTH));
  out.push(row("Subtotal", fmt(receipt.totals.subtotalMinor)));
  if (receipt.totals.discountMinor > 0) {
    out.push(row("Discount", `-${fmt(receipt.totals.discountMinor)}`));
  }
  out.push(row("Tax", fmt(receipt.totals.taxMinor)));
  out.push(row("TOTAL", fmt(receipt.totals.totalMinor)));
  out.push(row(receipt.method.toUpperCase(), fmt(receipt.tenderedMinor)));
  if (receipt.changeMinor > 0) {
    out.push(row("Change", fmt(receipt.changeMinor)));
  }
  out.push("-".repeat(WIDTH));
  out.push("Thank you!");
  return out;
}
