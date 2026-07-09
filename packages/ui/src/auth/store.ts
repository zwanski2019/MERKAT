/**
 * Terminal auth data source (CLAUDE.md §8). The UI talks only to this interface
 * — the same iface+impl pattern as SyncEngine (§6) and HardwareBridge (§7).
 *
 * Phase 2 ships {@link SeedAuthStore}: an in-memory tenant + staff carrying real
 * argon2id PIN hashes, so offline PIN unlock genuinely works standalone. Phase 5
 * swaps in a store backed by the synced local SQLite `staff` table — the UI does
 * not change.
 */
import {
  verifyPin,
  verifySecret,
  type LoginRequest,
  type LoginResult,
  type StaffProfile,
  type TenantBranding,
} from "@merkat/core";

export interface AuthStore {
  /** Branding for the tenant this terminal is bound to (renders while locked). */
  getBranding(): TenantBranding;
  /** Staff shown on the PIN-unlock avatar picker. */
  listStaff(): StaffProfile[];
  /** Validate a staff PIN offline; resolves to the profile or null. */
  verifyPin(staffId: string, pin: string): Promise<StaffProfile | null>;
  /** Cloud login (email + password → JWT). Requires connectivity. */
  login(req: LoginRequest): Promise<LoginResult>;
  /** Persist Settings→Branding changes for this terminal. */
  saveBranding(next: TenantBranding): void;
}

interface SeedStaff extends StaffProfile {
  readonly pinHash: string;
  /** Owner-only: password hash for the cloud-login path. */
  readonly passwordHash?: string;
  readonly email?: string;
}

const BRANDING_KEY = "merkat.branding";

// Demo tenant used until real synced data arrives (Phase 5). PIN hashes are
// precomputed argon2id (packages/core); demo PINs: Amira 4821, Sofia 1234.
const DEMO_BRANDING: TenantBranding = {
  id: "0191a000-0000-7000-8000-000000000001",
  name: "Lumière Cosmetics",
  businessType: "retail",
  accentHex: "#E11D74",
  logoUrl: null,
  currency: "USD",
  locale: "en-US",
  taxConfig: { rate: 0.08, inclusive: false },
};

const DEMO_STAFF: SeedStaff[] = [
  {
    id: "0191a000-0000-7000-8000-0000000000a1",
    name: "Amira",
    role: "owner",
    email: "amira@lumiere.example",
    pinHash:
      "$argon2id$v=19$m=19456,t=3,p=1$YgnXg1NBvbHYMBiemBR4kQ$tXP05Zjcd1BCpQdp2FqOe8HMk1EkSZU5dgHZYMEBw2E",
    // password hash for demo owner password "lumiere-owner"
    passwordHash:
      "$argon2id$v=19$m=19456,t=3,p=1$uHLURJ+mf7q8JIZGV/URXg$iwaFOegqbqdOn1R8usR9gyTzDsCJvM1/jWnn0F9xeW4",
  },
  {
    id: "0191a000-0000-7000-8000-0000000000a2",
    name: "Sofia",
    role: "cashier",
    pinHash:
      "$argon2id$v=19$m=19456,t=3,p=1$Zusmum4lV+n8zPW4itnDsw$pDwM2B+qwCQUj9Z7pgA3yZCcd3LnMOrIk7xP8qumj1c",
  },
];

function stripHashes(s: SeedStaff): StaffProfile {
  return { id: s.id, name: s.name, role: s.role };
}

export class SeedAuthStore implements AuthStore {
  private branding: TenantBranding;
  private readonly staff: SeedStaff[];
  private readonly apiBaseUrl: string | null;

  constructor(opts: { apiBaseUrl?: string | null } = {}) {
    this.staff = DEMO_STAFF;
    this.apiBaseUrl = opts.apiBaseUrl ?? null;
    this.branding = loadBranding() ?? DEMO_BRANDING;
  }

  getBranding(): TenantBranding {
    return this.branding;
  }

  listStaff(): StaffProfile[] {
    return this.staff.map(stripHashes);
  }

  async verifyPin(staffId: string, pin: string): Promise<StaffProfile | null> {
    const member = this.staff.find((s) => s.id === staffId);
    if (!member) return null;
    const ok = await verifyPin(pin, member.pinHash);
    return ok ? stripHashes(member) : null;
  }

  async login(req: LoginRequest): Promise<LoginResult> {
    if (this.apiBaseUrl) {
      const res = await fetch(`${this.apiBaseUrl}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(req),
      });
      if (!res.ok) throw new Error("Invalid email or password.");
      return (await res.json()) as LoginResult;
    }
    // No cloud endpoint configured — verify the seeded owner locally so the
    // standalone demo works. Production always routes through the API above.
    const owner = this.staff.find((s) => s.email === req.email);
    if (
      !owner ||
      !owner.passwordHash ||
      !(await verifySecret(req.password, owner.passwordHash))
    ) {
      throw new Error("Invalid email or password.");
    }
    return {
      token: `offline:${owner.id}`,
      tenant: this.branding,
      staff: stripHashes(owner),
    };
  }

  saveBranding(next: TenantBranding): void {
    this.branding = next;
    saveBrandingToStorage(next);
  }
}

function loadBranding(): TenantBranding | null {
  try {
    const raw = globalThis.localStorage?.getItem(BRANDING_KEY);
    return raw ? (JSON.parse(raw) as TenantBranding) : null;
  } catch {
    return null;
  }
}

function saveBrandingToStorage(b: TenantBranding): void {
  try {
    globalThis.localStorage?.setItem(BRANDING_KEY, JSON.stringify(b));
  } catch {
    // storage unavailable (private mode / SSR) — non-fatal
  }
}
