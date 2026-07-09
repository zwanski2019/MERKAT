/**
 * Cash management / shift domain (CLAUDE.md §5 Settings→Cash; POS essential).
 * A shift opens with a float, records cash movements (paid in/out, sales), and
 * closes with a counted amount — the Z-report is expected vs counted (variance).
 * Append-only movements; money is integer minor units (§1.5).
 */
import { z } from "zod";

export type CashMovementType = "float" | "sale" | "in" | "out";

export interface CashMovement {
  readonly id: string;
  readonly type: CashMovementType;
  readonly amountMinor: number; // signed: in/sale/float positive, out negative
  readonly reason: string | null;
  readonly at: number;
}

export interface CashShift {
  readonly id: string;
  readonly openedBy: string | null;
  readonly openingFloatMinor: number;
  readonly openedAt: number;
  readonly closedAt: number | null;
  readonly countedMinor: number | null;
  readonly movements: readonly CashMovement[];
}

export const cashMovementInputSchema = z.object({
  type: z.enum(["in", "out"]),
  amountMinor: z.number().int().positive(),
  reason: z.string().trim().min(1).nullish(),
});
export type CashMovementInput = z.infer<typeof cashMovementInputSchema>;

/** Expected drawer cash: opening float plus all signed movements. */
export function expectedCashMinor(shift: CashShift): number {
  return (
    shift.openingFloatMinor +
    shift.movements.reduce((sum, m) => sum + m.amountMinor, 0)
  );
}

/** Z-report variance: counted minus expected (negative = short). */
export function varianceMinor(shift: CashShift, countedMinor: number): number {
  return countedMinor - expectedCashMinor(shift);
}

export interface CashShiftSummary {
  readonly openingFloatMinor: number;
  readonly cashSalesMinor: number;
  readonly paidInMinor: number;
  readonly paidOutMinor: number;
  readonly expectedMinor: number;
}

export function summarizeShift(shift: CashShift): CashShiftSummary {
  const sum = (t: CashMovementType): number =>
    shift.movements
      .filter((m) => m.type === t)
      .reduce((s, m) => s + m.amountMinor, 0);
  return {
    openingFloatMinor: shift.openingFloatMinor,
    cashSalesMinor: sum("sale"),
    paidInMinor: sum("in"),
    paidOutMinor: sum("out"),
    expectedMinor: expectedCashMinor(shift),
  };
}
