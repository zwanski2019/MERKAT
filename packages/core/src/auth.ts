/**
 * Auth contracts (CLAUDE.md §8). Two paths:
 *   - Cloud login: email + password -> JWT (tenant-scoped), used to bind a
 *     terminal to a tenant.
 *   - Terminal PIN unlock: staff pick their avatar and enter a 4-digit PIN,
 *     validated offline against the synced hash.
 * Zod schemas live here so the API, sync payloads, and UI forms share them (§2).
 */
import { z } from "zod";
import type { BusinessType } from "./features.js";
import type { Role } from "./permissions.js";

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

/** Tenant tax setup (CLAUDE.md §4 `tax_config`). Full editing is Phase 6. */
export interface TaxConfig {
  readonly rate: number; // e.g. 0.08
  readonly inclusive: boolean; // prices already include tax?
}

/** Public-safe branding a terminal needs to render before/without a session. */
export interface TenantBranding {
  readonly id: string;
  readonly name: string;
  readonly businessType: BusinessType;
  readonly accentHex: string;
  readonly logoUrl: string | null;
  readonly currency: string;
  readonly locale: string;
  readonly taxConfig?: TaxConfig;
}

/** A staff member as shown on the PIN-unlock avatar picker (no hash exposed). */
export interface StaffProfile {
  readonly id: string;
  readonly name: string;
  readonly role: Role;
}

/** The result of a successful cloud login. */
export interface LoginResult {
  readonly token: string;
  readonly tenant: TenantBranding;
  readonly staff: StaffProfile;
}

/** An authenticated terminal session (after login and/or PIN unlock). */
export interface Session {
  readonly tenant: TenantBranding;
  readonly staff: StaffProfile;
  /** JWT from cloud login; null when the session came from offline PIN unlock. */
  readonly token: string | null;
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function isValidAccentHex(hex: string): boolean {
  return HEX_RE.test(hex);
}
