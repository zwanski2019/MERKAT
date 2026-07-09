/**
 * Materializes the canonical {@link MODEL} into concrete Drizzle tables for
 * each dialect (CLAUDE.md §1.7). Because both dialects come from the same
 * specs, they cannot drift.
 *
 * Column/JS-type mapping (see model.ts):
 *   uuid/text/enum -> text|uuid (string)   int/real -> number
 *   bigint         -> bigint                bool     -> boolean
 *   ts             -> Date                  json     -> jsonb/text json
 */
import {
  bigint as pgBigint,
  boolean as pgBoolean,
  doublePrecision,
  integer as pgInteger,
  jsonb,
  pgTable,
  text as pgText,
  timestamp as pgTimestamp,
  uuid as pgUuid,
  type PgColumnBuilderBase,
} from "drizzle-orm/pg-core";
import {
  integer as sqliteInteger,
  real as sqliteReal,
  sqliteTable,
  text as sqliteText,
  type SQLiteColumnBuilderBase,
} from "drizzle-orm/sqlite-core";
import type { ColumnSpec, TableSpec } from "./model.js";
import { MODEL } from "./model.js";

/**
 * Concrete Drizzle builders expose fluent `.notNull()`/`.primaryKey()`, but the
 * base interface used as the columns-map constraint doesn't surface them.
 * Reach them through a minimal structural view (a PK is NOT NULL by definition).
 */
function withMods<T extends PgColumnBuilderBase | SQLiteColumnBuilderBase>(
  b: T,
  col: ColumnSpec,
): T {
  const fluent = b as unknown as { notNull(): T; primaryKey(): T };
  if (col.pk) return fluent.primaryKey();
  if (col.notNull) return fluent.notNull();
  return b;
}

function pgColumn(col: ColumnSpec): PgColumnBuilderBase {
  const n = col.name;
  switch (col.type) {
    case "uuid":
      return withMods(pgUuid(n), col);
    case "text":
      return withMods(pgText(n), col);
    case "int":
      return withMods(pgInteger(n), col);
    case "bigint":
      // 64-bit storage (§1.5); read as JS number, widened to bigint Money at
      // the edge. Consistent JS type with the SQLite dialect below.
      return withMods(pgBigint(n, { mode: "number" }), col);
    case "bool":
      return withMods(pgBoolean(n), col);
    case "ts":
      return withMods(
        pgTimestamp(n, { withTimezone: true, mode: "date" }),
        col,
      );
    case "json":
      return withMods(jsonb(n), col);
    case "real":
      return withMods(doublePrecision(n), col);
  }
}

function sqliteColumn(col: ColumnSpec): SQLiteColumnBuilderBase {
  const n = col.name;
  switch (col.type) {
    case "uuid":
    case "text":
      return withMods(sqliteText(n), col);
    case "int":
    case "bigint":
      // 64-bit INTEGER storage; read as JS number (see pg bigint note above).
      return withMods(sqliteInteger(n), col);
    case "bool":
      return withMods(sqliteInteger(n, { mode: "boolean" }), col);
    case "ts":
      return withMods(sqliteInteger(n, { mode: "timestamp_ms" }), col);
    case "json":
      return withMods(sqliteText(n, { mode: "json" }), col);
    case "real":
      return withMods(sqliteReal(n), col);
  }
}

function pgColumns(spec: TableSpec): Record<string, PgColumnBuilderBase> {
  return Object.fromEntries(
    spec.columns.map((col) => [col.name, pgColumn(col)]),
  );
}

function sqliteColumns(
  spec: TableSpec,
): Record<string, SQLiteColumnBuilderBase> {
  return Object.fromEntries(
    spec.columns.map((col) => [col.name, sqliteColumn(col)]),
  );
}

export type PgTables = Record<string, ReturnType<typeof pgTable>>;
export type SqliteTables = Record<string, ReturnType<typeof sqliteTable>>;

export const pgSchema: PgTables = Object.fromEntries(
  MODEL.map((spec) => [spec.name, pgTable(spec.name, pgColumns(spec))]),
);

export const sqliteSchema: SqliteTables = Object.fromEntries(
  MODEL.map((spec) => [spec.name, sqliteTable(spec.name, sqliteColumns(spec))]),
);
