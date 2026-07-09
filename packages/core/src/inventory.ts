/**
 * Inventory domain (CLAUDE.md §1.3, §4). Stock is a ledger: on-hand quantity is
 * always the sum of signed `stock_movements`, never a stored number. This module
 * owns the domain types, the Zod input schemas (§13), and the pure derivation —
 * the SQLite path (`@merkat/db/node`) mirrors the same SUM(delta) semantics.
 *
 * Money is integer minor units (§1.5); format only at the edge via money.ts.
 */
import { z } from "zod";

// Manual stock-entry reasons (a subset of the full ledger reasons; `sale` comes
// from POS in Phase 4, transfers from multi-location later).
export const STOCK_ENTRY_REASONS = [
  "restock",
  "adjustment",
  "count",
  "waste",
] as const;
export type StockEntryReason = (typeof STOCK_ENTRY_REASONS)[number];

// ── domain views (camelCase; DB rows are snake_case in @merkat/db) ──────────
export interface ProductVariant {
  readonly id: string;
  readonly productId: string;
  readonly attributes: Record<string, string>;
  readonly sku: string | null;
  readonly barcode: string | null;
  readonly priceMinor: number | null;
  readonly expiryDate: string | null; // ISO date
  readonly batchNo: string | null;
}

export interface Product {
  readonly id: string;
  readonly categoryId: string | null;
  readonly name: string;
  readonly priceMinor: number;
  readonly costMinor: number | null;
  readonly sku: string | null;
  readonly barcode: string | null;
  readonly description: string | null;
  readonly imageUrl: string | null;
  readonly lowStockThreshold: number | null;
  readonly active: boolean;
  readonly variants: readonly ProductVariant[];
}

export interface StockMovement {
  readonly id: string;
  readonly productId: string | null;
  readonly variantId: string | null;
  readonly locationId: string;
  readonly delta: number; // signed
  readonly reason: string;
  readonly refId: string | null;
  readonly staffId: string | null;
  readonly createdAt: number; // epoch ms
}

/** A product as shown on the Products table: with its derived on-hand level. */
export interface ProductListItem {
  readonly product: Product;
  readonly onHand: number; // total across the product + its variants
  readonly lowStock: boolean;
}

// ── input schemas (form + API boundary, §13) ────────────────────────────────
const money = z.number().int().nonnegative();

export const variantInputSchema = z.object({
  attributes: z.record(z.string(), z.string()).default({}),
  sku: z.string().trim().min(1).nullish(),
  barcode: z.string().trim().min(1).nullish(),
  priceMinor: money.nullish(),
  expiryDate: z.string().nullish(),
  batchNo: z.string().trim().min(1).nullish(),
});
export type VariantInput = z.infer<typeof variantInputSchema>;

export const productInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  categoryId: z.string().uuid().nullish(),
  priceMinor: money,
  costMinor: money.nullish(),
  sku: z.string().trim().min(1).nullish(),
  barcode: z.string().trim().min(1).nullish(),
  description: z.string().trim().nullish(),
  imageUrl: z.string().url().nullish(),
  lowStockThreshold: z.number().int().positive().nullish(),
  active: z.boolean().default(true),
  variants: z.array(variantInputSchema).default([]),
});
export type ProductInput = z.infer<typeof productInputSchema>;

export const addStockSchema = z
  .object({
    productId: z.string().uuid().nullish(),
    variantId: z.string().uuid().nullish(),
    locationId: z.string().uuid(),
    qty: z
      .number()
      .int()
      .refine((n) => n !== 0, "Quantity can't be zero"),
    reason: z.enum(STOCK_ENTRY_REASONS),
  })
  .refine((v) => Boolean(v.productId) !== Boolean(v.variantId), {
    message: "Provide exactly one of productId or variantId",
  });
export type AddStockInput = z.infer<typeof addStockSchema>;

// ── pure ledger math (§1.3) ─────────────────────────────────────────────────
export interface StockDelta {
  readonly productId: string | null;
  readonly variantId: string | null;
  readonly locationId: string;
  readonly delta: number;
}

export function stockKey(
  locationId: string,
  productId: string | null,
  variantId: string | null,
): string {
  return `${locationId}|${productId ?? ""}|${variantId ?? ""}`;
}

/** Net on-hand per (location, product/variant) from the movement ledger. */
export function deriveStockLevels(
  movements: readonly StockDelta[],
): Map<string, number> {
  const levels = new Map<string, number>();
  for (const m of movements) {
    const key = stockKey(m.locationId, m.productId, m.variantId);
    levels.set(key, (levels.get(key) ?? 0) + m.delta);
  }
  return levels;
}

/**
 * Total on-hand for a product at a location: the product's own movements plus
 * every variant's movements (variants are stocked independently).
 */
export function productOnHand(
  product: Product,
  locationId: string,
  movements: readonly StockDelta[],
): number {
  const levels = deriveStockLevels(movements);
  let total = levels.get(stockKey(locationId, product.id, null)) ?? 0;
  for (const variant of product.variants) {
    total += levels.get(stockKey(locationId, null, variant.id)) ?? 0;
  }
  return total;
}

/** Low-stock triggers at or below the threshold (only when one is set). */
export function isLowStock(onHand: number, threshold: number | null): boolean {
  return threshold != null && threshold > 0 && onHand <= threshold;
}
