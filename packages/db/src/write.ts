/**
 * Minimal encoding-aware insert for the local store, driven by the canonical
 * model column types. Centralizes Date→ms / boolean→0·1 / object→JSON encoding
 * so callers pass plain JS values.
 *
 * NOTE: this is a bootstrap/seed helper. App mutations to syncing tables must
 * go through the transactional `mutate()` helper (entity + outbox in one tx,
 * CLAUDE.md §6, §13), which lands in Phase 5. Do not use this for POS writes.
 */
import type { LocalHandle } from "./local.js";
import type { LogicalType } from "./schema/model.js";
import { MODEL } from "./schema/model.js";

const COLUMN_TYPES: ReadonlyMap<
  string,
  ReadonlyMap<string, LogicalType>
> = new Map(
  MODEL.map((spec) => [
    spec.name,
    new Map(spec.columns.map((col) => [col.name, col.type])),
  ]),
);

type Encoded = string | number | bigint | null;

function encode(type: LogicalType, value: unknown): Encoded {
  if (value === null || value === undefined) return null;
  switch (type) {
    case "ts":
      return value instanceof Date ? value.getTime() : Number(value);
    case "bool":
      return value ? 1 : 0;
    case "json":
      return JSON.stringify(value);
    case "bigint":
      return typeof value === "bigint" ? value : Number(value);
    case "int":
    case "real":
      return Number(value);
    default:
      return String(value);
  }
}

export type Row = Record<string, unknown>;

/** Conflict mode for a row write: plain insert, idempotent, or LWW replace. */
export type WriteMode = "insert" | "ignore" | "replace";

const VERB: Record<WriteMode, string> = {
  insert: "INSERT",
  ignore: "INSERT OR IGNORE",
  replace: "INSERT OR REPLACE",
};

/** Encode a row's values by their model column types. */
export function encodeRow(tableName: string, row: Row): Encoded[] {
  const types = COLUMN_TYPES.get(tableName);
  if (!types) throw new Error(`Unknown table: ${tableName}`);
  return Object.keys(row).map((n) => {
    const type = types.get(n);
    if (!type) throw new Error(`Unknown column: ${tableName}.${n}`);
    return encode(type, row[n]);
  });
}

/** Insert one row into `tableName`, encoding values by their model type. */
export function insertRow(
  handle: LocalHandle,
  tableName: string,
  row: Row,
  mode: WriteMode = "insert",
): void {
  const names = Object.keys(row);
  const columns = names.map((n) => `"${n}"`).join(", ");
  const placeholders = names.map(() => "?").join(", ");
  const values = encodeRow(tableName, row);

  handle.sqlite
    .prepare(
      `${VERB[mode]} INTO "${tableName}" (${columns}) VALUES (${placeholders})`,
    )
    .run(...values);
}
