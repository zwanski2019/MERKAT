/**
 * Restaurant vertical domain (CLAUDE.md §4, §5, Phase 7). Floor plan tables,
 * menu modifier groups, and kitchen tickets. Empty for retail tenants — the UI
 * gates these behind `featuresFor(businessType)` (§4). Pure types + helpers;
 * a check is just an open order (§4 "orders works as a retail sale *and* a
 * restaurant check").
 */
import type { CartLine } from "./sale.js";

export const TABLE_STATUSES = [
  "open",
  "occupied",
  "check",
  "reserved",
] as const;
export type TableStatus = (typeof TABLE_STATUSES)[number];

export const KITCHEN_STATIONS = ["grill", "cold", "bar", "all"] as const;
export type KitchenStation = (typeof KITCHEN_STATIONS)[number];

export const KITCHEN_STATUSES = ["new", "preparing", "done", "bumped"] as const;
export type KitchenStatus = (typeof KITCHEN_STATUSES)[number];

export interface FloorZone {
  readonly id: string;
  readonly name: string;
}

export interface Table {
  readonly id: string;
  readonly zoneId: string;
  readonly label: string;
  readonly seats: number;
  readonly x: number;
  readonly y: number;
  readonly shape: "round" | "square";
  readonly status: TableStatus;
}

export interface Modifier {
  readonly id: string;
  readonly groupId: string;
  readonly name: string;
  readonly priceDeltaMinor: number;
}

export interface ModifierGroup {
  readonly id: string;
  readonly name: string;
  readonly min: number;
  readonly max: number;
  readonly required: boolean;
  readonly modifiers: readonly Modifier[];
}

export interface MenuItem {
  readonly id: string;
  readonly categoryId: string;
  readonly name: string;
  readonly priceMinor: number;
  /** Modifier groups offered when this item is ordered. */
  readonly modifierGroupIds: readonly string[];
}

export interface MenuCategory {
  readonly id: string;
  readonly name: string;
}

export interface CheckLineModifier {
  readonly modifierId: string;
  readonly name: string;
  readonly priceDeltaMinor: number;
}

export interface CheckLine {
  readonly key: string;
  readonly itemId: string;
  readonly name: string;
  readonly unitPriceMinor: number; // base price
  readonly qty: number;
  readonly modifiers: readonly CheckLineModifier[];
  readonly note?: string | null;
}

export interface KitchenTicketItem {
  readonly name: string;
  readonly qty: number;
  readonly modifiers: readonly string[];
  readonly note?: string | null;
}

export interface KitchenTicket {
  readonly id: string;
  readonly orderId: string | null;
  readonly tableLabel: string;
  readonly station: KitchenStation;
  readonly status: KitchenStatus;
  readonly sentAt: number;
  readonly bumpedAt: number | null;
  readonly items: readonly KitchenTicketItem[];
}

/** Effective per-unit price including modifiers. */
export function checkLineUnitMinor(line: CheckLine): number {
  const mods = line.modifiers.reduce((s, m) => s + m.priceDeltaMinor, 0);
  return line.unitPriceMinor + mods;
}

export function checkLineTotalMinor(line: CheckLine): number {
  return checkLineUnitMinor(line) * line.qty;
}

/** Flatten a restaurant check into cart lines the sale builder understands. */
export function checkToCartLines(lines: readonly CheckLine[]): CartLine[] {
  return lines.map((line) => ({
    key: line.key,
    productId: line.itemId,
    variantId: null,
    name:
      line.modifiers.length > 0
        ? `${line.name} (${line.modifiers.map((m) => m.name).join(", ")})`
        : line.name,
    unitPriceMinor: checkLineUnitMinor(line),
    qty: line.qty,
  }));
}

/** Age of a kitchen ticket in whole seconds (KDS timer, §5). */
export function ticketAgeSeconds(ticket: KitchenTicket, now: number): number {
  const end = ticket.bumpedAt ?? now;
  return Math.max(0, Math.floor((end - ticket.sentAt) / 1000));
}

export type TicketUrgency = "fresh" | "aging" | "late";

/** Color signal by age (§11 — color signals state, not decoration). */
export function ticketUrgency(
  ageSeconds: number,
  opts: { agingAt?: number; lateAt?: number } = {},
): TicketUrgency {
  const agingAt = opts.agingAt ?? 300; // 5 min
  const lateAt = opts.lateAt ?? 600; // 10 min
  if (ageSeconds >= lateAt) return "late";
  if (ageSeconds >= agingAt) return "aging";
  return "fresh";
}
