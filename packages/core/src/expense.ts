/**
 * Expenses + a simple P&L (CLAUDE.md §14 — accounting export post-v1; this is
 * the operator-facing basics). Money is integer minor units (§1.5).
 */
import { z } from "zod";

export const EXPENSE_CATEGORIES = [
  "rent",
  "utilities",
  "supplies",
  "wages",
  "marketing",
  "other",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface Expense {
  readonly id: string;
  readonly category: ExpenseCategory;
  readonly amountMinor: number;
  readonly note: string | null;
  readonly at: number;
}

export const expenseInputSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  amountMinor: z.number().int().positive(),
  note: z.string().trim().min(1).nullish(),
});
export type ExpenseInput = z.infer<typeof expenseInputSchema>;

export function totalExpensesMinor(expenses: readonly Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amountMinor, 0);
}

export interface ProfitAndLoss {
  readonly revenueMinor: number;
  readonly cogsMinor: number;
  readonly grossProfitMinor: number;
  readonly expensesMinor: number;
  readonly netProfitMinor: number;
}

/** Gross = revenue − COGS; net = gross − operating expenses. */
export function profitAndLoss(
  revenueMinor: number,
  cogsMinor: number,
  expensesMinor: number,
): ProfitAndLoss {
  const grossProfitMinor = revenueMinor - cogsMinor;
  return {
    revenueMinor,
    cogsMinor,
    grossProfitMinor,
    expensesMinor,
    netProfitMinor: grossProfitMinor - expensesMinor,
  };
}
