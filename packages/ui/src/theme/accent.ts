/**
 * Runtime tenant accent (CLAUDE.md §11). The accent is the only per-tenant
 * color; it is injected as the `--accent` CSS variable at runtime from
 * `tenant.accent_hex`, and Tailwind's `--color-accent` maps to it, so setting
 * this one variable recolors the whole app live.
 */
import { isValidAccentHex, type TenantBranding } from "@merkat/core";

export function applyAccent(hex: string): void {
  if (!isValidAccentHex(hex)) return;
  const root = document.documentElement;
  root.style.setProperty("--accent", hex);
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute("content", hex);
}

/** Apply everything a terminal themes from its tenant (accent today; logo is
 *  rendered by the shell). */
export function applyBranding(branding: TenantBranding): void {
  applyAccent(branding.accentHex);
}
