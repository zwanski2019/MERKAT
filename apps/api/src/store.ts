/**
 * Shared server-side store (CLAUDE.md §3, §4). One migrated SQLite handle acting
 * as the cloud projection (Postgres in production) plus the sync relay server.
 * Used by the sync endpoint and the AI proxy (which audit-logs tool calls here).
 * SYNC_DB may point at a file to persist.
 */
import { SyncServer, migrateLocal, openLocalDb } from "@merkat/db/node";

export const handle = openLocalDb(process.env.SYNC_DB ?? ":memory:");
migrateLocal(handle);
export const syncServer = new SyncServer(handle);
