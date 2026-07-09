/**
 * Point of sale (CLAUDE.md §5, Phase 4). Product grid + live cart + Charge.
 * A full cash sale completes offline: buildSale mints the order + payment +
 * signed `sale` movements (§1.3, §1.4), inventory decrements through the ledger,
 * the drawer kicks, and the receipt prints (or previews, §7).
 */
import { useMemo, useState } from "react";
import {
  buildReceipt,
  buildSale,
  computeTotals,
  formatMoney,
  money,
  renderReceiptText,
  type Product,
  type ProductListItem,
  type SaleReceipt,
} from "@merkat/core";
import { getHardware } from "../../hardware/bridge.js";
import { useBarcodeScanner } from "../../hardware/useBarcodeScanner.js";
import { useInventory } from "../../state/inventory.js";
import { usePos, type CartAddition } from "../../state/pos.js";
import { useSession } from "../../state/session.js";
import { CashPaymentDialog } from "./CashPaymentDialog.js";
import { ReceiptModal } from "./ReceiptModal.js";

export function POS(): JSX.Element {
  const items = useInventory((s) => s.items);
  const applyMovements = useInventory((s) => s.applyMovements);
  const locationId = useInventory((s) => s.locationId);
  const lines = usePos((s) => s.lines);
  const add = usePos((s) => s.add);
  const setQty = usePos((s) => s.setQty);
  const clear = usePos((s) => s.clear);
  const branding = useSession((s) => s.branding);
  const staffId = useSession((s) => s.session?.staff.id ?? null);

  const [query, setQuery] = useState("");
  const [pickVariantFor, setPickVariantFor] = useState<Product | null>(null);
  const [paying, setPaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<SaleReceipt | null>(null);
  const [scanMsg, setScanMsg] = useState<string | null>(null);

  const fmt = (m: number): string =>
    formatMoney(money(m, branding.currency), branding.locale);
  const totals = computeTotals(lines, branding.taxConfig);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(({ product }) =>
      product.name.toLowerCase().includes(q),
    );
  }, [items, query]);

  function addProduct(item: ProductListItem): void {
    if (item.product.variants.length > 0) {
      setPickVariantFor(item.product);
      return;
    }
    add({
      productId: item.product.id,
      variantId: null,
      name: item.product.name,
      unitPriceMinor: item.product.priceMinor,
    });
  }

  function handleScan(code: string): void {
    const found = findByCode(items, code);
    if (found) {
      add(found);
      setScanMsg(null);
    } else {
      setScanMsg(`No product for “${code}”.`);
    }
  }
  useBarcodeScanner(handleScan);

  async function completeSale(tenderedMinor: number): Promise<void> {
    setBusy(true);
    try {
      const sale = buildSale({
        tenantId: branding.id,
        locationId,
        staffId,
        lines,
        taxConfig: branding.taxConfig,
        method: "cash",
        tenderedMinor,
      });
      // Decrement stock through the ledger (§1.3), then kick drawer + print.
      applyMovements(sale.movements);
      const hardware = getHardware();
      await hardware.openDrawer();
      const built = buildReceipt(
        sale,
        branding.name,
        branding.currency,
        branding.locale,
      );
      await hardware.printReceipt({
        header: [{ text: branding.name, align: "center", bold: true }],
        lines: renderReceiptText(built)
          .slice(1)
          .map((text) => ({ text })),
        footer: [],
        cut: true,
      });
      clear();
      setPaying(false);
      setReceipt(built);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 lg:flex-row">
      {/* Catalogue */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-3 flex items-center gap-3">
          <input
            placeholder="Search or scan a barcode…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && query.trim()) {
                handleScan(query.trim());
                setQuery("");
              }
            }}
            className="input max-w-sm"
          />
          <span className="whitespace-nowrap rounded-full border border-border px-2.5 py-1 text-xs text-muted">
            Works offline
          </span>
        </div>
        {scanMsg ? (
          <p className="mb-2 text-sm text-warning">{scanMsg}</p>
        ) : null}
        <div className="grid grid-cols-2 gap-3 overflow-auto sm:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => (
            <button
              key={item.product.id}
              onClick={() => addProduct(item)}
              className="flex flex-col items-start gap-1 rounded-[--radius-card] border border-border bg-surface p-3 text-left hover:border-accent"
            >
              <span className="font-medium text-fg">{item.product.name}</span>
              <span className="merkat-num text-sm text-muted">
                {item.product.variants.length > 0
                  ? "choose variant"
                  : fmt(item.product.priceMinor)}
              </span>
              <span className="merkat-num mt-1 text-xs text-muted">
                {item.onHand} in stock
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Cart */}
      <aside className="flex w-full flex-col rounded-[--radius-card] border border-border bg-surface lg:w-80">
        <div className="border-b border-border p-4 font-semibold text-fg">
          Cart
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-2">
          {lines.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted">
              Tap a product or scan to start a sale.
            </p>
          ) : (
            lines.map((line) => (
              <div
                key={line.key}
                className="flex items-center gap-2 rounded-[--radius-control] p-2 hover:bg-canvas"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-fg">{line.name}</div>
                  <div className="merkat-num text-xs text-muted">
                    {fmt(line.unitPriceMinor)}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Stepper
                    label="−"
                    onClick={() => setQty(line.key, line.qty - 1)}
                  />
                  <span className="merkat-num w-6 text-center text-sm text-fg">
                    {line.qty}
                  </span>
                  <Stepper
                    label="+"
                    onClick={() => setQty(line.key, line.qty + 1)}
                  />
                </div>
                <div className="merkat-num w-16 text-right text-sm text-fg">
                  {fmt(line.unitPriceMinor * line.qty)}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="border-t border-border p-4">
          <Row label="Subtotal" value={fmt(totals.subtotalMinor)} />
          <Row label="Tax" value={fmt(totals.taxMinor)} />
          <Row label="Total" value={fmt(totals.totalMinor)} strong />
          <button
            disabled={lines.length === 0}
            onClick={() => setPaying(true)}
            className="mt-3 w-full rounded-[--radius-control] bg-accent py-2.5 font-medium text-white disabled:opacity-50"
          >
            Charge {fmt(totals.totalMinor)}
          </button>
        </div>
      </aside>

      {pickVariantFor ? (
        <VariantPicker
          product={pickVariantFor}
          onPick={(addition) => {
            add(addition);
            setPickVariantFor(null);
          }}
          onClose={() => setPickVariantFor(null)}
        />
      ) : null}
      {paying ? (
        <CashPaymentDialog
          totalMinor={totals.totalMinor}
          busy={busy}
          onConfirm={completeSale}
          onClose={() => setPaying(false)}
        />
      ) : null}
      {receipt ? (
        <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />
      ) : null}
    </div>
  );
}

function Stepper({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className="size-6 rounded-[--radius-control] border border-border text-fg hover:border-accent"
    >
      {label}
    </button>
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
    <div className="flex items-center justify-between py-0.5">
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

function VariantPicker({
  product,
  onPick,
  onClose,
}: {
  product: Product;
  onPick: (addition: CartAddition) => void;
  onClose: () => void;
}): JSX.Element {
  const branding = useSession((s) => s.branding);
  const fmt = (m: number): string =>
    formatMoney(money(m, branding.currency), branding.locale);
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-6">
      <div
        role="dialog"
        aria-label="Choose variant"
        className="w-full max-w-sm rounded-[--radius-card] border border-border bg-surface p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-fg">{product.name}</h2>
        <div className="flex flex-col gap-2">
          {product.variants.map((v) => {
            const price = v.priceMinor ?? product.priceMinor;
            return (
              <button
                key={v.id}
                onClick={() =>
                  onPick({
                    productId: null,
                    variantId: v.id,
                    name: `${product.name} · ${Object.values(v.attributes).join(" ")}`,
                    unitPriceMinor: price,
                  })
                }
                className="flex items-center justify-between rounded-[--radius-control] border border-border px-3 py-2 text-fg hover:border-accent"
              >
                <span>{Object.values(v.attributes).join(" / ") || v.sku}</span>
                <span className="merkat-num text-sm text-muted">
                  {fmt(price)}
                </span>
              </button>
            );
          })}
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full rounded-[--radius-control] border border-border py-2 text-fg"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function findByCode(
  items: readonly ProductListItem[],
  code: string,
): CartAddition | null {
  const c = code.trim().toLowerCase();
  const matches = (v: string | null): boolean => v?.toLowerCase() === c;
  for (const { product } of items) {
    for (const v of product.variants) {
      if (matches(v.sku) || matches(v.barcode)) {
        return {
          productId: null,
          variantId: v.id,
          name: `${product.name} · ${Object.values(v.attributes).join(" ")}`,
          unitPriceMinor: v.priceMinor ?? product.priceMinor,
        };
      }
    }
    if (
      product.variants.length === 0 &&
      (matches(product.sku) || matches(product.barcode))
    ) {
      return {
        productId: product.id,
        variantId: null,
        name: product.name,
        unitPriceMinor: product.priceMinor,
      };
    }
  }
  return null;
}
