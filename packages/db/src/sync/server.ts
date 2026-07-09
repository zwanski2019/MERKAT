/**
 * Server-side sync store (CLAUDE.md §6). The cloud source of record — here a
 * SQLite projection (Postgres in production) plus a relay oplog. It applies
 * pushed ops idempotently (dedupe by op id) with the §6 conflict policy, and
 * serves pull as an ordered op stream since a client's checkpoint.
 */
import type { LocalHandle } from "../local.js";
import { applyOp } from "./apply.js";
import type {
  PullRequest,
  PullResponse,
  PushRequest,
  PushResponse,
  SyncOp,
} from "./oplog.js";

export class SyncServer {
  private readonly oplog: (SyncOp & { seq: number })[] = [];
  private readonly appliedOpIds = new Set<string>();
  private seq = 0;

  /** `handle` is a migrated SQLite acting as the cloud projection. */
  constructor(private readonly handle: LocalHandle) {}

  push(req: PushRequest): PushResponse {
    const applied: string[] = [];
    const run = this.handle.sqlite.transaction(() => {
      for (const op of req.ops) {
        applied.push(op.opId);
        if (this.appliedOpIds.has(op.opId)) continue; // idempotent (§6)
        this.appliedOpIds.add(op.opId);
        // Project into the cloud store (append-only insert or LWW config).
        applyOp(this.handle, op);
        // Relay every unique op; clients apply their own LWW on pull.
        this.seq += 1;
        this.oplog.push({ ...op, seq: this.seq });
      }
    });
    run();
    return { applied, checkpoint: this.seq };
  }

  pull(req: PullRequest): PullResponse {
    const ops = this.oplog.filter((o) => o.seq > req.cursor);
    return { ops, checkpoint: this.seq };
  }

  /** Test/debug access to the cloud projection. */
  get store(): LocalHandle {
    return this.handle;
  }
}
