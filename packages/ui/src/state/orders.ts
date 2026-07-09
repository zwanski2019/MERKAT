/**
 * Orders UI state (CLAUDE.md §2). Wraps an {@link OrderStore}; POS records sales
 * here, the Orders screen lists/refunds. Refund returns the reversing movements
 * so the caller can apply them to inventory (keeps stores decoupled).
 */
import { create } from "zustand";
import type { Sale, TenantBranding } from "@merkat/core";
import {
  SeedOrderStore,
  type OrderRecord,
  type OrderStore,
  type RefundOutcome,
} from "../orders/store.js";

export interface OrdersState {
  readonly store: OrderStore;
  orders: OrderRecord[];
  recordSale(sale: Sale): void;
  refund(
    id: string,
    branding: TenantBranding,
    staffId?: string | null,
  ): RefundOutcome | null;
}

export function createOrdersStore(store: OrderStore = new SeedOrderStore()) {
  return create<OrdersState>((set, get) => ({
    store,
    orders: store.listOrders(),
    recordSale(sale) {
      get().store.recordSale(sale);
      set({ orders: get().store.listOrders() });
    },
    refund(id, branding, staffId) {
      const outcome = get().store.refund(id, branding, staffId ?? null);
      set({ orders: get().store.listOrders() });
      return outcome;
    },
  }));
}

export const useOrders = createOrdersStore();
