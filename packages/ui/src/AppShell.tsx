/**
 * Operator shell (CLAUDE.md §5, §11): left sidebar nav, top bar (search + AI
 * spark + account), and the calm sync indicator (§6). Nav is filtered by the
 * signed-in role's permissions (§8). Renders the active screen via <Outlet>.
 */
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { can, featuresFor } from "@merkat/core";
import type { SyncStatus } from "@merkat/db";
import { NAV } from "./nav.js";
import { useSession } from "./state/session.js";
import { useSyncStatus } from "./state/sync.js";

export function AppShell(): JSX.Element {
  const branding = useSession((s) => s.branding);
  const session = useSession((s) => s.session);
  const sync = useSyncStatus();

  const role = session?.staff.role ?? "cashier";
  const features = featuresFor(branding.businessType);
  const items = NAV.filter(
    (item) =>
      (!item.action || can(role, item.action)) &&
      (!item.feature || features[item.feature]),
  );

  return (
    <div className="flex h-full">
      <aside className="flex w-56 flex-col gap-1 border-r border-border bg-surface p-4">
        <div className="flex items-center gap-2 px-3 pb-4 pt-2">
          <TenantMark name={branding.name} logoUrl={branding.logoUrl} />
          <span className="truncate font-semibold text-fg">
            {branding.name}
          </span>
        </div>
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              [
                "rounded-[--radius-control] px-3 py-2.5 text-left text-sm",
                isActive ? "bg-accent text-white" : "text-fg hover:bg-canvas",
              ].join(" ")
            }
          >
            {item.label}
          </NavLink>
        ))}
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-border bg-surface px-4">
          <input
            placeholder="Search or scan…"
            className="w-full max-w-md rounded-[--radius-control] border border-border bg-canvas px-3 py-2 text-sm text-fg"
          />
          <span title="AI assistant" className="text-accent">
            ✦
          </span>
          <SyncPill status={sync} />
          <AccountMenu />
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function TenantMark({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl: string | null;
}): JSX.Element {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className="size-7 rounded-[--radius-control] object-contain"
      />
    );
  }
  return (
    <span className="flex size-7 items-center justify-center rounded-[--radius-control] bg-accent text-sm font-bold text-white">
      {name.slice(0, 1)}
    </span>
  );
}

function AccountMenu(): JSX.Element {
  const navigate = useNavigate();
  const session = useSession((s) => s.session);
  const lock = useSession((s) => s.lock);
  const logout = useSession((s) => s.logout);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const name = session?.staff.name ?? "";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account"
        className="flex size-8 items-center justify-center rounded-full bg-border text-xs font-semibold text-fg"
      >
        {name.slice(0, 2).toUpperCase()}
      </button>
      {open ? (
        <div className="absolute right-0 top-10 z-10 w-44 rounded-[--radius-control] border border-border bg-surface py-1 shadow-md">
          <div className="px-3 py-2 text-sm">
            <div className="font-medium text-fg">{name}</div>
            <div className="text-xs capitalize text-muted">
              {session?.staff.role}
            </div>
          </div>
          <div className="my-1 border-t border-border" />
          <button
            onClick={() => {
              lock();
              navigate("/unlock");
            }}
            className="block w-full px-3 py-2 text-left text-sm text-fg hover:bg-canvas"
          >
            Lock terminal
          </button>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="block w-full px-3 py-2 text-left text-sm text-fg hover:bg-canvas"
          >
            Sign out
          </button>
        </div>
      ) : null}
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
    <span className="merkat-num whitespace-nowrap rounded-full border border-border px-2.5 py-1 text-xs text-muted">
      {label}
      {status.pending > 0 ? ` · ${status.pending} pending` : ""}
    </span>
  );
}
