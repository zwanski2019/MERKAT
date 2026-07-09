/**
 * Settings → Branding (CLAUDE.md §5, §11). Editing the accent recolors the app
 * live (the whole UI reads `--accent`), and the logo/name feed the shell and
 * PIN screen. White-label: every tenant sets its own name, logo, and accent.
 */
import { useState, type ReactNode } from "react";
import {
  BUSINESS_TYPES,
  isValidAccentHex,
  type BusinessType,
  type TenantBranding,
} from "@merkat/core";
import { useSession } from "../../state/session.js";
import { applyAccent } from "../../theme/accent.js";

export function BrandingSettings(): JSX.Element {
  const branding = useSession((s) => s.branding);
  const updateBranding = useSession((s) => s.updateBranding);

  const [draft, setDraft] = useState<TenantBranding>(branding);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof TenantBranding>(
    key: K,
    value: TenantBranding[K],
  ): void {
    setSaved(false);
    setDraft((d) => {
      const next = { ...d, [key]: value };
      // Preview the accent live as the operator types (§11).
      if (key === "accentHex" && typeof value === "string") applyAccent(value);
      return next;
    });
  }

  const accentValid = isValidAccentHex(draft.accentHex);

  return (
    <div className="max-w-lg">
      <div className="mb-6 flex items-center gap-4">
        <Preview branding={draft} />
        <div>
          <div className="font-semibold text-fg">{draft.name || "—"}</div>
          <div className="text-sm text-muted">
            White-label preview · accent {draft.accentHex}
          </div>
        </div>
      </div>

      <Field label="Business name">
        <input
          value={draft.name}
          onChange={(e) => set("name", e.target.value)}
          className="w-full rounded-[--radius-control] border border-border bg-canvas px-3 py-2 text-fg"
        />
      </Field>

      <Field label="Logo URL">
        <input
          value={draft.logoUrl ?? ""}
          onChange={(e) => set("logoUrl", e.target.value || null)}
          placeholder="https://…"
          className="w-full rounded-[--radius-control] border border-border bg-canvas px-3 py-2 text-fg"
        />
      </Field>

      <Field label="Business type">
        <select
          value={draft.businessType}
          onChange={(e) => set("businessType", e.target.value as BusinessType)}
          className="w-full rounded-[--radius-control] border border-border bg-canvas px-3 py-2 capitalize text-fg"
        >
          {BUSINESS_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-muted">
          Switches the vertical — restaurant unlocks Floor, Kitchen, and Menu.
        </span>
      </Field>

      <Field label="Accent color">
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={accentValid ? draft.accentHex : "#000000"}
            onChange={(e) => set("accentHex", e.target.value)}
            className="size-10 rounded-[--radius-control] border border-border"
            aria-label="Accent color picker"
          />
          <input
            value={draft.accentHex}
            onChange={(e) => set("accentHex", e.target.value)}
            className="merkat-num w-32 rounded-[--radius-control] border border-border bg-canvas px-3 py-2 text-fg"
          />
          {!accentValid ? (
            <span className="text-sm text-danger">Use #RRGGBB</span>
          ) : null}
        </div>
      </Field>

      <div className="mt-6 flex items-center gap-3">
        <button
          disabled={!accentValid || !draft.name}
          onClick={() => {
            updateBranding(draft);
            setSaved(true);
          }}
          className="rounded-[--radius-control] bg-accent px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          Save branding
        </button>
        <button
          onClick={() => {
            setDraft(branding);
            applyAccent(branding.accentHex);
            setSaved(false);
          }}
          className="rounded-[--radius-control] border border-border px-4 py-2 text-fg"
        >
          Reset
        </button>
        {saved ? <span className="text-sm text-accent">Saved ✓</span> : null}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <label className="mb-4 block">
      <span className="mb-1 block text-sm text-fg">{label}</span>
      {children}
    </label>
  );
}

function Preview({ branding }: { branding: TenantBranding }): JSX.Element {
  if (branding.logoUrl) {
    return (
      <img
        src={branding.logoUrl}
        alt={branding.name}
        className="size-14 rounded-[--radius-control] border border-border object-contain"
      />
    );
  }
  return (
    <span className="flex size-14 items-center justify-center rounded-[--radius-control] bg-accent text-xl font-bold text-white">
      {branding.name.slice(0, 1) || "?"}
    </span>
  );
}
