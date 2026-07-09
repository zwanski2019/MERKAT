/**
 * Table check (CLAUDE.md §5, Phase 7). Add menu items (with modifiers) to a
 * table's open check, send them to the kitchen (creates a KDS ticket), and
 * close the check as a cash sale — reusing the POS sale/receipt path (§4: an
 * order is both a retail sale and a restaurant check).
 */
import { useMemo, useState } from "react";
import {
  buildReceipt,
  buildSale,
  checkLineTotalMinor,
  checkToCartLines,
  computeTotals,
  formatMoney,
  money,
  newId,
  type CheckLineModifier,
  type MenuItem,
  type ModifierGroup,
  type SaleReceipt,
} from "@merkat/core";
import { getHardware } from "../../hardware/bridge.js";
import { useOrders } from "../../state/orders.js";
import { useRestaurant } from "../../state/restaurant.js";
import { useSession } from "../../state/session.js";
import { CashPaymentDialog } from "../POS/CashPaymentDialog.js";
import { ReceiptModal } from "../POS/ReceiptModal.js";

export function CheckPanel({
  tableId,
  onClose,
}: {
  tableId: string;
  onClose: () => void;
}): JSX.Element {
  const menuItems = useRestaurant((s) => s.menuItems);
  const modifierGroups = useRestaurant((s) => s.modifierGroups);
  const checks = useRestaurant((s) => s.checks);
  const tables = useRestaurant((s) => s.tables);
  const addToCheck = useRestaurant((s) => s.addToCheck);
  const setCheckQty = useRestaurant((s) => s.setCheckQty);
  const sendToKitchen = useRestaurant((s) => s.sendToKitchen);
  const closeCheck = useRestaurant((s) => s.closeCheck);
  const recordSale = useOrders((s) => s.recordSale);
  const branding = useSession((s) => s.branding);
  const staffId = useSession((s) => s.session?.staff.id ?? null);

  const [picking, setPicking] = useState<MenuItem | null>(null);
  const [paying, setPaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<SaleReceipt | null>(null);

  const lines = checks[tableId] ?? [];
  const table = tables.find((t) => t.id === tableId);
  const fmt = (m: number): string =>
    formatMoney(money(m, branding.currency), branding.locale);
  const totals = useMemo(
    () => computeTotals(checkToCartLines(lines), branding.taxConfig),
    [lines, branding.taxConfig],
  );

  function pick(item: MenuItem): void {
    if (item.modifierGroupIds.length > 0) {
      setPicking(item);
      return;
    }
    addToCheck(tableId, {
      key: newId(),
      itemId: item.id,
      name: item.name,
      unitPriceMinor: item.priceMinor,
      qty: 1,
      modifiers: [],
    });
  }

  async function completeClose(tenderedMinor: number): Promise<void> {
    setBusy(true);
    try {
      const sale = buildSale({
        tenantId: branding.id,
        locationId: branding.id, // single restaurant location (demo)
        staffId,
        lines: checkToCartLines(lines),
        taxConfig: branding.taxConfig,
        method: "cash",
        tenderedMinor,
      });
      recordSale(sale);
      closeCheck(tableId);
      const built = buildReceipt(
        sale,
        branding.name,
        branding.currency,
        branding.locale,
      );
      const hardware = getHardware();
      await hardware.openDrawer();
      await hardware.printReceipt({
        header: [{ text: branding.name, align: "center", bold: true }],
        lines: [],
        footer: [],
        cut: true,
      });
      setPaying(false);
      setReceipt(built);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-black/30">
      <div
        role="dialog"
        aria-label="Table check"
        className="flex h-full w-full max-w-md flex-col bg-surface shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-semibold text-fg">
            {table?.label ?? "Table"} · check
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-muted hover:text-fg"
          >
            ✕
          </button>
        </div>

        {/* menu */}
        <div className="border-b border-border p-3">
          <div className="grid grid-cols-2 gap-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => pick(item)}
                className="flex flex-col items-start rounded-[--radius-control] border border-border p-2 text-left text-sm hover:border-accent"
              >
                <span className="text-fg">{item.name}</span>
                <span className="merkat-num text-xs text-muted">
                  {fmt(item.priceMinor)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* current check */}
        <div className="min-h-0 flex-1 overflow-auto p-2">
          {lines.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted">
              Add items to start the check.
            </p>
          ) : (
            lines.map((line) => (
              <div
                key={line.key}
                className="flex items-center gap-2 rounded-[--radius-control] p-2 hover:bg-canvas"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-fg">{line.name}</div>
                  {line.modifiers.length > 0 ? (
                    <div className="truncate text-xs text-muted">
                      {line.modifiers.map((m) => m.name).join(", ")}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCheckQty(tableId, line.key, line.qty - 1)}
                    className="size-6 rounded-[--radius-control] border border-border text-fg"
                  >
                    −
                  </button>
                  <span className="merkat-num w-6 text-center text-sm text-fg">
                    {line.qty}
                  </span>
                  <button
                    onClick={() => setCheckQty(tableId, line.key, line.qty + 1)}
                    className="size-6 rounded-[--radius-control] border border-border text-fg"
                  >
                    +
                  </button>
                </div>
                <span className="merkat-num w-16 text-right text-sm text-fg">
                  {fmt(checkLineTotalMinor(line))}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border p-4">
          <div className="mb-3 flex justify-between font-semibold text-fg">
            <span>Total</span>
            <span className="merkat-num">{fmt(totals.totalMinor)}</span>
          </div>
          <div className="flex gap-2">
            <button
              disabled={lines.length === 0}
              onClick={() => sendToKitchen(tableId)}
              className="flex-1 rounded-[--radius-control] border border-border py-2 text-fg disabled:opacity-50"
            >
              Send to kitchen
            </button>
            <button
              disabled={lines.length === 0}
              onClick={() => setPaying(true)}
              className="flex-1 rounded-[--radius-control] bg-accent py-2 font-medium text-white disabled:opacity-50"
            >
              Close check
            </button>
          </div>
        </div>
      </div>

      {picking ? (
        <ModifierPicker
          item={picking}
          groups={modifierGroups}
          onAdd={(modifiers) => {
            addToCheck(tableId, {
              key: newId(),
              itemId: picking.id,
              name: picking.name,
              unitPriceMinor: picking.priceMinor,
              qty: 1,
              modifiers,
            });
            setPicking(null);
          }}
          onClose={() => setPicking(null)}
        />
      ) : null}
      {paying ? (
        <CashPaymentDialog
          totalMinor={totals.totalMinor}
          busy={busy}
          onConfirm={completeClose}
          onClose={() => setPaying(false)}
        />
      ) : null}
      {receipt ? (
        <ReceiptModal
          receipt={receipt}
          onClose={() => {
            setReceipt(null);
            onClose();
          }}
        />
      ) : null}
    </div>
  );
}

function ModifierPicker({
  item,
  groups,
  onAdd,
  onClose,
}: {
  item: MenuItem;
  groups: readonly ModifierGroup[];
  onAdd: (modifiers: CheckLineModifier[]) => void;
  onClose: () => void;
}): JSX.Element {
  const branding = useSession((s) => s.branding);
  const fmt = (m: number): string =>
    formatMoney(money(m, branding.currency), branding.locale);
  const itemGroups = groups.filter((g) => item.modifierGroupIds.includes(g.id));
  const [selected, setSelected] = useState<Record<string, Set<string>>>({});

  function toggle(group: ModifierGroup, modifierId: string): void {
    setSelected((prev) => {
      const current = new Set(prev[group.id] ?? []);
      const single = group.max <= 1;
      if (single) {
        current.clear();
        current.add(modifierId);
      } else if (current.has(modifierId)) {
        current.delete(modifierId);
      } else {
        current.add(modifierId);
      }
      return { ...prev, [group.id]: current };
    });
  }

  function confirm(): void {
    const mods: CheckLineModifier[] = [];
    for (const group of itemGroups) {
      for (const id of selected[group.id] ?? []) {
        const m = group.modifiers.find((x) => x.id === id);
        if (m) {
          mods.push({
            modifierId: m.id,
            name: m.name,
            priceDeltaMinor: m.priceDeltaMinor,
          });
        }
      }
    }
    onAdd(mods);
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-6">
      <div
        role="dialog"
        aria-label="Choose modifiers"
        className="w-full max-w-sm rounded-[--radius-card] border border-border bg-surface p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-fg">{item.name}</h2>
        {itemGroups.map((group) => (
          <div key={group.id} className="mb-4">
            <div className="mb-1 text-sm font-medium text-fg">
              {group.name}
              {group.required ? <span className="text-danger"> *</span> : null}
            </div>
            <div className="flex flex-col gap-1">
              {group.modifiers.map((m) => {
                const on = selected[group.id]?.has(m.id) ?? false;
                return (
                  <button
                    key={m.id}
                    onClick={() => toggle(group, m.id)}
                    className={[
                      "flex items-center justify-between rounded-[--radius-control] border px-3 py-2 text-sm",
                      on ? "border-accent text-fg" : "border-border text-muted",
                    ].join(" ")}
                  >
                    <span>{m.name}</span>
                    <span className="merkat-num">
                      {m.priceDeltaMinor > 0
                        ? `+${fmt(m.priceDeltaMinor)}`
                        : "—"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <div className="flex gap-3">
          <button
            onClick={confirm}
            className="flex-1 rounded-[--radius-control] bg-accent py-2 font-medium text-white"
          >
            Add to check
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
