/**
 * Reports chart (CLAUDE.md §5, §11). Recharts bar chart of top products by
 * revenue, themed with the single tenant accent (§11 — accent is the only
 * per-tenant color). Money is formatted at the edge (§1.5).
 */
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney, money, type TenantBranding } from "@merkat/core";
import type { TopProduct } from "@merkat/ai";

export function TopProductsChart({
  products,
  branding,
}: {
  products: readonly TopProduct[];
  branding: TenantBranding;
}): JSX.Element | null {
  if (products.length === 0) return null;
  const fmt = (m: number): string =>
    formatMoney(money(m, branding.currency), branding.locale);

  const chartData = products.map((p) => ({
    name: p.name,
    revenue: p.revenueMinor / 100,
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            tick={{ fontSize: 12, fill: "var(--text-muted)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "var(--canvas)" }}
            formatter={(value) => fmt(Math.round(Number(value) * 100))}
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--text)",
            }}
          />
          <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill="var(--accent)" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
