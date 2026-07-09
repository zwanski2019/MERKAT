/**
 * Cash drawer / shift state (CLAUDE.md §2, §5). Open a shift with a float,
 * record cash in/out (and POS cash sales), and close with a counted amount for
 * the Z-report. Movements are append-only (§1.4).
 */
import { create } from "zustand";
import { newId, type CashMovementInput, type CashShift } from "@merkat/core";

export interface CashState {
  shift: CashShift | null;
  openShift(openingFloatMinor: number, openedBy: string | null): void;
  addMovement(input: CashMovementInput): void;
  recordCashSale(amountMinor: number): void;
  closeShift(countedMinor: number): void;
  startNew(): void;
}

export const useCash = create<CashState>((set, get) => ({
  shift: null,

  openShift(openingFloatMinor, openedBy) {
    set({
      shift: {
        id: newId(),
        openedBy,
        openingFloatMinor,
        openedAt: Date.now(),
        closedAt: null,
        countedMinor: null,
        movements: [],
      },
    });
  },

  addMovement(input) {
    const shift = get().shift;
    if (!shift || shift.closedAt) return;
    const amountMinor =
      input.type === "out" ? -input.amountMinor : input.amountMinor;
    set({
      shift: {
        ...shift,
        movements: [
          ...shift.movements,
          {
            id: newId(),
            type: input.type,
            amountMinor,
            reason: input.reason ?? null,
            at: Date.now(),
          },
        ],
      },
    });
  },

  recordCashSale(amountMinor) {
    const shift = get().shift;
    if (!shift || shift.closedAt) return;
    set({
      shift: {
        ...shift,
        movements: [
          ...shift.movements,
          {
            id: newId(),
            type: "sale",
            amountMinor,
            reason: null,
            at: Date.now(),
          },
        ],
      },
    });
  },

  closeShift(countedMinor) {
    const shift = get().shift;
    if (!shift || shift.closedAt) return;
    set({ shift: { ...shift, closedAt: Date.now(), countedMinor } });
  },

  startNew() {
    set({ shift: null });
  },
}));
