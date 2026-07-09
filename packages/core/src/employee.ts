/**
 * Employees + time clock (CLAUDE.md §14 → in scope). Clock in/out produces time
 * entries; tips accrue per shift. Hours are derived from timestamps; money is
 * integer minor units (§1.5).
 */
import { z } from "zod";
import type { Role } from "./permissions.js";

export interface Employee {
  readonly id: string;
  readonly name: string;
  readonly role: Role;
  readonly active: boolean;
}

export const employeeInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  role: z.enum(["owner", "manager", "cashier", "kitchen"]),
});
export type EmployeeInput = z.infer<typeof employeeInputSchema>;

export interface TimeEntry {
  readonly id: string;
  readonly employeeId: string;
  readonly clockIn: number;
  readonly clockOut: number | null;
  readonly tipsMinor: number;
}

/** Hours worked (to 2 dp); uses `now` while the entry is still open. */
export function hoursWorked(entry: TimeEntry, now: number): number {
  const end = entry.clockOut ?? now;
  return Math.max(0, Math.round(((end - entry.clockIn) / 3_600_000) * 100) / 100);
}

export function totalTipsMinor(entries: readonly TimeEntry[]): number {
  return entries.reduce((sum, e) => sum + e.tipsMinor, 0);
}

export function isClockedIn(entries: readonly TimeEntry[], employeeId: string): boolean {
  return entries.some((e) => e.employeeId === employeeId && e.clockOut === null);
}
