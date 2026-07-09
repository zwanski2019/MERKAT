/**
 * The terminal sync engine (CLAUDE.md §6). Drains the local outbox to the
 * transport (push), applies the server op stream to local SQLite (pull), and
 * exposes the SyncStatus the UI indicator reads. This is the documented
 * DIY-oplog engine behind the `SyncEngine` interface; `PowerSyncEngine` slots in
 * behind the same interface without the UI knowing which is active.
 */
import type { LocalHandle } from "../local.js";
import type { SyncEngine, SyncStatus, Unsubscribe } from "./engine.js";
import { applyOp } from "./apply.js";
import {
  getCursor,
  markSynced,
  pendingCount,
  readUnsynced,
  setCursor,
} from "./mutate.js";
import type { PullRequest, PushRequest, SyncTransport } from "./oplog.js";
import type { SyncServer } from "./server.js";

export class HttpOplogEngine implements SyncEngine {
  private readonly listeners = new Set<(s: SyncStatus) => void>();
  private state: SyncStatus;

  constructor(
    private readonly handle: LocalHandle,
    private readonly transport: SyncTransport,
  ) {
    this.state = {
      online: false,
      lastSyncedAt: null,
      pending: pendingCount(handle),
    };
  }

  async start(): Promise<void> {
    this.patch({ online: true });
    await this.flush();
  }

  async stop(): Promise<void> {
    this.patch({ online: false });
  }

  status(): SyncStatus {
    return this.state;
  }

  onStatusChange(cb: (s: SyncStatus) => void): Unsubscribe {
    this.listeners.add(cb);
    cb(this.state);
    return () => this.listeners.delete(cb);
  }

  /** Push the outbox, then pull server changes. */
  async flush(): Promise<void> {
    await this.push();
    await this.pull();
    this.patch({
      lastSyncedAt: Date.now(),
      pending: pendingCount(this.handle),
    });
  }

  private async push(): Promise<void> {
    const ops = readUnsynced(this.handle);
    if (ops.length === 0) return;
    const res = await this.transport.push({ ops });
    markSynced(this.handle, res.applied);
    this.patch({ pending: pendingCount(this.handle) });
  }

  private async pull(): Promise<void> {
    const cursor = getCursor(this.handle);
    const res = await this.transport.pull({ cursor });
    const apply = this.handle.sqlite.transaction(() => {
      for (const op of res.ops) applyOp(this.handle, op);
      setCursor(this.handle, res.checkpoint);
    });
    apply();
  }

  private patch(next: Partial<SyncStatus>): void {
    this.state = { ...this.state, ...next };
    for (const cb of this.listeners) cb(this.state);
  }
}

/** Transport that talks to an in-process {@link SyncServer} (tests, embedded). */
export class InProcessTransport implements SyncTransport {
  constructor(private readonly server: SyncServer) {}
  async push(req: PushRequest) {
    return this.server.push(req);
  }
  async pull(req: PullRequest) {
    return this.server.pull(req);
  }
}

/** Transport that talks to the API `/sync` endpoints over HTTP. */
export class HttpTransport implements SyncTransport {
  constructor(private readonly baseUrl: string) {}

  async push(req: PushRequest) {
    const res = await fetch(`${this.baseUrl}/sync/push`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error(`sync push failed: ${res.status}`);
    return (await res.json()) as Awaited<ReturnType<SyncServer["push"]>>;
  }

  async pull(req: PullRequest) {
    const res = await fetch(`${this.baseUrl}/sync/pull?cursor=${req.cursor}`);
    if (!res.ok) throw new Error(`sync pull failed: ${res.status}`);
    return (await res.json()) as Awaited<ReturnType<SyncServer["pull"]>>;
  }
}
