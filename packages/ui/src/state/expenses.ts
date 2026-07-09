/**
 * Expenses state (CLAUDE.md §14). Local UI state (Zustand); append-only.
 */
import { create } from "zustand";
import { newId, type Expense, type ExpenseInput } from "@merkat/core";

export interface ExpensesState {
  expenses: Expense[];
  addExpense(input: ExpenseInput): void;
}

export const useExpenses = create<ExpensesState>((set) => ({
  expenses: [
    { id: newId(), category: "rent", amountMinor: 200000, note: "March", at: Date.now() },
    { id: newId(), category: "utilities", amountMinor: 32000, note: null, at: Date.now() },
  ],
  addExpense(input) {
    set((s) => ({
      expenses: [
        {
          id: newId(),
          category: input.category,
          amountMinor: input.amountMinor,
          note: input.note ?? null,
          at: Date.now(),
        },
        ...s.expenses,
      ],
    }));
  },
}));
