/**
 * Terminal session state (CLAUDE.md §8). Holds the current authenticated
 * session plus the terminal's branding (which is shown even while locked, so
 * the PIN screen already wears the tenant's accent + name).
 *
 * The store is UI-only server-cache-free state (Zustand, §2). Auth data comes
 * from an injected {@link AuthStore}, so tests use an in-memory seed and the app
 * uses the synced store later without touching this file.
 */
import { create } from "zustand";
import type {
  LoginRequest,
  Session,
  StaffProfile,
  TenantBranding,
} from "@merkat/core";
import { SeedAuthStore, type AuthStore } from "../auth/store.js";
import { applyBranding } from "../theme/accent.js";

export interface SessionState {
  readonly store: AuthStore;
  session: Session | null;
  branding: TenantBranding;
  staff: StaffProfile[];
  error: string | null;
  busy: boolean;

  unlock(staffId: string, pin: string): Promise<boolean>;
  login(req: LoginRequest): Promise<boolean>;
  lock(): void;
  logout(): void;
  updateBranding(next: TenantBranding): void;
  clearError(): void;
}

/** Create the session store around an auth store (injectable for tests). */
export function createSessionStore(store: AuthStore = new SeedAuthStore()) {
  const branding = store.getBranding();
  return create<SessionState>((set, get) => ({
    store,
    session: null,
    branding,
    staff: store.listStaff(),
    error: null,
    busy: false,

    async unlock(staffId, pin) {
      set({ busy: true, error: null });
      try {
        const staff = await get().store.verifyPin(staffId, pin);
        if (!staff) {
          set({ busy: false, error: "Incorrect PIN." });
          return false;
        }
        set({
          busy: false,
          session: { tenant: get().branding, staff, token: null },
        });
        return true;
      } catch {
        set({ busy: false, error: "Could not verify PIN." });
        return false;
      }
    },

    async login(req) {
      set({ busy: true, error: null });
      try {
        const result = await get().store.login(req);
        get().store.saveBranding(result.tenant);
        applyBranding(result.tenant);
        set({
          busy: false,
          branding: result.tenant,
          session: {
            tenant: result.tenant,
            staff: result.staff,
            token: result.token,
          },
        });
        return true;
      } catch (err) {
        set({
          busy: false,
          error: err instanceof Error ? err.message : "Sign-in failed.",
        });
        return false;
      }
    },

    lock() {
      set({ session: null, error: null });
    },

    logout() {
      set({ session: null, error: null });
    },

    updateBranding(next) {
      get().store.saveBranding(next);
      applyBranding(next);
      set((s) => ({
        branding: next,
        session: s.session ? { ...s.session, tenant: next } : s.session,
      }));
    },

    clearError() {
      set({ error: null });
    },
  }));
}

/** App-wide session store (the app uses the default SeedAuthStore for now). */
export const useSession = createSessionStore();
