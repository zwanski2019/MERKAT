/**
 * Per-terminal local SQLite store (CLAUDE.md §2). Local SQLite is the
 * terminal's source of truth (§6); sync reconciles later. On the desktop this
 * is the Tauri SQL plugin / libSQL; here (dev, tests, and the Node reference
 * path) it is better-sqlite3 behind the same Drizzle schema.
 */
import Database from "better-sqlite3";
import {
  drizzle,
  type BetterSQLite3Database,
} from "drizzle-orm/better-sqlite3";
import { sqliteDdl } from "./schema/ddl.js";
import { sqliteSchema, type SqliteTables } from "./schema/materialize.js";

export type LocalDb = BetterSQLite3Database<SqliteTables>;

export interface LocalHandle {
  readonly db: LocalDb;
  readonly sqlite: Database.Database;
  close(): void;
}

/** Open a local database. Defaults to an in-memory store (tests). */
export function openLocalDb(file = ":memory:"): LocalHandle {
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  const db = drizzle(sqlite, { schema: sqliteSchema });
  return { db, sqlite, close: () => sqlite.close() };
}

/** Apply the schema DDL. Idempotent (`CREATE TABLE IF NOT EXISTS`). */
export function migrateLocal(handle: LocalHandle): void {
  const statements = sqliteDdl();
  const run = handle.sqlite.transaction(() => {
    for (const statement of statements) handle.sqlite.exec(statement);
  });
  run();
}
