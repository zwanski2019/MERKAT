/**
 * Cash management (CLAUDE.md §5). Open a shift with a float, record cash in/out,
 * and close with a counted amount — the Z-report shows expected vs counted
 * (variance). Cash sales from the POS feed the shift when one is open.
 */
import { useState } from "react";
import {
  cashMovementInputSchema,
  expectedCashMinor,
  formatMoney,
  money,
  summarizeShift,
  varianceMinor,
} from "@merkat/core";
import { useCash } from "../../state/cash.js";
import { useSession } from "../../state/session.js";

function toMinor(major: string): number {
  return Math.round((Number(major) || 0) * 100);
}

export function Cash(): JSX.Element {
  const shift = useCash((s) => s.shift);
  const branding = useSession((s) => s.branding);
  const fmt = (m: number): string =>
    formatMoney(money(m, branding.currency), branding.locale);

  if (!shift) return <OpenShift />;
  if (shift.closedAt) return <ZReport />;
  return <OpenDrawer fmt={fmt} />;
}

function OpenShift(): JSX.Element {
  const openShift = useCash((s) => s.openShift);
  const staffId = useSession((s) => s.session?.staff.id ?? null);
  const [float, setFloat] = useState("");

  return (
    <div className="max-w-sm">
      <h1 className="mb-4 text-xl font-semibold text-fg">Cash</h1>
      <div className="rounded-[--radius-card] border border-border bg-surface p-4">
        <h2 className="mb-2 font-medium text-fg">Open a shift</h2>
        <label className="mb-3 block">
          <span className="mb-1 block text-sm text-muted">Opening float</span>
          <input
            inputMode="decimal"
            value={float}
            onChange={(e) => setFloat(e.target.value)}
            className="input merkat-num"
          />
        </label>
        <button
          onClick={() => openShift(toMinor(float), staffId)}
          className="w-full rounded-[--radius-control] bg-accent py-2 font-medium text-white"
        >
          Open shift
        </button>
      </div>
    </div>
  );
}

function OpenDrawer({ fmt }: { fmt: (m: number) => string }): JSX.Element {
  const shift = useCash((s) => s.shift)!;
  const addMovement = useCash((s) => s.addMovement);
  const closeShift = useCash((s) => s.closeShift);
  const summary = summarizeShift(shift);

  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [counted, setCounted] = useState("");

  function move(type: "in" | "out"): void {
    const parsed = cashMovementInputSchema.safeParse({
      type,
      amountMinor: toMinor(amount),
      reason: reason.trim() || null,
    });
    if (!parsed.success) return;
    addMovement(parsed.data);
    setAmount("");
    setReason("");
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-4 text-xl font-semibold text-fg">Cash · open shift</h1>

      <dl className="mb-6 divide-y divide-border rounded-[--radius-card] border border-border">
        <Row label="Opening float" value={fmt(summary.openingFloatMinor)} />
        <Row label="Cash sales" value={fmt(summary.cashSalesMinor)} />
        <Row label="Paid in" value={fmt(summary.paidInMinor)} />
        <Row label="Paid out" value={fmt(summary.paidOutMinor)} />
        <Row
          label="Expected in drawer"
          value={fmt(summary.expectedMinor)}
          strong
        />
      </dl>

      <div className="mb-6 rounded-[--radius-card] border border-border p-4">
        <h2 className="mb-2 font-medium text-fg">Cash in / out</h2>
        <div className="flex flex-wrap items-end gap-2">
          <label className="w-28">
            <span className="mb-1 block text-xs text-muted">Amount</span>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input merkat-num"
            />
          </label>
          <label className="flex-1">
            <span className="mb-1 block text-xs text-muted">Reason</span>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input"
            />
          </label>
          <button
            onClick={() => move("in")}
            className="rounded-[--radius-control] border border-border px-4 py-2 text-fg hover:border-accent"
          >
            Paid in
          </button>
          <button
            onClick={() => move("out")}
            className="rounded-[--radius-control] border border-border px-4 py-2 text-fg hover:border-accent"
          >
            Paid out
          </button>
        </div>
      </div>

      <div className="rounded-[--radius-card] border border-border p-4">
        <h2 className="mb-2 font-medium text-fg">Close shift (Z-report)</h2>
        <div className="flex items-end gap-2">
          <label className="flex-1">
            <span className="mb-1 block text-xs text-muted">Counted cash</span>
            <input
              inputMode="decimal"
              value={counted}
              onChange={(e) => setCounted(e.target.value)}
              className="input merkat-num"
            />
          </label>
          <button
            onClick={() => closeShift(toMinor(counted))}
            className="rounded-[--radius-control] bg-accent px-4 py-2 font-medium text-white"
          >
            Close shift
          </button>
        </div>
      </div>
    </div>
  );
}

function ZReport(): JSX.Element {
  const shift = useCash((s) => s.shift)!;
  const startNew = useCash((s) => s.startNew);
  const branding = useSession((s) => s.branding);
  const fmt = (m: number): string =>
    formatMoney(money(m, branding.currency), branding.locale);

  const expected = expectedCashMinor(shift);
  const counted = shift.countedMinor ?? 0;
  const variance = varianceMinor(shift, counted);

  return (
    <div className="max-w-sm">
      <h1 className="mb-4 text-xl font-semibold text-fg">Z-report</h1>
      <dl className="mb-4 divide-y divide-border rounded-[--radius-card] border border-border">
        <Row label="Expected" value={fmt(expected)} />
        <Row label="Counted" value={fmt(counted)} />
        <Row
          label="Variance"
          value={fmt(variance)}
          tone={
            variance === 0 ? undefined : variance < 0 ? "danger" : "warning"
          }
          strong
        />
      </dl>
      <button
        onClick={startNew}
        className="w-full rounded-[--radius-control] bg-accent py-2 font-medium text-white"
      >
        Start new shift
      </button>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "danger" | "warning";
}): JSX.Element {
  const color =
    tone === "danger"
      ? "text-danger"
      : tone === "warning"
        ? "text-warning"
        : "text-fg";
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <dt className={strong ? "font-semibold text-fg" : "text-sm text-muted"}>
        {label}
      </dt>
      <dd
        className={[
          "merkat-num",
          strong ? "font-semibold" : "text-sm",
          color,
        ].join(" ")}
      >
        {value}
      </dd>
    </div>
  );
}
