/**
 * Inventory UI state (CLAUDE.md §2). Wraps an {@link InventoryStore} and keeps
 * a derived product list in Zustand so screens re-render on every ledger write.
 * (No server cache yet — TanStack Query arrives with real data endpoints in
 * Phase 5/6; local-first data is Zustand for now.)
 */
import { create } from "zustand";
import type {
  AddStockInput,
  ProductInput,
  ProductListItem,
  StockMovement,
} from "@merkat/core";
import { SeedInventoryStore, type InventoryStore } from "../inventory/store.js";

export interface InventoryState {
  readonly store: InventoryStore;
  readonly locationId: string;
  items: ProductListItem[];
  createProduct(input: ProductInput): void;
  addStock(input: AddStockInput, staffId?: string | null): void;
  /** Apply sale (or other) movements and refresh derived levels. */
  applyMovements(movements: readonly StockMovement[]): void;
  refresh(): void;
}

export function createInventoryStore(
  store: InventoryStore = new SeedInventoryStore(),
) {
  return create<InventoryState>((set, get) => ({
    store,
    locationId: store.locationId,
    items: store.listProducts(),
    createProduct(input) {
      get().store.createProduct(input);
      set({ items: get().store.listProducts() });
    },
    addStock(input, staffId) {
      get().store.addStock(input, staffId ?? null);
      set({ items: get().store.listProducts() });
    },
    applyMovements(movements) {
      get().store.applyMovements(movements);
      set({ items: get().store.listProducts() });
    },
    refresh() {
      set({ items: get().store.listProducts() });
    },
  }));
}

/** App-wide inventory store (in-memory seed for now). */
export const useInventory = createInventoryStore();
