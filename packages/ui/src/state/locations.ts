/**
 * Locations (CLAUDE.md §4 — a tenant may run multiple shops; stock/orders are
 * location-scoped). Seeded demo locations; the first matches the inventory
 * store's location so seeded stock lives there.
 */
import { create } from "zustand";
import type { StoreLocation } from "@merkat/core";

export interface LocationsState {
  readonly locations: StoreLocation[];
}

export const useLocations = create<LocationsState>(() => ({
  locations: [
    { id: "0191a000-0000-7000-8000-0000000000f0", name: "Downtown Store" },
    { id: "0191a000-0000-7000-8000-0000000000f1", name: "Warehouse" },
  ],
}));
