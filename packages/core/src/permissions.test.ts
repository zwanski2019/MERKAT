import { describe, expect, it } from "vitest";
import { can } from "./permissions.js";

describe("permission matrix (§8)", () => {
  it("owner can do everything managers cannot", () => {
    expect(can("owner", "settings.manage")).toBe(true);
    expect(can("owner", "team.manage")).toBe(true);
    expect(can("manager", "settings.manage")).toBe(false);
  });

  it("cashier is limited to selling", () => {
    expect(can("cashier", "pos.sell")).toBe(true);
    expect(can("cashier", "refunds.issue")).toBe(false);
    expect(can("cashier", "reports.view")).toBe(false);
  });

  it("kitchen can only bump tickets", () => {
    expect(can("kitchen", "kds.bump")).toBe(true);
    expect(can("kitchen", "pos.sell")).toBe(false);
  });

  it("per-tenant overrides win over the role default", () => {
    // grant a cashier refunds; revoke a manager's void
    expect(can("cashier", "refunds.issue", { "refunds.issue": true })).toBe(
      true,
    );
    expect(can("manager", "orders.void", { "orders.void": false })).toBe(false);
  });
});
