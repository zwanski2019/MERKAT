/**
 * SyncEngine contract (CLAUDE.md §6). The UI only ever talks to this interface
 * plus local SQLite — it must not know which engine (PowerSync / HttpOplog) is
 * active. Phase 5 implements PowerSyncEngine first.
 */
export interface SyncStatus {
  online: boolean;
  lastSyncedAt: number | null; // epoch ms
  pending: number; // unsynced outbox rows
}

export type Unsubscribe = () => void;

export interface SyncEngine {
  start(): Promise<void>;
  stop(): Promise<void>;
  status(): SyncStatus;
  onStatusChange(cb: (s: SyncStatus) => void): Unsubscribe;
  flush(): Promise<void>; // force push now
}

/** Phase 0 placeholder: a no-op engine so the shell can boot with a calm,
 *  non-alarming "offline" status. Replaced by PowerSyncEngine in Phase 5. */
export class NoopSyncEngine implements SyncEngine {
  private readonly listeners = new Set<(s: SyncStatus) => void>();
  private state: SyncStatus = {
    online: false,
    lastSyncedAt: null,
    pending: 0,
  };

  async start(): Promise<void> {}
  async stop(): Promise<void> {}

  status(): SyncStatus {
    return this.state;
  }

  onStatusChange(cb: (s: SyncStatus) => void): Unsubscribe {
    this.listeners.add(cb);
    cb(this.state);
    return () => this.listeners.delete(cb);
  }

  async flush(): Promise<void> {}
}
