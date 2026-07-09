/**
 * Receipt OCR stock-in (CLAUDE.md §9, Phase 8). The AI reads a supplier receipt
 * into a DRAFT; nothing is written until the operator confirms. On confirm, each
 * matched product gets a `restock` movement through the ledger (§1.3) — the AI
 * tool itself never mutates stock.
 */
import { useMemo, useState } from "react";
import { readReceiptDraft } from "../../ai/assistant.js";
import { useInventory } from "../../state/inventory.js";
import { useSession } from "../../state/session.js";

interface DraftRow {
  readonly name: string;
  readonly qty: number;
  readonly productId: string | null; // matched product, or null (unmatched)
}

export function ReceiptStockIn({
  onClose,
}: {
  onClose: () => void;
}): JSX.Element {
  const items = useInventory((s) => s.items);
  const addStock = useInventory((s) => s.addStock);
  const locationId = useInventory((s) => s.locationId);
  const staffId = useSession((s) => s.session?.staff.id ?? null);
  const [applied, setApplied] = useState(false);

  // The draft is advisory until confirmed (§9).
  const draft = useMemo<DraftRow[]>(() => {
    return readReceiptDraft("data:image/png;base64,DEMO").map((d) => {
      const match = items.find(
        (i) => i.product.name.toLowerCase() === d.name.toLowerCase(),
      );
      return { name: d.name, qty: d.qty, productId: match?.product.id ?? null };
    });
  }, [items]);

  const applicable = draft.filter((d) => d.productId);

  function confirm(): void {
    for (const row of applicable) {
      addStock(
        {
          productId: row.productId!,
          locationId,
          qty: row.qty,
          reason: "restock",
        },
        staffId,
      );
    }
    setApplied(true);
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-6">
      <div
        role="dialog"
        aria-label="Receipt stock-in"
        className="w-full max-w-md rounded-[--radius-card] border border-border bg-surface p-6 shadow-xl"
      >
        <div className="mb-1 flex items-center gap-2">
          <span className="text-accent">✦</span>
          <h2 className="text-lg font-semibold text-fg">
            Stock in from receipt
          </h2>
        </div>
        <p className="mb-4 text-sm text-muted">
          The assistant read this draft. Review it — nothing is added until you
          confirm.
        </p>

        <div className="mb-4 divide-y divide-border rounded-[--radius-control] border border-border">
          {draft.map((row, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 text-sm"
            >
              <span className="text-fg">
                {row.name}
                {!row.productId ? (
                  <span className="ml-2 text-xs text-warning">
                    no matching product
                  </span>
                ) : null}
              </span>
              <span className="merkat-num text-fg">+{row.qty}</span>
            </div>
          ))}
        </div>

        {applied ? (
          <p className="mb-4 text-sm text-accent">
            Added stock for {applicable.length} products ✓
          </p>
        ) : null}

        <div className="flex gap-3">
          {applied ? (
            <button
              onClick={onClose}
              className="flex-1 rounded-[--radius-control] bg-accent py-2 font-medium text-white"
            >
              Done
            </button>
          ) : (
            <>
              <button
                disabled={applicable.length === 0}
                onClick={confirm}
                className="flex-1 rounded-[--radius-control] bg-accent py-2 font-medium text-white disabled:opacity-50"
              >
                Confirm & add stock
              </button>
              <button
                onClick={onClose}
                className="rounded-[--radius-control] border border-border px-4 py-2 text-fg"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
