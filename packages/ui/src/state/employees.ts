/**
 * Employees + time clock state (CLAUDE.md §14). Clock in/out and tips per shift.
 */
import { create } from "zustand";
import { newId, type Employee, type EmployeeInput, type TimeEntry } from "@merkat/core";

export interface EmployeesState {
  employees: Employee[];
  entries: TimeEntry[];
  addEmployee(input: EmployeeInput): void;
  clockIn(employeeId: string): void;
  clockOut(employeeId: string): void;
  addTips(employeeId: string, tipsMinor: number): void;
}

export const useEmployees = create<EmployeesState>((set, get) => ({
  employees: [
    { id: "0191a000-0000-7000-8000-0000000000a1", name: "Amira", role: "owner", active: true },
    { id: "0191a000-0000-7000-8000-0000000000a2", name: "Sofia", role: "cashier", active: true },
    { id: newId(), name: "Karim", role: "kitchen", active: true },
  ],
  entries: [],

  addEmployee(input) {
    set((s) => ({
      employees: [
        ...s.employees,
        { id: newId(), name: input.name, role: input.role, active: true },
      ],
    }));
  },

  clockIn(employeeId) {
    const open = get().entries.find((e) => e.employeeId === employeeId && e.clockOut === null);
    if (open) return;
    set((s) => ({
      entries: [
        ...s.entries,
        { id: newId(), employeeId, clockIn: Date.now(), clockOut: null, tipsMinor: 0 },
      ],
    }));
  },

  clockOut(employeeId) {
    set((s) => ({
      entries: s.entries.map((e) =>
        e.employeeId === employeeId && e.clockOut === null
          ? { ...e, clockOut: Date.now() }
          : e,
      ),
    }));
  },

  addTips(employeeId, tipsMinor) {
    set((s) => {
      const open = s.entries.find((e) => e.employeeId === employeeId && e.clockOut === null);
      if (!open) return s;
      return {
        entries: s.entries.map((e) =>
          e.id === open.id ? { ...e, tipsMinor: e.tipsMinor + tipsMinor } : e,
        ),
      };
    });
  },
}));
