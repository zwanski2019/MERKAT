// Browser-safe surface only. The node-only local SQLite store (better-sqlite3)
// is isolated behind `@merkat/db/node` so it never enters the web bundle (§3).
export * from "./sync/engine.js";
export * from "./sync/oplog.js";

// Schema — one canonical model, two dialects (CLAUDE.md §1.7). Pure JS.
export * from "./schema/model.js";
export { pgSchema, sqliteSchema } from "./schema/materialize.js";
export type { PgTables, SqliteTables } from "./schema/materialize.js";
export { ddlStatements, sqliteDdl, pgDdl } from "./schema/ddl.js";
