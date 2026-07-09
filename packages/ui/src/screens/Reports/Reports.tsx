/**
 * Reports (CLAUDE.md §5): data cards with a per-card AI takeaway (§9, via
 * tool-use) and a recent-transactions table. Chart grid (Recharts) is a later
 * pass; the takeaways are advisory.
 */
import { useEffect, useState } from "react";
import { formatMoney, money } from "@merkat/core";
import { askAssistant } from "../../ai/assistant.js";
import { UiAiDataSource } from "../../ai/datasource.js";
import { useOrders } from "../../state/orders.js";
import { useSession } from "../../state/session.js";

const data = new UiAiDataSource();
const RANGE = {
  from: "2026-07-01T00:00:00.000Z",
  to: "2026-07-08T00:00:00.000Z",
};

export function Reports(): JSX.Element {
  const branding = useSession((s) => s.branding);
  const orders = useOrders((s) => s.orders);
  const fmt = (m: number): string =>
    formatMoney(money(m, branding.currency), branding.locale);

  const top = data.topProducts(RANGE, 5, "revenue");
  const [takeaway, setTakeaway] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void askAssistant("Show me my best sellers").then((r) => {
      if (live) setTakeaway(r.answer);
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-fg">Reports</h1>

      <div className="mb-6 rounded-[--radius-card] border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium text-fg">Top products</h2>
          <span className="flex items-center gap-1 text-xs text-muted">
            <span className="text-accent">✦</span> {takeaway ?? "…"}
          </span>
        </div>
        {top.length === 0 ? (
          <p className="text-sm text-muted">No sales yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {top.map((p) => (
              <div
                key={p.productId}
                className="flex justify-between py-2 text-sm"
              >
                <span className="text-fg">{p.name}</span>
                <span className="merkat-num text-fg">
                  {fmt(p.revenueMinor)} · {p.units} units
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <h2 className="mb-2 font-medium text-fg">Recent transactions</h2>
      {orders.length === 0 ? (
        <p className="text-sm text-muted">No transactions yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-[--radius-card] border border-border">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="bg-surface text-left text-muted">
                <th className="p-3 font-medium">Order</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 10).map((r) => (
                <tr key={r.order.id} className="border-t border-border">
                  <td className="merkat-num p-3 text-fg">
                    #{r.order.id.slice(0, 8)}
                  </td>
                  <td className="p-3 capitalize text-muted">
                    {r.order.status}
                  </td>
                  <td className="merkat-num p-3 text-right text-fg">
                    {fmt(r.order.totalMinor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
