import { beforeEach, describe, expect, it } from "vitest";
import { expectedCashMinor, varianceMinor } from "@merkat/core";
import { useCash } from "./cash.js";

beforeEach(() => useCash.getState().startNew());

describe("cash shift store (§5)", () => {
  it("opens, records movements + a POS sale, and closes to a Z-report", () => {
    const cash = useCash.getState();
    cash.openShift(10000, "amira"); // $100 float
    cash.recordCashSale(3239);
    cash.addMovement({ type: "in", amountMinor: 2000, reason: "petty" });
    cash.addMovement({ type: "out", amountMinor: 1500, reason: "supplier" });

    const open = useCash.getState().shift!;
    expect(expectedCashMinor(open)).toBe(10000 + 3239 + 2000 - 1500);

    useCash.getState().closeShift(13739); // exact count
    const closed = useCash.getState().shift!;
    expect(closed.closedAt).not.toBeNull();
    expect(varianceMinor(closed, closed.countedMinor!)).toBe(0);
  });

  it("ignores movements when no shift is open", () => {
    useCash.getState().recordCashSale(1000);
    expect(useCash.getState().shift).toBeNull();
  });
});
