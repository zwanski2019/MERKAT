/**
 * Sync op contracts (CLAUDE.md §6). The push/pull wire format and the conflict
 * classification, shared by the terminal engine, the server, and the HTTP
 * transport. Pure and browser-safe — the SQLite-backed pieces live under
 * `@merkat/db/node`.
 */

export type OpKind = "insert" | "update" | "delete";

export interface SyncOp {
  /** Idempotency key — re-sending an op with the same id is a no-op (§6). */
  readonly opId: string;
  readonly entity: string; // table name
  readonly entityId: string; // row id
  readonly op: OpKind;
  /** Full row, snake_case, wire-encoded (ts as epoch ms, json as objects). */
  readonly payload: Record<string, unknown>;
  /** Row `updated_at` (epoch ms) — decides last-writer-wins for config (§6). */
  readonly updatedAt: number;
}

export interface PushRequest {
  readonly ops: readonly SyncOp[];
}
export interface PushResponse {
  readonly applied: readonly string[]; // op ids the server accepted
  readonly checkpoint: number; // server oplog high-water mark
}

export interface PullRequest {
  readonly cursor: number;
}
export interface PullResponse {
  readonly ops: readonly (SyncOp & { seq: number })[];
  readonly checkpoint: number;
}

/** The transport the engine speaks (HTTP in prod, in-process in tests). */
export interface SyncTransport {
  push(req: PushRequest): Promise<PushResponse>;
  pull(req: PullRequest): Promise<PullResponse>;
}

/**
 * Append-only entities never conflict — inserts with unique ids all land, and
 * derived state (e.g. `stock_levels`) recomputes to the correct net (§1.3, §6).
 * Everything else is mutable config resolved by last-writer-wins.
 */
export const APPEND_ONLY_ENTITIES: ReadonlySet<string> = new Set([
  "stock_movements",
  "orders",
  "order_lines",
  "payments",
  "order_line_modifiers",
  "kitchen_tickets",
  "audit_log",
]);

export function isAppendOnly(entity: string): boolean {
  return APPEND_ONLY_ENTITIES.has(entity);
}
