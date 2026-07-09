/**
 * Floor plan (CLAUDE.md §5, Phase 7). Tables laid out on the floor, colored by
 * status (§11 — color signals state). Tap a table to open its check; toggle
 * edit-layout mode to drag tables to new positions.
 */
import { useRef, useState } from "react";
import type { Table, TableStatus } from "@merkat/core";
import { useRestaurant } from "../../state/restaurant.js";
import { CheckPanel } from "./CheckPanel.js";

const STATUS_CLASS: Record<TableStatus, string> = {
  open: "border-border bg-surface text-fg",
  occupied: "border-accent bg-accent text-white",
  check: "border-warning bg-surface text-warning",
  reserved: "border-border bg-canvas text-muted",
};

export function FloorPlan(): JSX.Element {
  const tables = useRestaurant((s) => s.tables);
  const zones = useRestaurant((s) => s.zones);
  const seatTable = useRestaurant((s) => s.seatTable);
  const moveTable = useRestaurant((s) => s.moveTable);

  const [edit, setEdit] = useState(false);
  const [openTable, setOpenTable] = useState<string | null>(null);
  const floorRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);

  function onTableDown(e: React.PointerEvent, table: Table): void {
    if (!edit || !floorRef.current) return;
    const rect = floorRef.current.getBoundingClientRect();
    drag.current = {
      id: table.id,
      dx: e.clientX - rect.left - table.x,
      dy: e.clientY - rect.top - table.y,
    };
  }

  function onFloorMove(e: React.PointerEvent): void {
    if (!drag.current || !floorRef.current) return;
    const rect = floorRef.current.getBoundingClientRect();
    moveTable(
      drag.current.id,
      Math.max(0, Math.round(e.clientX - rect.left - drag.current.dx)),
      Math.max(0, Math.round(e.clientY - rect.top - drag.current.dy)),
    );
  }

  function openCheck(table: Table): void {
    if (edit) return;
    if (table.status === "open") seatTable(table.id);
    setOpenTable(table.id);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-fg">Floor plan</h1>
          <p className="text-sm text-muted">
            {zones.map((z) => z.name).join(" · ")}
          </p>
        </div>
        <button
          onClick={() => setEdit((v) => !v)}
          className={[
            "rounded-[--radius-control] border px-4 py-2 text-sm",
            edit ? "border-accent text-accent" : "border-border text-fg",
          ].join(" ")}
        >
          {edit ? "Done" : "Edit layout"}
        </button>
      </div>

      <div
        ref={floorRef}
        onPointerMove={onFloorMove}
        onPointerUp={() => (drag.current = null)}
        onPointerLeave={() => (drag.current = null)}
        className="relative h-[360px] w-full overflow-hidden rounded-[--radius-card] border border-border bg-canvas"
      >
        {tables.map((table) => (
          <button
            key={table.id}
            onPointerDown={(e) => onTableDown(e, table)}
            onClick={() => openCheck(table)}
            style={{ left: table.x, top: table.y }}
            className={[
              "absolute flex size-20 flex-col items-center justify-center border text-center",
              table.shape === "round"
                ? "rounded-full"
                : "rounded-[--radius-card]",
              STATUS_CLASS[table.status],
              edit ? "cursor-move" : "cursor-pointer",
            ].join(" ")}
          >
            <span className="font-semibold">{table.label}</span>
            <span className="merkat-num text-xs opacity-80">
              {table.seats} seats
            </span>
          </button>
        ))}
      </div>

      <Legend />

      {openTable ? (
        <CheckPanel tableId={openTable} onClose={() => setOpenTable(null)} />
      ) : null}
    </div>
  );
}

function Legend(): JSX.Element {
  const items: { label: string; status: TableStatus }[] = [
    { label: "Open", status: "open" },
    { label: "Occupied", status: "occupied" },
    { label: "Check", status: "check" },
  ];
  return (
    <div className="mt-3 flex gap-4 text-xs text-muted">
      {items.map(({ label, status }) => (
        <span key={status} className="flex items-center gap-1.5">
          <span
            className={[
              "size-3 rounded-full border",
              STATUS_CLASS[status],
            ].join(" ")}
          />
          {label}
        </span>
      ))}
    </div>
  );
}
