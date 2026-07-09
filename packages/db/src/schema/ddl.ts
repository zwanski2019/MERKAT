/**
 * Emits `CREATE TABLE` DDL from the canonical {@link MODEL} for both dialects
 * (CLAUDE.md §1.7). This is the migration mechanism: `migrateLocal` applies the
 * SQLite DDL to a terminal's database; the Postgres DDL is the cloud migration.
 *
 * Foreign-key constraints are intentionally omitted. Rows sync as append-only
 * inserts that can arrive before their parents (§6); enforcing FKs would reject
 * otherwise-valid offline writes. References are documented in `model.ts`.
 */
import type { ColumnSpec, TableSpec } from "./model.js";
import { MODEL } from "./model.js";

type Dialect = "sqlite" | "pg";

function sqlType(col: ColumnSpec): string {
  switch (col.type) {
    case "uuid":
    case "text":
    case "json":
      return "TEXT";
    case "int":
    case "bigint":
    case "bool":
    case "ts":
      return "INTEGER";
    case "real":
      return "REAL";
  }
}

function pgType(col: ColumnSpec): string {
  switch (col.type) {
    case "uuid":
      return "uuid";
    case "text":
      return "text";
    case "json":
      return "jsonb";
    case "int":
      return "integer";
    case "bigint":
      return "bigint";
    case "bool":
      return "boolean";
    case "ts":
      return "timestamptz";
    case "real":
      return "double precision";
  }
}

function columnDdl(col: ColumnSpec, dialect: Dialect): string {
  const type = dialect === "pg" ? pgType(col) : sqlType(col);
  const parts = [`"${col.name}"`, type];
  if (col.pk) parts.push("PRIMARY KEY");
  if (col.notNull && !col.pk) parts.push("NOT NULL");
  if (col.enumValues) {
    const list = col.enumValues.map((v) => `'${v}'`).join(", ");
    parts.push(`CHECK ("${col.name}" IN (${list}))`);
  }
  return parts.join(" ");
}

function tableDdl(spec: TableSpec, dialect: Dialect): string {
  const cols = spec.columns.map((col) => `  ${columnDdl(col, dialect)}`);
  return `CREATE TABLE IF NOT EXISTS "${spec.name}" (\n${cols.join(",\n")}\n);`;
}

/** One `CREATE TABLE` statement per table, in dependency order. */
export function ddlStatements(dialect: Dialect): string[] {
  return MODEL.map((spec) => tableDdl(spec, dialect));
}

export function sqliteDdl(): string[] {
  return ddlStatements("sqlite");
}

export function pgDdl(): string[] {
  return ddlStatements("pg");
}
