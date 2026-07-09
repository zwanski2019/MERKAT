import { describe, expect, it } from "vitest";
import { buildTransferMovements } from "./transfer.js";
import { profitAndLoss, totalExpensesMinor, type Expense } from "./expense.js";
import { hoursWorked, isClockedIn, totalTipsMinor, type TimeEntry } from "./employee.js";

const LOC_A = "0191a000-0000-7000-8000-0000000000a0";
const LOC_B = "0191a000-0000-7000-8000-0000000000b0";

describe("stock transfers (§4, §1.3)", () => {
  it("emits paired out/in movements that conserve net stock", () => {
    const moves = buildTransferMovements({
      fromLocationId: LOC_A,
      toLocationId: LOC_B,
      lines: [{ productId: "p1", name: "Serum", qty: 5 }],
    });
    expect(moves).toHaveLength(2);
    const out = moves.find((m) => m.reason === "transfer_out")!;
    const inn = moves.find((m) => m.reason === "transfer_in")!;
    expect(out.delta).toBe(-5);
    expect(inn.delta).toBe(5);
    expect(out.locationId).toBe(LOC_A);
    expect(inn.locationId).toBe(LOC_B);
    expect(out.refId).toBe(inn.refId); // paired
    expect(out.delta + inn.delta).toBe(0); // net conserved
  });
});

describe("expenses + P&L (§14)", () => {
  it("totals expenses and computes P&L", () => {
    const expenses: Expense[] = [
      { id: "1", category: "rent", amountMinor: 200000, note: null, at: 1 },
      { id: "2", category: "utilities", amountMinor: 30000, note: null, at: 2 },
    ];
    expect(totalExpensesMinor(expenses)).toBe(230000);
    const pl = profitAndLoss(1000000, 400000, 230000);
    expect(pl.grossProfitMinor).toBe(600000);
    expect(pl.netProfitMinor).toBe(370000);
  });
});

describe("employees + time clock (§14)", () => {
  it("derives hours worked and tracks clocked-in state", () => {
    const open: TimeEntry = {
      id: "t1",
      employeeId: "e1",
      clockIn: 0,
      clockOut: null,
      tipsMinor: 1500,
    };
    expect(hoursWorked(open, 3_600_000)).toBe(1); // 1 hour
    expect(isClockedIn([open], "e1")).toBe(true);
    expect(isClockedIn([{ ...open, clockOut: 3_600_000 }], "e1")).toBe(false);
    expect(totalTipsMinor([open, { ...open, id: "t2", tipsMinor: 500 }])).toBe(2000);
  });
});
