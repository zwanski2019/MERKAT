/**
 * Purchasing UI state (CLAUDE.md §2, §14). Wraps a {@link PurchasingStore};
 * receiving returns the PO lines so the screen applies them to inventory.
 */
import { create } from "zustand";
import type {
  PurchaseOrder,
  PurchaseOrderInput,
  PurchaseOrderLine,
  Supplier,
  SupplierInput,
} from "@merkat/core";
import {
  SeedPurchasingStore,
  type PurchasingStore,
} from "../purchasing/store.js";

export interface PurchasingState {
  readonly store: PurchasingStore;
  suppliers: Supplier[];
  orders: PurchaseOrder[];
  createSupplier(input: SupplierInput): void;
  createOrder(input: PurchaseOrderInput): void;
  receiveOrder(id: string): readonly PurchaseOrderLine[];
}

export function createPurchasingStore(
  store: PurchasingStore = new SeedPurchasingStore(),
) {
  return create<PurchasingState>((set, get) => ({
    store,
    suppliers: store.listSuppliers(),
    orders: store.listOrders(),
    createSupplier(input) {
      get().store.createSupplier(input);
      set({ suppliers: get().store.listSuppliers() });
    },
    createOrder(input) {
      get().store.createOrder(input);
      set({ orders: get().store.listOrders() });
    },
    receiveOrder(id) {
      const lines = get().store.receiveOrder(id);
      set({ orders: get().store.listOrders() });
      return lines;
    },
  }));
}

export const usePurchasing = createPurchasingStore();
