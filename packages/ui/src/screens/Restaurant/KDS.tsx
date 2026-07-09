/**
 * Kitchen Display System (CLAUDE.md §5, Phase 7). Live tickets with aging
 * timers; color escalates by age (§11). Bumping marks a ticket done. New/
 * preparing tickets lead; bumped ones drop to a dimmed "done" strip.
 */
import { useEffect, useState } from "react";
import {
  KITCHEN_STATIONS,
  ticketAgeSeconds,
  ticketUrgency,
  type KitchenStation,
  type KitchenTicket,
  type TicketUrgency,
} from "@merkat/core";
import { useRestaurant } from "../../state/restaurant.js";

type StationFilter = KitchenStation | "any";

const URGENCY_CLASS: Record<TicketUrgency, string> = {
  fresh: "border-border",
  aging: "border-warning",
  late: "border-danger",
};

function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function fmtAge(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function KDS(): JSX.Element {
  const tickets = useRestaurant((s) => s.tickets);
  const bump = useRestaurant((s) => s.bumpTicket);
  const now = useNow();
  const [station, setStation] = useState<StationFilter>("any");

  const shown =
    station === "any" ? tickets : tickets.filter((t) => t.station === station);
  const active = shown.filter((t) => t.status !== "bumped");
  const done = shown.filter((t) => t.status === "bumped");

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-fg">Kitchen</h1>
        <div className="flex flex-wrap gap-1">
          {(["any", ...KITCHEN_STATIONS] as StationFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStation(s)}
              className={[
                "rounded-full border px-3 py-1 text-xs capitalize",
                station === s
                  ? "border-accent text-accent"
                  : "border-border text-muted hover:text-fg",
              ].join(" ")}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {active.length === 0 ? (
        <p className="text-sm text-muted">No open tickets.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {active.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              now={now}
              onBump={() => bump(ticket.id)}
            />
          ))}
        </div>
      )}

      {done.length > 0 ? (
        <div className="mt-8">
          <h2 className="mb-2 text-sm font-medium text-muted">Bumped</h2>
          <div className="flex flex-wrap gap-2">
            {done.map((t) => (
              <span
                key={t.id}
                className="rounded-[--radius-control] border border-border px-3 py-1 text-xs text-muted"
              >
                {t.tableLabel} · {ticketAgeSeconds(t, now)}s
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TicketCard({
  ticket,
  now,
  onBump,
}: {
  ticket: KitchenTicket;
  now: number;
  onBump: () => void;
}): JSX.Element {
  const age = ticketAgeSeconds(ticket, now);
  const urgency = ticketUrgency(age);

  return (
    <div
      className={[
        "flex flex-col rounded-[--radius-card] border-2 bg-surface p-3",
        URGENCY_CLASS[urgency],
      ].join(" ")}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold text-fg">
          {ticket.tableLabel}
          <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-xs font-normal capitalize text-muted">
            {ticket.station}
          </span>
        </span>
        <span
          className={[
            "merkat-num text-sm",
            urgency === "late"
              ? "text-danger"
              : urgency === "aging"
                ? "text-warning"
                : "text-muted",
          ].join(" ")}
        >
          {fmtAge(age)}
        </span>
      </div>
      <ul className="mb-3 flex-1 space-y-1 text-sm">
        {ticket.items.map((item, i) => (
          <li key={i} className="text-fg">
            <span className="merkat-num">{item.qty}×</span> {item.name}
            {item.modifiers.length > 0 ? (
              <span className="block text-xs text-muted">
                {item.modifiers.join(", ")}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      <button
        onClick={onBump}
        className="rounded-[--radius-control] bg-accent py-2 text-sm font-medium text-white"
      >
        Bump
      </button>
    </div>
  );
}
