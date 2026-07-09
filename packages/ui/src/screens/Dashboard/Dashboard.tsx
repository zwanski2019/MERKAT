/**
 * Dashboard (CLAUDE.md §5): KPIs + AI insights. The insight comes from the
 * assistant via tool-use over real data (§9) — advisory, never mutating.
 */
import { useEffect, useState } from "react";
import { formatMoney, money } from "@merkat/core";
import { askAssistant } from "../../ai/assistant.js";
import { UiAiDataSource } from "../../ai/datasource.js";
import { useSession } from "../../state/session.js";

const data = new UiAiDataSource();

export function Dashboard(): JSX.Element {
  const branding = useSession((s) => s.branding);
  const fmt = (m: number): string =>
    formatMoney(money(m, branding.currency), branding.locale);

  const summary = data.salesSummary();
  const low = data.lowStock();
  const [insight, setInsight] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void askAssistant("What's running low on stock?").then((r) => {
      if (live) setInsight(r.answer);
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-fg">Dashboard</h1>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi label="Revenue" value={fmt(summary.totalRevenueMinor)} />
        <Kpi label="Orders" value={String(summary.orders)} />
        <Kpi label="Low on stock" value={String(low.length)} />
      </div>

      <div className="mt-4 rounded-[--radius-card] border border-border bg-surface p-4">
        <div className="mb-1 flex items-center gap-2 text-sm text-muted">
          <span className="text-accent">✦</span> AI insight
        </div>
        <p className="text-fg">{insight ?? "Analyzing your data…"}</p>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-[--radius-card] border border-border bg-surface p-4">
      <div className="text-sm text-muted">{label}</div>
      <div className="merkat-num mt-1 text-2xl font-semibold text-fg">
        {value}
      </div>
    </div>
  );
}
