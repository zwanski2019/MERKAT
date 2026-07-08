import { useEffect, useState } from "react";
import { PRODUCT_NAME } from "@merkat/core";
import { NoopSyncEngine, type SyncStatus, type SyncEngine } from "@merkat/db";

const NAV = [
  "Dashboard",
  "POS",
  "Products",
  "Orders",
  "Customers",
  "Reports",
  "Assistant",
  "Settings",
] as const;

const engine: SyncEngine = new NoopSyncEngine();

/** Empty operator shell for the Phase 0 gate: left sidebar nav, top bar
 *  (search + AI spark + account), and the calm sync indicator (§6, §11). */
export function AppShell(): JSX.Element {
  const [active, setActive] = useState<string>("Dashboard");
  const [sync, setSync] = useState<SyncStatus>(engine.status());

  useEffect(() => engine.onStatusChange(setSync), []);

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <aside
        style={{
          width: 220,
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 18, padding: "8px 12px 16px" }}>
          {PRODUCT_NAME}
        </div>
        {NAV.map((item) => (
          <button
            key={item}
            onClick={() => setActive(item)}
            style={{
              textAlign: "left",
              padding: "10px 12px",
              borderRadius: "var(--radius-control)",
              border: "none",
              cursor: "pointer",
              font: "inherit",
              background:
                active === item ? "var(--accent)" : "transparent",
              color: active === item ? "#fff" : "var(--text)",
            }}
          >
            {item}
          </button>
        ))}
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            height: 56,
            borderBottom: "1px solid var(--border)",
            background: "var(--surface)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "0 16px",
          }}
        >
          <input
            placeholder="Search or scan…"
            style={{
              flex: 1,
              maxWidth: 420,
              padding: "8px 12px",
              borderRadius: "var(--radius-control)",
              border: "1px solid var(--border)",
              background: "var(--canvas)",
              color: "var(--text)",
            }}
          />
          <span title="AI assistant">✦</span>
          <SyncPill status={sync} />
          <div
            aria-label="Account"
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "var(--border)",
            }}
          />
        </header>

        <main style={{ flex: 1, padding: 24, overflow: "auto" }}>
          <h1 style={{ marginTop: 0 }}>{active}</h1>
          <p style={{ color: "var(--text-muted)" }}>
            {PRODUCT_NAME} shell is running. Screens land in later phases.
          </p>
        </main>
      </div>
    </div>
  );
}

/** Offline is a normal state — styled calm-neutral, never alarming red (§6). */
function SyncPill({ status }: { status: SyncStatus }): JSX.Element {
  const label = status.online
    ? status.lastSyncedAt
      ? `synced ${Math.round((Date.now() - status.lastSyncedAt) / 1000)}s ago`
      : "online"
    : "offline";
  return (
    <span
      className="merkat-num"
      style={{
        fontSize: 12,
        color: "var(--text-muted)",
        border: "1px solid var(--border)",
        borderRadius: 999,
        padding: "4px 10px",
      }}
    >
      {label}
      {status.pending > 0 ? ` · ${status.pending} pending` : ""}
    </span>
  );
}
