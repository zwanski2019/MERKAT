/**
 * Purchasing (CLAUDE.md §14): suppliers + purchase orders. Receiving a PO writes
 * `restock` movements through the inventory ledger (§1.3) — stock is never
 * edited directly.
 */
import { useMemo, useState } from "react";
import {
  formatMoney,
  money,
  poTotalMinor,
  purchaseOrderInputSchema,
  type PurchaseOrderLine,
} from "@merkat/core";
import { useInventory } from "../../state/inventory.js";
import { usePurchasing } from "../../state/purchasing.js";
import { useSession } from "../../state/session.js";

export function Purchases(): JSX.Element {
  const orders = usePurchasing((s) => s.orders);
  const suppliers = usePurchasing((s) => s.suppliers);
  const bills = usePurchasing((s) => s.bills);
  const markBillPaid = usePurchasing((s) => s.markBillPaid);
  const receiveOrder = usePurchasing((s) => s.receiveOrder);
  const addStock = useInventory((s) => s.addStock);
  const locationId = useInventory((s) => s.locationId);
  const staffId = useSession((s) => s.session?.staff.id ?? null);
  const branding = useSession((s) => s.branding);
  const [creating, setCreating] = useState(false);

  const fmt = (m: number): string =>
    formatMoney(money(m, branding.currency), branding.locale);

  function receive(id: string): void {
    const lines = receiveOrder(id);
    for (const line of lines) {
      addStock(
        {
          productId: line.productId,
          locationId,
          qty: line.qty,
          reason: "restock",
        },
        staffId,
      );
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-fg">Purchasing</h1>
          <p className="text-sm text-muted">
            {orders.length} orders · {suppliers.length} suppliers
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="rounded-[--radius-control] bg-accent px-4 py-2 font-medium text-white"
        >
          New purchase order
        </button>
      </div>

      {orders.length === 0 ? (
        <p className="text-sm text-muted">
          No purchase orders yet. Create one, then receive it to add stock.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[--radius-card] border border-border">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="bg-surface text-left text-muted">
                <th className="p-3 font-medium">PO</th>
                <th className="p-3 font-medium">Supplier</th>
                <th className="p-3 text-right font-medium">Items</th>
                <th className="p-3 text-right font-medium">Cost</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((po) => (
                <tr key={po.id} className="border-t border-border">
                  <td className="merkat-num p-3 text-fg">
                    #{po.id.slice(0, 8)}
                  </td>
                  <td className="p-3 text-fg">{po.supplierName}</td>
                  <td className="merkat-num p-3 text-right text-fg">
                    {po.lines.reduce((n, l) => n + l.qty, 0)}
                  </td>
                  <td className="merkat-num p-3 text-right text-fg">
                    {fmt(poTotalMinor(po.lines))}
                  </td>
                  <td className="p-3">
                    <span
                      className={[
                        "rounded-full border px-2.5 py-0.5 text-xs capitalize",
                        po.status === "received"
                          ? "border-accent text-accent"
                          : "border-border text-muted",
                      ].join(" ")}
                    >
                      {po.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      disabled={po.status === "received"}
                      onClick={() => receive(po.id)}
                      className="rounded-[--radius-control] border border-border px-3 py-1.5 text-sm text-fg hover:border-accent disabled:opacity-50"
                    >
                      {po.status === "received" ? "Received" : "Receive"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {bills.length > 0 ? (
        <div className="mt-8">
          <h2 className="mb-2 font-medium text-fg">Supplier bills</h2>
          <div className="divide-y divide-border rounded-[--radius-card] border border-border">
            {bills.map((bill) => (
              <div
                key={bill.id}
                className="flex items-center justify-between p-3 text-sm"
              >
                <span className="text-fg">
                  {bill.supplierName}
                  <span className="merkat-num ml-2 text-muted">
                    #{bill.purchaseOrderId.slice(0, 8)}
                  </span>
                </span>
                <div className="flex items-center gap-3">
                  <span className="merkat-num text-fg">
                    {fmt(bill.amountMinor)}
                  </span>
                  {bill.paid ? (
                    <span className="rounded-full border border-accent px-2.5 py-0.5 text-xs text-accent">
                      Paid
                    </span>
                  ) : (
                    <button
                      onClick={() => markBillPaid(bill.id)}
                      className="rounded-[--radius-control] border border-border px-3 py-1 text-xs text-fg hover:border-accent"
                    >
                      Mark paid
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {creating ? (
        <NewPurchaseOrder onClose={() => setCreating(false)} />
      ) : null}
    </div>
  );
}

function NewPurchaseOrder({ onClose }: { onClose: () => void }): JSX.Element {
  const suppliers = usePurchasing((s) => s.suppliers);
  const createOrder = usePurchasing((s) => s.createOrder);
  const items = useInventory((s) => s.items);
  const branding = useSession((s) => s.branding);
  const fmt = (m: number): string =>
    formatMoney(money(m, branding.currency), branding.locale);

  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [lines, setLines] = useState<PurchaseOrderLine[]>([]);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(() => poTotalMinor(lines), [lines]);

  function addLine(productId: string): void {
    const item = items.find((i) => i.product.id === productId);
    if (!item) return;
    setLines((ls) => [
      ...ls,
      {
        productId,
        name: item.product.name,
        qty: 1,
        unitCostMinor: item.product.costMinor ?? 0,
      },
    ]);
  }

  function setQty(i: number, qty: number): void {
    setLines((ls) =>
      qty <= 0
        ? ls.filter((_, j) => j !== i)
        : ls.map((l, j) => (j === i ? { ...l, qty } : l)),
    );
  }

  function submit(): void {
    const parsed = purchaseOrderInputSchema.safeParse({ supplierId, lines });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form.");
      return;
    }
    createOrder(parsed.data);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-black/30">
      <div
        role="dialog"
        aria-label="New purchase order"
        className="flex h-full w-full max-w-md flex-col bg-surface shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-semibold text-fg">New purchase order</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-muted hover:text-fg"
          >
            ✕
          </button>
        </div>

        <div className="border-b border-border p-4">
          <label className="mb-3 block">
            <span className="mb-1 block text-sm text-fg">Supplier</span>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="input"
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-fg">Add product</span>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) addLine(e.target.value);
              }}
              className="input"
            >
              <option value="">Choose a product…</option>
              {items.map((i) => (
                <option key={i.product.id} value={i.product.id}>
                  {i.product.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-2">
          {lines.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted">
              Add products to the order.
            </p>
          ) : (
            lines.map((line, i) => (
              <div key={i} className="flex items-center gap-2 p-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-fg">
                  {line.name}
                </span>
                <input
                  inputMode="numeric"
                  value={line.qty}
                  onChange={(e) => setQty(i, Number(e.target.value) || 0)}
                  className="input merkat-num w-16"
                  aria-label={`Quantity for ${line.name}`}
                />
                <span className="merkat-num w-20 text-right text-muted">
                  {fmt(line.unitCostMinor * line.qty)}
                </span>
              </div>
            ))
          )}
        </div>

        {error ? (
          <p role="alert" className="px-4 text-sm text-danger">
            {error}
          </p>
        ) : null}
        <div className="border-t border-border p-4">
          <div className="mb-3 flex justify-between font-semibold text-fg">
            <span>Total cost</span>
            <span className="merkat-num">{fmt(total)}</span>
          </div>
          <button
            onClick={submit}
            className="w-full rounded-[--radius-control] bg-accent py-2 font-medium text-white"
          >
            Create order
          </button>
        </div>
      </div>
    </div>
  );
}
