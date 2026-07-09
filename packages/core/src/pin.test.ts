import { describe, expect, it } from "vitest";
import { hashPin, isValidPinFormat, verifyPin } from "./pin.js";

describe("PIN hashing (§8, offline)", () => {
  it("hashes and verifies a 4-digit PIN with no network", async () => {
    const hash = await hashPin("4821");
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(await verifyPin("4821", hash)).toBe(true);
  });

  it("rejects the wrong PIN", async () => {
    const hash = await hashPin("4821");
    expect(await verifyPin("0000", hash)).toBe(false);
  });

  it("salts: the same PIN hashes differently each time", async () => {
    const a = await hashPin("1234");
    const b = await hashPin("1234");
    expect(a).not.toEqual(b);
    expect(await verifyPin("1234", a)).toBe(true);
    expect(await verifyPin("1234", b)).toBe(true);
  });

  it("rejects malformed PINs", async () => {
    expect(isValidPinFormat("12")).toBe(false);
    expect(isValidPinFormat("abcd")).toBe(false);
    expect(isValidPinFormat("12345")).toBe(false);
    await expect(hashPin("12")).rejects.toThrow();
    expect(await verifyPin("12", "$argon2id$whatever")).toBe(false);
  });
});
