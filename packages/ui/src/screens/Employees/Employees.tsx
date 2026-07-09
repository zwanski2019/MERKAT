/**
 * Employees & time clock (CLAUDE.md §14). Clock staff in/out, track hours and
 * tips per open shift, and add employees.
 */
import { useEffect, useState } from "react";
import {
  employeeInputSchema,
  formatMoney,
  hoursWorked,
  isClockedIn,
  money,
  type Role,
} from "@merkat/core";
import { useEmployees } from "../../state/employees.js";
import { useSession } from "../../state/session.js";

function useNow(ms = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export function Employees(): JSX.Element {
  const employees = useEmployees((s) => s.employees);
  const entries = useEmployees((s) => s.entries);
  const clockIn = useEmployees((s) => s.clockIn);
  const clockOut = useEmployees((s) => s.clockOut);
  const addTips = useEmployees((s) => s.addTips);
  const addEmployee = useEmployees((s) => s.addEmployee);
  const branding = useSession((s) => s.branding);
  const now = useNow();
  const fmt = (m: number): string =>
    formatMoney(money(m, branding.currency), branding.locale);

  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("cashier");

  function openEntry(employeeId: string) {
    return entries.find((e) => e.employeeId === employeeId && e.clockOut === null);
  }

  function add(): void {
    const parsed = employeeInputSchema.safeParse({ name, role });
    if (!parsed.success) return;
    addEmployee(parsed.data);
    setName("");
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold text-fg">Employees</h1>

      <div className="mb-6 divide-y divide-border rounded-[--radius-card] border border-border">
        {employees.map((emp) => {
          const on = isClockedIn(entries, emp.id);
          const entry = openEntry(emp.id);
          return (
            <div key={emp.id} className="flex items-center gap-3 p-3 text-sm">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-fg">{emp.name}</div>
                <div className="text-xs capitalize text-muted">{emp.role}</div>
              </div>
              {entry ? (
                <span className="merkat-num text-xs text-muted">
                  {hoursWorked(entry, now).toFixed(2)}h · {fmt(entry.tipsMinor)} tips
                </span>
              ) : null}
              {on ? (
                <>
                  <button
                    onClick={() => addTips(emp.id, 500)}
                    className="rounded-[--radius-control] border border-border px-2.5 py-1 text-xs text-fg hover:border-accent"
                  >
                    + {fmt(500)} tip
                  </button>
                  <button
                    onClick={() => clockOut(emp.id)}
                    className="rounded-[--radius-control] border border-border px-3 py-1.5 text-fg hover:border-accent"
                  >
                    Clock out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => clockIn(emp.id)}
                  className="rounded-[--radius-control] bg-accent px-3 py-1.5 font-medium text-white"
                >
                  Clock in
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-[--radius-card] border border-border p-3">
        <label className="flex-1">
          <span className="mb-1 block text-xs text-muted">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
        </label>
        <label className="w-32">
          <span className="mb-1 block text-xs text-muted">Role</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="input capitalize"
          >
            {(["owner", "manager", "cashier", "kitchen"] as Role[]).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={add}
          className="rounded-[--radius-control] bg-accent px-4 py-2 font-medium text-white"
        >
          Add employee
        </button>
      </div>
    </div>
  );
}
