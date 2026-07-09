/**
 * Applies a sync op to a SQLite store — used by both the server (cloud
 * projection) and the terminal (on pull). Encodes the CLAUDE.md §6 conflict
 * policy:
 *   - append-only entities: idempotent insert by id (all inserts land; derived
 *     state like stock_levels recomputes to the correct net — conflict-free).
 *   - config entities: last-writer-wins by server-authoritative `updated_at`;
 *     the losing version is written to `audit_log` so nothing is silently lost.
 */
import { newId } from "@merkat/core";
import type { LocalHandle } from "../local.js";
import { insertRow } from "../write.js";
import { isAppendOnly, type SyncOp } from "./oplog.js";

export type ApplyResult = "applied" | "duplicate" | "lww-loser";

function existingRow(
  handle: LocalHandle,
  entity: string,
  id: string,
): Record<string, unknown> | undefined {
  return handle.sqlite
    .prepare(`SELECT * FROM "${entity}" WHERE id = ?`)
    .get(id) as Record<string, unknown> | undefined;
}

export function applyOp(
  handle: LocalHandle,
  op: SyncOp,
  now = Date.now(),
): ApplyResult {
  const { entity, entityId, payload } = op;

  if (isAppendOnly(entity)) {
    const exists = handle.sqlite
      .prepare(`SELECT 1 FROM "${entity}" WHERE id = ? LIMIT 1`)
      .get(entityId);
    if (exists) return "duplicate";
    insertRow(handle, entity, payload, "ignore");
    return "applied";
  }

  // Config: last-writer-wins by updated_at. An equal timestamp is the op
  // echoing back to its author — a no-op, not a loss (so we don't self-audit).
  const existing = existingRow(handle, entity, entityId);
  if (existing) {
    const existingUpdated = Number(existing.updated_at ?? 0);
    if (op.updatedAt < existingUpdated) {
      auditLoser(handle, op, existing, now);
      return "lww-loser";
    }
    if (op.updatedAt === existingUpdated) return "duplicate";
  }
  insertRow(handle, entity, payload, "replace");
  return "applied";
}

function auditLoser(
  handle: LocalHandle,
  op: SyncOp,
  before: Record<string, unknown>,
  now: number,
): void {
  insertRow(handle, "audit_log", {
    id: newId(),
    tenant_id: op.payload.tenant_id ?? before.tenant_id ?? null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    sync_status: "synced",
    staff_id: null,
    action: "sync_lww_loser",
    entity: op.entity,
    entity_id: op.entityId,
    before,
    after: op.payload,
  });
}
