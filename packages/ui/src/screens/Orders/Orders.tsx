/**
 * Orders (CLAUDE.md §5): history + detail + refund/reprint. A refund is
 * append-only (§1.4) — it reverses the payment and returns stock to the ledger
 * (§1.3), marks the order refunded, and reprints a refund receipt.
 */
import { useState } from "react";
import { formatMoney, money, type SaleReceipt } from "@merkat/core";
import { useInventory } from "../../state/inventory.js";
import { useOrders } from "../../state/orders.js";
import { useSession } from "../../state/session.js";
import { ReceiptModal } from "../POS/ReceiptModal.js";
import { receiptFor, type OrderRecord } from "../../orders/store.js";

export function Orders(): JSX.Element {
  const orders = useOrders((s) => s.orders);
  const branding = useSession((s) => s.branding);
  const [selected, setSelected] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<SaleReceipt | null>(null);

  const fmt = (m: number): string =>
    formatMoney(money(m, branding.currency), branding.locale);
  const detail = selected
    ? orders.find((o) => o.order.id === selected)
    : undefined;

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-fg">Orders</h1>

      {orders.length === 0 ? (
        <p className="text-sm text-muted">
          No orders yet. Completed sales from the POS appear here.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[--radius-card] border border-border">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="bg-surface text-left text-muted">
                <th className="p-3 font-medium">Order</th>
                <th className="p-3 font-medium">Time</th>
                <th className="p-3 text-right font-medium">Items</th>
                <th className="p-3 text-right font-medium">Total</th>
                <th className="p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((record) => (
                <tr
                  key={record.order.id}
                  onClick={() => setSelected(record.order.id)}
                  className="cursor-pointer border-t border-border hover:bg-canvas"
                >
                  <td className="merkat-num p-3 text-fg">
                    #{record.order.id.slice(0, 8)}
                  </td>
                  <td className="p-3 text-muted">
                    {new Date(record.order.createdAt).toLocaleTimeString(
                      branding.locale,
                    )}
                  </td>
                  <td className="merkat-num p-3 text-right text-fg">
                    {record.lines.reduce((n, l) => n + l.qty, 0)}
                  </td>
                  <td className="merkat-num p-3 text-right text-fg">
                    {fmt(record.order.totalMinor)}
                  </td>
                  <td className="p-3">
                    <StatusPill status={record.order.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detail ? (
        <OrderDetail
          record={detail}
          onClose={() => setSelected(null)}
          onReceipt={setReceipt}
        />
      ) : null}
      {receipt ? (
        <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />
      ) : null}
    </div>
  );
}

function OrderDetail({
  record,
  onClose,
  onReceipt,
}: {
  record: OrderRecord;
  onClose: () => void;
  onReceipt: (r: SaleReceipt) => void;
}): JSX.Element {
  const branding = useSession((s) => s.branding);
  const staffId = useSession((s) => s.session?.staff.id ?? null);
  const refund = useOrders((s) => s.refund);
  const applyMovements = useInventory((s) => s.applyMovements);
  const [busy, setBusy] = useState(false);

  const fmt = (m: number): string =>
    formatMoney(money(m, branding.currency), branding.locale);
  const { order, lines } = record;
  const refunded = order.status === "refunded";

  function doRefund(): void {
    setBusy(true);
    const outcome = refund(order.id, branding, staffId);
    if (outcome) {
      applyMovements(outcome.refundMovements); // return stock via the ledger
      onClose();
      onReceipt(outcome.receipt);
    }
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-black/30">
      <div
        role="dialog"
        aria-label="Order detail"
        className="h-full w-full max-w-md overflow-y-auto bg-surface p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="merkat-num text-lg font-semibold text-fg">
              Order #{order.id.slice(0, 8)}
            </h2>
            <StatusPill status={order.status} />
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-muted hover:text-fg"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 divide-y divide-border rounded-[--radius-card] border border-border">
          {lines.map((l) => (
            <div key={l.id} className="flex justify-between p-3 text-sm">
              <span className="text-fg">
                {l.qty} × {l.name}
              </span>
              <span className="merkat-num text-fg">
                {fmt(l.lineTotalMinor)}
              </span>
            </div>
          ))}
        </div>

        <div className="mb-6 space-y-1">
          <Row label="Subtotal" value={fmt(order.subtotalMinor)} />
          <Row label="Tax" value={fmt(order.taxMinor)} />
          <Row label="Total" value={fmt(order.totalMinor)} strong />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => onReceipt(receiptFor(record, branding))}
            className="rounded-[--radius-control] border border-border px-4 py-2 text-fg"
          >
            Reprint
          </button>
          <button
            disabled={refunded || busy}
            onClick={doRefund}
            className="rounded-[--radius-control] bg-danger px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {refunded ? "Refunded" : "Refund"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }): JSX.Element {
  const refunded = status === "refunded";
  return (
    <span
      className={[
        "inline-block rounded-full border px-2.5 py-0.5 text-xs capitalize",
        refunded ? "border-warning text-warning" : "border-border text-muted",
      ].join(" ")}
    >
      {status}
    </span>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}): JSX.Element {
  return (
    <div className="flex justify-between">
      <span className={strong ? "font-semibold text-fg" : "text-sm text-muted"}>
        {label}
      </span>
      <span
        className={[
          "merkat-num",
          strong ? "font-semibold text-fg" : "text-sm text-fg",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}
