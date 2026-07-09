/**
 * Promotions (CLAUDE.md §14). Manage order-level percent/amount-off promotions;
 * active ones are selectable at the POS.
 */
import { useState } from "react";
import {
  formatMoney,
  money,
  promotionInputSchema,
  type PromotionKind,
} from "@merkat/core";
import { usePricing } from "../../state/pricing.js";
import { useSession } from "../../state/session.js";

export function Promotions(): JSX.Element {
  const promotions = usePricing((s) => s.promotions);
  const addPromotion = usePricing((s) => s.addPromotion);
  const toggle = usePricing((s) => s.togglePromotion);
  const branding = useSession((s) => s.branding);
  const fmt = (m: number): string =>
    formatMoney(money(m, branding.currency), branding.locale);

  const [name, setName] = useState("");
  const [kind, setKind] = useState<PromotionKind>("percent_off");
  const [value, setValue] = useState("");

  function add(): void {
    const raw = Number(value) || 0;
    const parsed = promotionInputSchema.safeParse({
      name,
      kind,
      value: kind === "percent_off" ? Math.round(raw) : Math.round(raw * 100),
      active: true,
    });
    if (!parsed.success) return;
    addPromotion(parsed.data);
    setName("");
    setValue("");
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-4 text-xl font-semibold text-fg">Promotions</h1>

      <div className="mb-4 divide-y divide-border rounded-[--radius-card] border border-border">
        {promotions.map((p) => (
          <div key={p.id} className="flex items-center justify-between p-3 text-sm">
            <div>
              <span className="text-fg">{p.name}</span>{" "}
              <span className="merkat-num text-muted">
                {p.kind === "percent_off" ? `${p.value}%` : fmt(p.value)}
              </span>
            </div>
            <button
              onClick={() => toggle(p.id)}
              className={[
                "rounded-full border px-2.5 py-0.5 text-xs",
                p.active ? "border-accent text-accent" : "border-border text-muted",
              ].join(" ")}
            >
              {p.active ? "Active" : "Inactive"}
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-[--radius-card] border border-border p-3">
        <label className="flex-1">
          <span className="mb-1 block text-xs text-muted">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
        </label>
        <label className="w-32">
          <span className="mb-1 block text-xs text-muted">Type</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as PromotionKind)}
            className="input"
          >
            <option value="percent_off">Percent off</option>
            <option value="amount_off">Amount off</option>
          </select>
        </label>
        <label className="w-24">
          <span className="mb-1 block text-xs text-muted">
            {kind === "percent_off" ? "%" : branding.currency}
          </span>
          <input
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="input merkat-num"
          />
        </label>
        <button
          onClick={add}
          className="rounded-[--radius-control] bg-accent px-4 py-2 font-medium text-white"
        >
          Add
        </button>
      </div>
    </div>
  );
}
