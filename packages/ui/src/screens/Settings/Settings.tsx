/**
 * Settings (CLAUDE.md §5): Branding / Tax / Receipt / Hardware / Payments /
 * Sync / Team. Phase 2 implements Branding (live accent) and Team (permission
 * matrix); the rest are placeholders wired in their owning phases.
 */
import { useState } from "react";
import { BrandingSettings } from "./BrandingSettings.js";
import { PermissionMatrix } from "./PermissionMatrix.js";
import { SyncSettings } from "./SyncSettings.js";
import { TaxSettings } from "./TaxSettings.js";

type Tab =
  "Branding" | "Team" | "Tax" | "Receipt" | "Hardware" | "Payments" | "Sync";

const TABS: readonly Tab[] = [
  "Branding",
  "Team",
  "Tax",
  "Receipt",
  "Hardware",
  "Payments",
  "Sync",
];

const PHASE: Partial<Record<Tab, string>> = {
  Receipt: "Phase 4",
  Hardware: "Phase 4",
  Payments: "Phase 6",
};

export function Settings(): JSX.Element {
  const [tab, setTab] = useState<Tab>("Branding");

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-fg">Settings</h1>
      <div className="mb-6 flex flex-wrap gap-2 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "-mb-px border-b-2 px-3 py-2 text-sm",
              tab === t
                ? "border-accent text-fg"
                : "border-transparent text-muted hover:text-fg",
            ].join(" ")}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Branding" ? <BrandingSettings /> : null}
      {tab === "Team" ? <PermissionMatrix /> : null}
      {tab === "Tax" ? <TaxSettings /> : null}
      {tab === "Sync" ? <SyncSettings /> : null}
      {PHASE[tab] ? (
        <p className="text-sm text-muted">
          {tab} settings land in {PHASE[tab]}.
        </p>
      ) : null}
    </div>
  );
}
