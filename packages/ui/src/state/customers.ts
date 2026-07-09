/**
 * Customers UI state (CLAUDE.md §2). Wraps a {@link CustomerStore}.
 */
import { create } from "zustand";
import type { Customer, CustomerInput } from "@merkat/core";
import { SeedCustomerStore, type CustomerStore } from "../customers/store.js";

export interface CustomersState {
  readonly store: CustomerStore;
  customers: Customer[];
  create(input: CustomerInput): void;
}

export function createCustomersStore(
  store: CustomerStore = new SeedCustomerStore(),
) {
  return create<CustomersState>((set, get) => ({
    store,
    customers: store.list(),
    create(input) {
      get().store.create(input);
      set({ customers: get().store.list() });
    },
  }));
}

export const useCustomers = createCustomersStore();
