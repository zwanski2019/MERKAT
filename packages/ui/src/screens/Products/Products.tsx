/**
 * Products + inventory (CLAUDE.md §5, Phase 3). Product table with derived
 * on-hand levels and low-stock pills; the slide-over adds products (+ variants),
 * and stock is added as ledger movements (§1.3) — never an edited quantity.
 */
import { useMemo, useState, type ReactNode } from "react";
import { formatMoney, money, type ProductListItem } from "@merkat/core";
import { useInventory } from "../../state/inventory.js";
import { useSession } from "../../state/session.js";
import { AddProductSlideOver } from "./AddProductSlideOver.js";
import { AddStockDialog } from "./AddStockDialog.js";
import { ReceiptStockIn } from "./ReceiptStockIn.js";

export function Products(): JSX.Element {
  const items = useInventory((s) => s.items);
  const branding = useSession((s) => s.branding);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [stockFor, setStockFor] = useState<ProductListItem | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      ({ product }) =>
        product.name.toLowerCase().includes(q) ||
        (product.sku?.toLowerCase().includes(q) ?? false),
    );
  }, [items, query]);

  const lowCount = items.filter((i) => i.lowStock).length;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-fg">Products</h1>
          <p className="text-sm text-muted">
            {items.length} products
            {lowCount > 0 ? ` · ${lowCount} low on stock` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setScanning(true)}
            className="rounded-[--radius-control] border border-border px-4 py-2 font-medium text-fg hover:border-accent"
          >
            ✦ Scan receipt
          </button>
          <button
            onClick={() => setAdding(true)}
            className="rounded-[--radius-control] bg-accent px-4 py-2 font-medium text-white"
          >
            Add product
          </button>
        </div>
      </div>

      <input
        placeholder="Search products or SKU…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-4 w-full max-w-sm rounded-[--radius-control] border border-border bg-canvas px-3 py-2 text-sm text-fg"
      />

      <div className="overflow-x-auto rounded-[--radius-card] border border-border">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="bg-surface text-left text-muted">
              <Th>Product</Th>
              <Th>SKU</Th>
              <Th className="text-right">Price</Th>
              <Th className="text-right">On hand</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted">
                  No products{query ? " match your search" : " yet"}.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <ProductRow
                  key={item.product.id}
                  item={item}
                  currency={branding.currency}
                  locale={branding.locale}
                  onAddStock={() => setStockFor(item)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {adding ? <AddProductSlideOver onClose={() => setAdding(false)} /> : null}
      {scanning ? <ReceiptStockIn onClose={() => setScanning(false)} /> : null}
      {stockFor ? (
        <AddStockDialog item={stockFor} onClose={() => setStockFor(null)} />
      ) : null}
    </div>
  );
}

function ProductRow({
  item,
  currency,
  locale,
  onAddStock,
}: {
  item: ProductListItem;
  currency: string;
  locale: string;
  onAddStock: () => void;
}): JSX.Element {
  const { product, onHand, lowStock } = item;
  return (
    <tr className="border-t border-border">
      <td className="p-3">
        <div className="font-medium text-fg">{product.name}</div>
        {product.variants.length > 0 ? (
          <div className="text-xs text-muted">
            {product.variants.length} variants
          </div>
        ) : null}
      </td>
      <td className="merkat-num p-3 text-muted">{product.sku ?? "—"}</td>
      <td className="merkat-num p-3 text-right text-fg">
        {formatMoney(money(product.priceMinor, currency), locale)}
      </td>
      <td className="p-3 text-right">
        <StockPill onHand={onHand} lowStock={lowStock} />
      </td>
      <td className="p-3 text-right">
        <button
          onClick={onAddStock}
          className="rounded-[--radius-control] border border-border px-3 py-1.5 text-sm text-fg hover:border-accent"
        >
          Add stock
        </button>
      </td>
    </tr>
  );
}

function StockPill({
  onHand,
  lowStock,
}: {
  onHand: number;
  lowStock: boolean;
}): JSX.Element {
  return (
    <span
      className={[
        "merkat-num inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs",
        lowStock ? "border-warning text-warning" : "border-border text-muted",
      ].join(" ")}
      title={lowStock ? "Low on stock" : undefined}
    >
      {lowStock ? "▲ " : ""}
      {onHand}
    </span>
  );
}

function Th({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <th className={["p-3 font-medium", className ?? ""].join(" ")}>
      {children}
    </th>
  );
}
