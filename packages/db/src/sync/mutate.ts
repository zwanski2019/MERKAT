/**
 * The transactional mutation primitive (CLAUDE.md §6, §13). Every app write to a
 * syncing table goes through `mutate`: it writes the entity row **and** appends
 * an outbox op in one SQLite transaction, so a terminal can never record a
 * change without also queuing it for sync. A background engine drains the outbox.
 */
import { newId } from "@merkat/core";
import type { LocalHandle } from "../local.js";
import { insertRow, type Row } from "../write.js";
import { isAppendOnly, type OpKind, type SyncOp } from "./oplog.js";

export interface MutateInput {
  readonly entity: string; // table name
  readonly op: OpKind;
  /** Full row, snake_case, wire-encoded (ts as epoch ms). Must include `id`. */
  readonly row: Row;
}

/** Write an entity row + its outbox op atomically. Returns the queued op id. */
export function mutate(handle: LocalHandle, input: MutateInput): string {
  const { entity, op, row } = input;
  const entityId = row.id as string | undefined;
  if (!entityId) throw new Error(`mutate: row for ${entity} is missing id`);

  const opId = newId();

  const run = handle.sqlite.transaction(() => {
    // Append-only rows are plain inserts; config rows upsert locally (§6).
    insertRow(handle, entity, row, isAppendOnly(entity) ? "insert" : "replace");
    insertRow(handle, "outbox", {
      op_id: opId,
      entity,
      entity_id: entityId,
      op,
      payload: row, // json column — stringified by the encoder
      seq: nextSeq(handle),
      synced_at: null,
    });
  });
  run();
  return opId;
}

function nextSeq(handle: LocalHandle): number {
  const row = handle.sqlite
    .prepare(`SELECT COALESCE(MAX(seq), 0) AS m FROM outbox`)
    .get() as { m: number };
  return row.m + 1;
}

interface OutboxRow {
  op_id: string;
  entity: string;
  entity_id: string;
  op: OpKind;
  payload: string;
  seq: number;
}

/** Unsynced outbox ops, oldest first (push order, §6). */
export function readUnsynced(handle: LocalHandle): SyncOp[] {
  const rows = handle.sqlite
    .prepare(
      `SELECT op_id, entity, entity_id, op, payload, seq
         FROM outbox WHERE synced_at IS NULL ORDER BY seq`,
    )
    .all() as OutboxRow[];
  return rows.map((r) => {
    const payload = JSON.parse(r.payload) as Record<string, unknown>;
    return {
      opId: r.op_id,
      entity: r.entity,
      entityId: r.entity_id,
      op: r.op,
      payload,
      updatedAt: Number(payload.updated_at ?? 0),
    };
  });
}

export function markSynced(
  handle: LocalHandle,
  opIds: readonly string[],
  now = Date.now(),
): void {
  if (opIds.length === 0) return;
  const placeholders = opIds.map(() => "?").join(", ");
  handle.sqlite
    .prepare(`UPDATE outbox SET synced_at = ? WHERE op_id IN (${placeholders})`)
    .run(now, ...opIds);
}

export function pendingCount(handle: LocalHandle): number {
  const row = handle.sqlite
    .prepare(`SELECT COUNT(*) AS n FROM outbox WHERE synced_at IS NULL`)
    .get() as { n: number };
  return row.n;
}

const CURSOR_ID = "default";

/** The last server checkpoint this terminal has pulled (§6). */
export function getCursor(handle: LocalHandle): number {
  const row = handle.sqlite
    .prepare(`SELECT checkpoint FROM sync_cursor WHERE id = ?`)
    .get(CURSOR_ID) as { checkpoint: string } | undefined;
  return row ? Number(row.checkpoint) : 0;
}

export function setCursor(handle: LocalHandle, checkpoint: number): void {
  insertRow(
    handle,
    "sync_cursor",
    { id: CURSOR_ID, checkpoint: String(checkpoint), updated_at: Date.now() },
    "replace",
  );
}
