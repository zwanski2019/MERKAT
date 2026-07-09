/**
 * Settings → Sync (CLAUDE.md §6). Shows the terminal's sync state — online,
 * last synced, and how many local changes are still queued in the outbox.
 * Offline is a normal, calm state (never alarming): a terminal keeps selling
 * and reconciles later.
 */
import { useState } from "react";
import { getSyncEngine, useSyncStatus } from "../../state/sync.js";

export function SyncSettings(): JSX.Element {
  const status = useSyncStatus();
  const [busy, setBusy] = useState(false);

  const lastSynced = status.lastSyncedAt
    ? `${Math.round((Date.now() - status.lastSyncedAt) / 1000)}s ago`
    : "never";

  async function syncNow(): Promise<void> {
    setBusy(true);
    try {
      await getSyncEngine().flush();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md">
      <div className="mb-4 flex items-center gap-2">
        <span
          className={[
            "size-2.5 rounded-full",
            status.online ? "bg-accent" : "bg-[var(--text-muted)]",
          ].join(" ")}
        />
        <span className="font-medium text-fg">
          {status.online ? "Online" : "Offline — changes are queued locally"}
        </span>
      </div>

      <dl className="divide-y divide-border rounded-[--radius-card] border border-border">
        <Row label="Last synced" value={lastSynced} />
        <Row label="Pending changes" value={String(status.pending)} />
      </dl>

      <button
        onClick={syncNow}
        disabled={busy || !status.online}
        className="mt-4 rounded-[--radius-control] bg-accent px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        {busy ? "Syncing…" : "Sync now"}
      </button>

      <p className="mt-4 text-sm text-muted">
        Offline is a normal state — the terminal keeps working and reconciles
        automatically. Stock movements never conflict; the movement ledger sums
        to the correct net across terminals.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="merkat-num text-sm text-fg">{value}</dd>
    </div>
  );
}
