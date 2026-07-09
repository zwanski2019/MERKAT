/**
 * POS cart state (CLAUDE.md §2 — Zustand owns the POS cart/UI). Holds the live
 * cart lines; totals are computed from these via `computeTotals` at render time.
 * The charge flow (buildSale → ledger movements → receipt) lives in the POS
 * screen so it can compose inventory + hardware + session.
 */
import { create } from "zustand";
import type { CartLine } from "@merkat/core";

export interface CartAddition {
  readonly productId: string | null;
  readonly variantId: string | null;
  readonly name: string;
  readonly unitPriceMinor: number;
}

export interface PosState {
  lines: CartLine[];
  add(item: CartAddition): void;
  setQty(key: string, qty: number): void;
  removeLine(key: string): void;
  clear(): void;
}

function keyFor(item: CartAddition): string {
  return item.variantId ? `v:${item.variantId}` : `p:${item.productId}`;
}

export const usePos = create<PosState>((set) => ({
  lines: [],
  add(item) {
    const key = keyFor(item);
    set((s) => {
      const existing = s.lines.find((l) => l.key === key);
      if (existing) {
        return {
          lines: s.lines.map((l) =>
            l.key === key ? { ...l, qty: l.qty + 1 } : l,
          ),
        };
      }
      const line: CartLine = {
        key,
        productId: item.productId,
        variantId: item.variantId,
        name: item.name,
        unitPriceMinor: item.unitPriceMinor,
        qty: 1,
      };
      return { lines: [...s.lines, line] };
    });
  },
  setQty(key, qty) {
    set((s) => ({
      lines:
        qty <= 0
          ? s.lines.filter((l) => l.key !== key)
          : s.lines.map((l) => (l.key === key ? { ...l, qty } : l)),
    }));
  },
  removeLine(key) {
    set((s) => ({ lines: s.lines.filter((l) => l.key !== key) }));
  },
  clear() {
    set({ lines: [] });
  },
}));
