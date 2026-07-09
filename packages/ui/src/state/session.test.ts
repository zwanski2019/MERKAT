import { beforeEach, describe, expect, it } from "vitest";
import { SeedAuthStore } from "../auth/store.js";
import { createSessionStore } from "./session.js";

const AMIRA = "0191a000-0000-7000-8000-0000000000a1"; // owner, PIN 4821
const SOFIA = "0191a000-0000-7000-8000-0000000000a2"; // cashier, PIN 1234

function newStore() {
  return createSessionStore(new SeedAuthStore());
}

beforeEach(() => {
  globalThis.localStorage?.clear();
  document.documentElement.removeAttribute("style");
});

describe("offline PIN unlock (§8 gate)", () => {
  it("unlocks with the correct PIN, no network", async () => {
    const s = newStore();
    const ok = await s.getState().unlock(AMIRA, "4821");
    expect(ok).toBe(true);
    expect(s.getState().session?.staff.role).toBe("owner");
    expect(s.getState().session?.token).toBeNull(); // PIN path, no JWT
  });

  it("rejects the wrong PIN and surfaces an error", async () => {
    const s = newStore();
    const ok = await s.getState().unlock(SOFIA, "0000");
    expect(ok).toBe(false);
    expect(s.getState().session).toBeNull();
    expect(s.getState().error).toBe("Incorrect PIN.");
  });

  it("lock clears the session but keeps branding", async () => {
    const s = newStore();
    await s.getState().unlock(AMIRA, "4821");
    const brand = s.getState().branding;
    s.getState().lock();
    expect(s.getState().session).toBeNull();
    expect(s.getState().branding).toEqual(brand);
  });
});

describe("cloud login (§8)", () => {
  it("signs in the seeded owner and carries a token", async () => {
    const s = newStore();
    const ok = await s
      .getState()
      .login({ email: "amira@lumiere.example", password: "lumiere-owner" });
    expect(ok).toBe(true);
    expect(s.getState().session?.token).toMatch(/^offline:/);
  });

  it("rejects bad credentials", async () => {
    const s = newStore();
    const ok = await s
      .getState()
      .login({ email: "amira@lumiere.example", password: "wrong" });
    expect(ok).toBe(false);
    expect(s.getState().session).toBeNull();
  });
});

describe("branding recolors the app (§11 gate)", () => {
  it("updateBranding sets the --accent CSS variable live", () => {
    const s = newStore();
    s.getState().updateBranding({
      ...s.getState().branding,
      accentHex: "#123456",
    });
    expect(document.documentElement.style.getPropertyValue("--accent")).toBe(
      "#123456",
    );
  });

  it("persists branding so a reopened terminal keeps its brand", () => {
    const s1 = newStore();
    s1.getState().updateBranding({
      ...s1.getState().branding,
      name: "Custom Shop",
      accentHex: "#0ea5e9",
    });
    // a fresh store reads persisted branding from storage
    const s2 = newStore();
    expect(s2.getState().branding.name).toBe("Custom Shop");
    expect(s2.getState().branding.accentHex).toBe("#0ea5e9");
  });
});
