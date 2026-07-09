import { describe, expect, it } from "vitest";
import {
  expectedCashMinor,
  summarizeShift,
  varianceMinor,
  type CashShift,
} from "./cash.js";

const shift: CashShift = {
  id: "sh1",
  openedBy: "amira",
  openingFloatMinor: 10000, // $100 float
  openedAt: 1000,
  closedAt: null,
  countedMinor: null,
  movements: [
    { id: "m1", type: "sale", amountMinor: 3239, reason: null, at: 1100 },
    { id: "m2", type: "in", amountMinor: 2000, reason: "petty", at: 1200 },
    { id: "m3", type: "out", amountMinor: -1500, reason: "supplier", at: 1300 },
  ],
};

describe("cash shift / Z-report (§5)", () => {
  it("computes expected drawer cash from float + movements", () => {
    expect(expectedCashMinor(shift)).toBe(10000 + 3239 + 2000 - 1500);
  });

  it("computes variance (counted − expected)", () => {
    const expected = expectedCashMinor(shift);
    expect(varianceMinor(shift, expected)).toBe(0); // balanced
    expect(varianceMinor(shift, expected - 500)).toBe(-500); // short
  });

  it("summarizes the shift by movement type", () => {
    const s = summarizeShift(shift);
    expect(s.cashSalesMinor).toBe(3239);
    expect(s.paidInMinor).toBe(2000);
    expect(s.paidOutMinor).toBe(-1500);
    expect(s.expectedMinor).toBe(13739);
  });
});
