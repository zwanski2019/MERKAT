/**
 * Add-stock dialog (CLAUDE.md §1.3). Adds stock as a signed ledger movement —
 * a restock (+), waste (−), or a count/adjustment — never by editing a stored
 * quantity. Targets the product or one of its variants.
 */
import { useState } from "react";
import {
  STOCK_ENTRY_REASONS,
  addStockSchema,
  type ProductListItem,
  type StockEntryReason,
} from "@merkat/core";
import { useInventory } from "../../state/inventory.js";
import { useSession } from "../../state/session.js";

// Reasons that reduce stock are entered as a positive qty with a negative sign.
const NEGATIVE: ReadonlySet<StockEntryReason> = new Set(["waste"]);

export function AddStockDialog({
  item,
  onClose,
}: {
  item: ProductListItem;
  onClose: () => void;
}): JSX.Element {
  const addStock = useInventory((s) => s.addStock);
  const locationId = useInventory((s) => s.locationId);
  const staffId = useSession((s) => s.session?.staff.id ?? null);

  const { product } = item;
  const [target, setTarget] = useState<string>(
    product.variants.length > 0
      ? `variant:${product.variants[0]!.id}`
      : "product",
  );
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState<StockEntryReason>("restock");
  const [error, setError] = useState<string | null>(null);

  function submit(): void {
    const magnitude = Number(qty);
    if (!Number.isInteger(magnitude) || magnitude <= 0) {
      setError("Enter a whole quantity greater than zero.");
      return;
    }
    const signed = NEGATIVE.has(reason) ? -magnitude : magnitude;
    const targetIds =
      target === "product"
        ? { productId: product.id }
        : { variantId: target.slice("variant:".length) };

    const parsed = addStockSchema.safeParse({
      ...targetIds,
      locationId,
      qty: signed,
      reason,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form.");
      return;
    }
    addStock(parsed.data, staffId);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-6">
      <div
        role="dialog"
        aria-label="Add stock"
        className="w-full max-w-sm rounded-[--radius-card] border border-border bg-surface p-6 shadow-xl"
      >
        <h2 className="mb-1 text-lg font-semibold text-fg">Add stock</h2>
        <p className="mb-4 text-sm text-muted">{product.name}</p>

        {product.variants.length > 0 ? (
          <label className="mb-4 block">
            <span className="mb-1 block text-sm text-fg">Variant</span>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="input"
            >
              <option value="product">Base product</option>
              {product.variants.map((v) => (
                <option key={v.id} value={`variant:${v.id}`}>
                  {Object.values(v.attributes).join(" / ") || v.sku || v.id}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm text-fg">Quantity</span>
            <input
              inputMode="numeric"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="input merkat-num"
              autoFocus
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-fg">Reason</span>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as StockEntryReason)}
              className="input capitalize"
            >
              {STOCK_ENTRY_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="mt-2 text-xs text-muted">
          {NEGATIVE.has(reason)
            ? "Recorded as a negative movement."
            : "Recorded as a positive movement."}
        </p>

        {error ? (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex gap-3">
          <button
            onClick={submit}
            className="rounded-[--radius-control] bg-accent px-4 py-2 font-medium text-white"
          >
            Add stock
          </button>
          <button
            onClick={onClose}
            className="rounded-[--radius-control] border border-border px-4 py-2 text-fg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
