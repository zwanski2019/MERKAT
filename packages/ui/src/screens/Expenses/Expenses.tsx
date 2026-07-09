/**
 * Expenses + P&L (CLAUDE.md §14). Record operating expenses; the P&L combines
 * order revenue, cost of goods (product cost × units sold), and expenses.
 */
import { useMemo, useState } from "react";
import {
  EXPENSE_CATEGORIES,
  expenseInputSchema,
  formatMoney,
  money,
  profitAndLoss,
  totalExpensesMinor,
  type ExpenseCategory,
} from "@merkat/core";
import { useExpenses } from "../../state/expenses.js";
import { useInventory } from "../../state/inventory.js";
import { useOrders } from "../../state/orders.js";
import { useSession } from "../../state/session.js";

export function Expenses(): JSX.Element {
  const expenses = useExpenses((s) => s.expenses);
  const addExpense = useExpenses((s) => s.addExpense);
  const orders = useOrders((s) => s.orders);
  const items = useInventory((s) => s.items);
  const branding = useSession((s) => s.branding);
  const fmt = (m: number): string =>
    formatMoney(money(m, branding.currency), branding.locale);

  const [category, setCategory] = useState<ExpenseCategory>("supplies");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const pl = useMemo(() => {
    const revenue = orders
      .filter((o) => o.order.status !== "voided")
      .reduce((s, o) => s + o.order.totalMinor, 0);
    const costOf = (productId: string | null): number =>
      items.find((i) => i.product.id === productId)?.product.costMinor ?? 0;
    const cogs = orders.reduce(
      (s, o) => s + o.lines.reduce((t, l) => t + costOf(l.productId) * l.qty, 0),
      0,
    );
    return profitAndLoss(revenue, cogs, totalExpensesMinor(expenses));
  }, [orders, items, expenses]);

  function add(): void {
    const parsed = expenseInputSchema.safeParse({
      category,
      amountMinor: Math.round((Number(amount) || 0) * 100),
      note: note.trim() || null,
    });
    if (!parsed.success) return;
    addExpense(parsed.data);
    setAmount("");
    setNote("");
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold text-fg">Expenses & P&L</h1>

      <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Kpi label="Revenue" value={fmt(pl.revenueMinor)} />
        <Kpi label="Cost of goods" value={fmt(pl.cogsMinor)} />
        <Kpi label="Gross profit" value={fmt(pl.grossProfitMinor)} />
        <Kpi label="Expenses" value={fmt(pl.expensesMinor)} />
        <Kpi
          label="Net profit"
          value={fmt(pl.netProfitMinor)}
          tone={pl.netProfitMinor < 0 ? "danger" : "accent"}
        />
      </dl>

      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-[--radius-card] border border-border p-3">
        <label className="w-32">
          <span className="mb-1 block text-xs text-muted">Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            className="input capitalize"
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="w-24">
          <span className="mb-1 block text-xs text-muted">Amount</span>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input merkat-num"
          />
        </label>
        <label className="flex-1">
          <span className="mb-1 block text-xs text-muted">Note</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} className="input" />
        </label>
        <button
          onClick={add}
          className="rounded-[--radius-control] bg-accent px-4 py-2 font-medium text-white"
        >
          Add expense
        </button>
      </div>

      <div className="divide-y divide-border rounded-[--radius-card] border border-border">
        {expenses.map((e) => (
          <div key={e.id} className="flex items-center justify-between p-3 text-sm">
            <span className="capitalize text-fg">
              {e.category}
              {e.note ? <span className="text-muted"> · {e.note}</span> : null}
            </span>
            <span className="merkat-num text-fg">{fmt(e.amountMinor)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "danger" | "accent";
}): JSX.Element {
  const color =
    tone === "danger" ? "text-danger" : tone === "accent" ? "text-accent" : "text-fg";
  return (
    <div className="rounded-[--radius-card] border border-border bg-surface p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className={["merkat-num mt-1 text-lg font-semibold", color].join(" ")}>
        {value}
      </div>
    </div>
  );
}
