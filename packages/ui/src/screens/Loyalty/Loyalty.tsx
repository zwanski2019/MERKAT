/**
 * Loyalty & gift cards (CLAUDE.md §14). Issue gift cards, check balances, and
 * redeem against them; the loyalty rule (points per unit) is shown for context.
 */
import { useState } from "react";
import {
  DEFAULT_LOYALTY,
  formatMoney,
  giftCardInputSchema,
  money,
} from "@merkat/core";
import { usePricing } from "../../state/pricing.js";
import { useSession } from "../../state/session.js";

export function Loyalty(): JSX.Element {
  const giftCards = usePricing((s) => s.giftCards);
  const issue = usePricing((s) => s.issueGiftCard);
  const redeem = usePricing((s) => s.redeemGiftCard);
  const branding = useSession((s) => s.branding);
  const fmt = (m: number): string =>
    formatMoney(money(m, branding.currency), branding.locale);

  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("");

  function issueCard(): void {
    const parsed = giftCardInputSchema.safeParse({
      code,
      balanceMinor: Math.round((Number(amount) || 0) * 100),
    });
    if (!parsed.success) return;
    issue(parsed.data);
    setCode("");
    setAmount("");
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-1 text-xl font-semibold text-fg">Loyalty & gift cards</h1>
      <p className="mb-4 text-sm text-muted">
        Earning {DEFAULT_LOYALTY.pointsPerUnit} point per {branding.currency}{" "}
        spent.
      </p>

      <div className="mb-4 divide-y divide-border rounded-[--radius-card] border border-border">
        {giftCards.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-3 text-sm">
            <span className="merkat-num text-fg">{c.code}</span>
            <div className="flex items-center gap-3">
              <span className="merkat-num text-fg">{fmt(c.balanceMinor)}</span>
              <button
                disabled={!c.active}
                onClick={() => redeem(c.id, 1000)}
                className="rounded-[--radius-control] border border-border px-2.5 py-1 text-xs text-fg hover:border-accent disabled:opacity-40"
              >
                Redeem {fmt(1000)}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-[--radius-card] border border-border p-3">
        <label className="flex-1">
          <span className="mb-1 block text-xs text-muted">New card code</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="input merkat-num"
          />
        </label>
        <label className="w-28">
          <span className="mb-1 block text-xs text-muted">Balance</span>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input merkat-num"
          />
        </label>
        <button
          onClick={issueCard}
          className="rounded-[--radius-control] bg-accent px-4 py-2 font-medium text-white"
        >
          Issue card
        </button>
      </div>
    </div>
  );
}
