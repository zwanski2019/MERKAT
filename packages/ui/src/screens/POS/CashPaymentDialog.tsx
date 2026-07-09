/**
 * Cash payment (CLAUDE.md §10). Cash is always available and offline-capable —
 * it records a payment and closes the order locally, syncing later. Shows the
 * total, quick tender amounts, and computed change.
 */
import { useState } from "react";
import { formatMoney, money } from "@merkat/core";
import { useSession } from "../../state/session.js";

export function CashPaymentDialog({
  totalMinor,
  onConfirm,
  onClose,
  busy,
}: {
  totalMinor: number;
  onConfirm: (tenderedMinor: number) => void;
  onClose: () => void;
  busy: boolean;
}): JSX.Element {
  const branding = useSession((s) => s.branding);
  const fmt = (m: number): string =>
    formatMoney(money(m, branding.currency), branding.locale);

  const [tendered, setTendered] = useState("");
  const tenderedMinor = Math.round((Number(tendered) || 0) * 100);
  const enough = tenderedMinor >= totalMinor;
  const changeMinor = Math.max(0, tenderedMinor - totalMinor);

  // Quick tenders: exact, and the next round notes above the total.
  const quick = quickTenders(totalMinor);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-6">
      <div
        role="dialog"
        aria-label="Cash payment"
        className="w-full max-w-sm rounded-[--radius-card] border border-border bg-surface p-6 shadow-xl"
      >
        <h2 className="mb-1 text-lg font-semibold text-fg">Cash payment</h2>
        <p className="mb-4 text-sm text-muted">
          Total due{" "}
          <span className="merkat-num font-semibold text-fg">
            {fmt(totalMinor)}
          </span>
        </p>

        <label className="mb-3 block">
          <span className="mb-1 block text-sm text-fg">Amount tendered</span>
          <input
            inputMode="decimal"
            autoFocus
            value={tendered}
            onChange={(e) => setTendered(e.target.value)}
            className="input merkat-num text-lg"
          />
        </label>

        <div className="mb-4 flex flex-wrap gap-2">
          {quick.map((q) => (
            <button
              key={q}
              onClick={() => setTendered((q / 100).toFixed(2))}
              className="merkat-num rounded-[--radius-control] border border-border px-3 py-1.5 text-sm text-fg hover:border-accent"
            >
              {fmt(q)}
            </button>
          ))}
        </div>

        <div className="mb-5 flex items-center justify-between rounded-[--radius-control] bg-canvas px-3 py-2">
          <span className="text-sm text-muted">Change</span>
          <span className="merkat-num font-semibold text-fg">
            {fmt(changeMinor)}
          </span>
        </div>

        <div className="flex gap-3">
          <button
            disabled={!enough || busy}
            onClick={() => onConfirm(tenderedMinor)}
            className="flex-1 rounded-[--radius-control] bg-accent py-2 font-medium text-white disabled:opacity-50"
          >
            {busy ? "Completing…" : "Complete sale"}
          </button>
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-[--radius-control] border border-border px-4 py-2 text-fg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function quickTenders(totalMinor: number): number[] {
  const rounds = [500, 1000, 2000, 5000, 10000];
  const out = new Set<number>([totalMinor]);
  for (const r of rounds) {
    const up = Math.ceil(totalMinor / r) * r;
    if (up > totalMinor) out.add(up);
  }
  return [...out].sort((a, b) => a - b).slice(0, 4);
}
