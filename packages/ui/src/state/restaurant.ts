/**
 * Restaurant vertical state (CLAUDE.md §5, Phase 7): floor plan, menu, open
 * checks, and kitchen tickets. Local UI state (Zustand, §2); the synced SQLite
 * tables (§4) back it later. `createRestaurantStore` gives isolated stores for
 * tests; `useRestaurant` is the app singleton.
 */
import { create } from "zustand";
import {
  groupByStation,
  newId,
  type CheckLine,
  type Combo,
  type FloorZone,
  type KitchenTicket,
  type MenuCategory,
  type MenuItem,
  type ModifierGroup,
  type Table,
} from "@merkat/core";

export interface RestaurantState {
  readonly zones: FloorZone[];
  tables: Table[];
  readonly categories: MenuCategory[];
  menuItems: MenuItem[];
  modifierGroups: ModifierGroup[];
  combos: Combo[];
  checks: Record<string, CheckLine[]>;
  tickets: KitchenTicket[];

  seatTable(tableId: string): void;
  moveTable(tableId: string, x: number, y: number): void;
  addToCheck(tableId: string, line: CheckLine): void;
  setCheckQty(tableId: string, key: string, qty: number): void;
  sendToKitchen(tableId: string): void;
  bumpTicket(ticketId: string): void;
  /** Free the table and clear its check; returns the lines for sale building. */
  closeCheck(tableId: string): CheckLine[];
  addModifierGroup(group: ModifierGroup): void;
  addMenuItem(item: MenuItem): void;
  addCombo(combo: Omit<Combo, "id">): void;
}

function seed(): Pick<
  RestaurantState,
  "zones" | "tables" | "categories" | "menuItems" | "modifierGroups" | "combos"
> {
  const main = "0191a000-0000-7000-8000-0000000000z1";
  const terrace = "0191a000-0000-7000-8000-0000000000z2";
  const mains = "0191a000-0000-7000-8000-0000000000k1";
  const sides = "0191a000-0000-7000-8000-0000000000k2";
  const drinks = "0191a000-0000-7000-8000-0000000000k3";
  const sizeGroup = "0191a000-0000-7000-8000-0000000000g1";
  const addonGroup = "0191a000-0000-7000-8000-0000000000g2";
  const burger = "0191a000-0000-7000-8000-0000000000i1";

  const tables: Table[] = [
    {
      id: "t1",
      zoneId: main,
      label: "T1",
      seats: 4,
      x: 40,
      y: 40,
      shape: "round",
      status: "open",
    },
    {
      id: "t2",
      zoneId: main,
      label: "T2",
      seats: 2,
      x: 160,
      y: 40,
      shape: "square",
      status: "open",
    },
    {
      id: "t3",
      zoneId: main,
      label: "T3",
      seats: 4,
      x: 280,
      y: 40,
      shape: "round",
      status: "open",
    },
    {
      id: "t4",
      zoneId: terrace,
      label: "T4",
      seats: 6,
      x: 40,
      y: 170,
      shape: "square",
      status: "open",
    },
    {
      id: "t5",
      zoneId: terrace,
      label: "T5",
      seats: 2,
      x: 160,
      y: 170,
      shape: "round",
      status: "open",
    },
    {
      id: "t6",
      zoneId: terrace,
      label: "T6",
      seats: 4,
      x: 280,
      y: 170,
      shape: "round",
      status: "open",
    },
  ];

  const modifierGroups: ModifierGroup[] = [
    {
      id: sizeGroup,
      name: "Choose size",
      min: 1,
      max: 1,
      required: true,
      modifiers: [
        {
          id: "mod-single",
          groupId: sizeGroup,
          name: "Single",
          priceDeltaMinor: 0,
        },
        {
          id: "mod-double",
          groupId: sizeGroup,
          name: "Double",
          priceDeltaMinor: 300,
        },
      ],
    },
    {
      id: addonGroup,
      name: "Add-ons",
      min: 0,
      max: 2,
      required: false,
      modifiers: [
        {
          id: "mod-cheese",
          groupId: addonGroup,
          name: "Cheese",
          priceDeltaMinor: 100,
        },
        {
          id: "mod-bacon",
          groupId: addonGroup,
          name: "Bacon",
          priceDeltaMinor: 200,
        },
      ],
    },
  ];

  const menuItems: MenuItem[] = [
    {
      id: burger,
      categoryId: mains,
      name: "Classic Burger",
      priceMinor: 1450,
      modifierGroupIds: [sizeGroup, addonGroup],
      station: "grill",
    },
    {
      id: "item-salad",
      categoryId: mains,
      name: "Garden Salad",
      priceMinor: 900,
      modifierGroupIds: [],
      station: "cold",
    },
    {
      id: "item-fries",
      categoryId: sides,
      name: "Fries",
      priceMinor: 500,
      modifierGroupIds: [],
      station: "grill",
    },
    {
      id: "item-cola",
      categoryId: drinks,
      name: "Cola",
      priceMinor: 300,
      modifierGroupIds: [],
      station: "bar",
    },
  ];

  const combos: Combo[] = [
    {
      id: "combo-meal",
      name: "Burger Meal",
      priceMinor: 1900,
      itemIds: [burger, "item-fries", "item-cola"],
    },
  ];

  return {
    zones: [
      { id: main, name: "Main" },
      { id: terrace, name: "Terrace" },
    ],
    tables,
    categories: [
      { id: mains, name: "Mains" },
      { id: sides, name: "Sides" },
      { id: drinks, name: "Drinks" },
    ],
    menuItems,
    modifierGroups,
    combos,
  };
}

