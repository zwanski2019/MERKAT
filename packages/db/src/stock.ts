/**
 * Stock is a ledger, not a number (CLAUDE.md §1.3). All quantity changes are
 * immutable signed inserts into `stock_movements`. `stock_levels` is a derived
 * cache — never written directly by app code; it is rebuilt from the movement
 * ledger so two offline terminals' movements both land and the net recomputes
 * correctly (this is the property that makes stock sync conflict-free, §6).
 */
import { newId } from "@merkat/core";
import type { LocalHandle } from "./local.js";

interface StockAggRow {
  readonly product_id: string | null;
  readonly variant_id: string | null;
  readonly location_id: string;
  readonly qty: number;
}

/**
 * Recompute `stock_levels` for a tenant as `SUM(delta)` per
 * (product/variant, location) from the movement ledger.
 */
export function rebuildStockLevels(
  handle: LocalHandle,
  tenantId: string,
): void {
  const { sqlite } = handle;
  const rows = sqlite
    .prepare(
      `SELECT product_id, variant_id, location_id, SUM(delta) AS qty
         FROM stock_movements
        WHERE tenant_id = ? AND deleted_at IS NULL
        GROUP BY product_id, variant_id, location_id`,
    )
    .all(tenantId) as StockAggRow[];

  const now = Date.now();
  const rebuild = sqlite.transaction(() => {
    sqlite
      .prepare(`DELETE FROM stock_levels WHERE tenant_id = ?`)
      .run(tenantId);
    const insert = sqlite.prepare(
      `INSERT INTO stock_levels
         (id, tenant_id, created_at, updated_at, deleted_at,
          product_id, variant_id, location_id, qty)
       VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
    );
    for (const row of rows) {
      insert.run(
        newId(),
        tenantId,
        now,
        now,
        row.product_id,
        row.variant_id,
        row.location_id,
        row.qty,
      );
    }
  });
  rebuild();
}

export interface StockKey {
  readonly productId?: string;
  readonly variantId?: string;
  readonly locationId: string;
}

/** Read a single derived on-hand quantity (0 when no movements exist). */
export function getStockLevel(
  handle: LocalHandle,
  tenantId: string,
  key: StockKey,
): number {
  const row = handle.sqlite
    .prepare(
      `SELECT qty FROM stock_levels
        WHERE tenant_id = ?
          AND location_id = ?
          AND product_id IS ?
          AND variant_id IS ?`,
    )
    .get(
      tenantId,
      key.locationId,
      key.productId ?? null,
      key.variantId ?? null,
    ) as { qty: number } | undefined;
  return row?.qty ?? 0;
}
