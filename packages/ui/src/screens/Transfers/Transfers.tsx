/**
 * Stock transfers (CLAUDE.md §4, §1.3). Move stock between locations; each line
 * writes paired `transfer_out`/`transfer_in` movements through the ledger so net
 * stock is conserved. Shows live source/destination on-hand.
 */
import { useState } from "react";
import { buildTransferMovements, transferInputSchema, type TransferLine } from "@merkat/core";
import { useInventory } from "../../state/inventory.js";
import { useLocations } from "../../state/locations.js";
import { useSession } from "../../state/session.js";

export function Transfers(): JSX.Element {
  const locations = useLocations((s) => s.locations);
  const items = useInventory((s) => s.items);
  const applyMovements = useInventory((s) => s.applyMovements);
  const store = useInventory((s) => s.store);
  const staffId = useSession((s) => s.session?.staff.id ?? null);

  const [fromId, setFromId] = useState(locations[0]?.id ?? "");
  const [toId, setToId] = useState(locations[1]?.id ?? "");
  const [lines, setLines] = useState<TransferLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function addLine(productId: string): void {
    const item = items.find((i) => i.product.id === productId);
    if (!item || lines.some((l) => l.productId === productId)) return;
    setLines((ls) => [...ls, { productId, name: item.product.name, qty: 1 }]);
  }

  function setQty(productId: string, qty: number): void {
    setLines((ls) =>
      qty <= 0
        ? ls.filter((l) => l.productId !== productId)
        : ls.map((l) => (l.productId === productId ? { ...l, qty } : l)),
    );
  }

  function transfer(): void {
    setDone(false);
    const parsed = transferInputSchema.safeParse({
      fromLocationId: fromId,
      toLocationId: toId,
      lines,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the transfer.");
      return;
    }
    applyMovements(buildTransferMovements(parsed.data, { staffId }));
    setLines([]);
    setError(null);
    setDone(true);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold text-fg">Stock transfers</h1>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <label>
          <span className="mb-1 block text-sm text-muted">From</span>
          <select value={fromId} onChange={(e) => setFromId(e.target.value)} className="input">
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-sm text-muted">To</span>
          <select value={toId} onChange={(e) => setToId(e.target.value)} className="input">
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mb-3 block">
        <span className="mb-1 block text-sm text-muted">Add product</span>
        <select
          value=""
          onChange={(e) => e.target.value && addLine(e.target.value)}
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

      <div className="mb-4 overflow-x-auto rounded-[--radius-card] border border-border">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="bg-surface text-left text-muted">
              <th className="p-3 font-medium">Product</th>
              <th className="p-3 text-right font-medium">At source</th>
              <th className="p-3 text-right font-medium">At dest</th>
              <th className="p-3 text-right font-medium">Qty</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted">
                  Add products to transfer.
                </td>
              </tr>
            ) : (
              lines.map((line) => (
                <tr key={line.productId} className="border-t border-border">
                  <td className="p-3 text-fg">{line.name}</td>
                  <td className="merkat-num p-3 text-right text-muted">
                    {store.onHandAt(line.productId, fromId)}
                  </td>
                  <td className="merkat-num p-3 text-right text-muted">
                    {store.onHandAt(line.productId, toId)}
                  </td>
                  <td className="p-3 text-right">
                    <input
                      inputMode="numeric"
                      value={line.qty}
                      onChange={(e) => setQty(line.productId, Number(e.target.value) || 0)}
                      className="input merkat-num w-16 text-right"
                      aria-label={`Qty for ${line.name}`}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
      {done ? <p className="mb-3 text-sm text-accent">Transfer recorded ✓</p> : null}
      <button
        disabled={lines.length === 0}
        onClick={transfer}
        className="rounded-[--radius-control] bg-accent px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        Transfer stock
      </button>
    </div>
  );
}