export function createRestaurantStore() {
  return create<RestaurantState>((set, get) => ({
    ...seed(),
    checks: {},
    tickets: [],

    seatTable(tableId) {
      set((s) => ({
        tables: setStatus(s.tables, tableId, "occupied"),
        checks: { ...s.checks, [tableId]: s.checks[tableId] ?? [] },
      }));
    },

    moveTable(tableId, x, y) {
      set((s) => ({
        tables: s.tables.map((t) => (t.id === tableId ? { ...t, x, y } : t)),
      }));
    },

    addToCheck(tableId, line) {
      set((s) => ({
        checks: {
          ...s.checks,
          [tableId]: [...(s.checks[tableId] ?? []), line],
        },
      }));
    },

    setCheckQty(tableId, key, qty) {
      set((s) => {
        const lines = s.checks[tableId] ?? [];
        const next =
          qty <= 0
            ? lines.filter((l) => l.key !== key)
            : lines.map((l) => (l.key === key ? { ...l, qty } : l));
        return { checks: { ...s.checks, [tableId]: next } };
      });
    },

    sendToKitchen(tableId) {
      const state = get();
      const lines = state.checks[tableId] ?? [];
      if (lines.length === 0) return;
      const table = state.tables.find((t) => t.id === tableId);
      const now = Date.now();
      // One ticket per kitchen station (KDS routing, §5).
      const tickets: KitchenTicket[] = [];
      for (const [station, group] of groupByStation(lines)) {
        tickets.push({
          id: newId(),
          orderId: null,
          tableLabel: table?.label ?? tableId,
          station,
          status: "new",
          sentAt: now,
          bumpedAt: null,
          items: group.map((l) => ({
            name: l.name,
            qty: l.qty,
            modifiers: l.modifiers.map((m) => m.name),
            note: l.note ?? null,
          })),
        });
      }
      set((s) => ({
        tickets: [...tickets, ...s.tickets],
        tables: setStatus(s.tables, tableId, "occupied"),
      }));
    },

    bumpTicket(ticketId) {
      set((s) => ({
        tickets: s.tickets.map((t) =>
          t.id === ticketId
            ? { ...t, status: "bumped", bumpedAt: Date.now() }
            : t,
        ),
      }));
    },

    closeCheck(tableId) {
      const lines = get().checks[tableId] ?? [];
      set((s) => {
        const nextChecks = { ...s.checks };
        delete nextChecks[tableId];
        return {
          checks: nextChecks,
          tables: setStatus(s.tables, tableId, "open"),
        };
      });
      return lines;
    },

    addModifierGroup(group) {
      set((s) => ({ modifierGroups: [...s.modifierGroups, group] }));
    },

    addMenuItem(item) {
      set((s) => ({ menuItems: [...s.menuItems, item] }));
    },

    addCombo(combo) {
      set((s) => ({ combos: [...s.combos, { id: newId(), ...combo }] }));
    },
  }));
}

function setStatus(
  tables: Table[],
  tableId: string,
  status: Table["status"],
): Table[] {
  return tables.map((t) => (t.id === tableId ? { ...t, status } : t));
}

export const useRestaurant = createRestaurantStore();
