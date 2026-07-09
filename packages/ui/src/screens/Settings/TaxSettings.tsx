/**
 * Settings → Tax (CLAUDE.md §4, §5). Manage named tax rates (inclusive or
 * exclusive) and choose the POS default.
 */
import { useState } from "react";
import { taxRateInputSchema } from "@merkat/core";
import { usePricing } from "../../state/pricing.js";

export function TaxSettings(): JSX.Element {
  const rates = usePricing((s) => s.taxRates);
  const addTaxRate = usePricing((s) => s.addTaxRate);
  const setDefault = usePricing((s) => s.setDefaultTaxRate);

  const [name, setName] = useState("");
  const [percent, setPercent] = useState("");
  const [inclusive, setInclusive] = useState(false);

  function add(): void {
    const parsed = taxRateInputSchema.safeParse({
      name,
      rate: (Number(percent) || 0) / 100,
      inclusive,
    });
    if (!parsed.success) return;
    addTaxRate(parsed.data);
    setName("");
    setPercent("");
  }

  return (
    <div className="max-w-lg">
      <div className="mb-4 divide-y divide-border rounded-[--radius-card] border border-border">
        {rates.map((r) => (
          <div key={r.id} className="flex items-center justify-between p-3 text-sm">
            <div>
              <span className="text-fg">{r.name}</span>{" "}
              <span className="merkat-num text-muted">
                {(r.rate * 100).toFixed(2)}% {r.inclusive ? "incl." : "excl."}
              </span>
            </div>
            {r.isDefault ? (
              <span className="rounded-full border border-accent px-2.5 py-0.5 text-xs text-accent">
                Default
              </span>
            ) : (
              <button
                onClick={() => setDefault(r.id)}
                className="text-xs text-muted hover:text-fg"
              >
                Make default
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-[--radius-card] border border-border p-3">
        <label className="flex-1">
          <span className="mb-1 block text-xs text-muted">Rate name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
        </label>
        <label className="w-24">
          <span className="mb-1 block text-xs text-muted">Percent</span>
          <input
            inputMode="decimal"
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            className="input merkat-num"
          />
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm text-fg">
          <input
            type="checkbox"
            checked={inclusive}
            onChange={(e) => setInclusive(e.target.checked)}
          />
          Inclusive
        </label>
        <button
          onClick={add}
          className="rounded-[--radius-control] bg-accent px-4 py-2 font-medium text-white"
        >
          Add rate
        </button>
      </div>
    </div>
  );
}
