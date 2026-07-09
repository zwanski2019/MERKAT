/**
 * Sync status for the UI (CLAUDE.md §6). The indicator (POS corner + Settings→
 * Sync) reads this. The UI only ever talks to a `SyncEngine`; the web ships the
 * calm `NoopSyncEngine` (offline is a normal state), and the desktop terminal
 * injects `HttpOplogEngine`/`PowerSyncEngine` over the synced SQLite via
 * {@link setSyncEngine} — the UI never knows which engine is active.
 */
import { useSyncExternalStore } from "react";
import { NoopSyncEngine, type SyncEngine, type SyncStatus } from "@merkat/db";

let engine: SyncEngine = new NoopSyncEngine();
let current: SyncStatus = engine.status();
const listeners = new Set<() => void>();
let unsubscribe = engine.onStatusChange(onStatus);

function onStatus(s: SyncStatus): void {
  current = s;
  for (const l of listeners) l();
}

export function getSyncEngine(): SyncEngine {
  return engine;
}

/** Swap in the platform engine (desktop terminal). */
export function setSyncEngine(next: SyncEngine): void {
  unsubscribe();
  engine = next;
  current = engine.status();
  unsubscribe = engine.onStatusChange(onStatus);
  for (const l of listeners) l();
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => current,
  );
}
