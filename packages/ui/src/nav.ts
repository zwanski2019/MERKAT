/**
 * Sidebar navigation (CLAUDE.md §5). Each item may require a permission action;
 * the shell hides items the current role can't use (§8) — the API still
 * enforces access independently.
 */
import type { Action } from "@merkat/core";

export interface NavItem {
  readonly label: string;
  readonly path: string;
  /** Required action; undefined = visible to any authenticated staff. */
  readonly action?: Action;
  /** Phase that ships the real screen (placeholder until then). */
  readonly phase: string;
}

export const NAV: readonly NavItem[] = [
  { label: "Dashboard", path: "/", phase: "Phase 8" },
  { label: "POS", path: "/pos", action: "pos.sell", phase: "Phase 4" },
  {
    label: "Products",
    path: "/products",
    action: "products.manage",
    phase: "Phase 3",
  },
  { label: "Orders", path: "/orders", action: "pos.sell", phase: "Phase 6" },
  {
    label: "Customers",
    path: "/customers",
    action: "pos.sell",
    phase: "Phase 6",
  },
  {
    label: "Reports",
    path: "/reports",
    action: "reports.view",
    phase: "Phase 8",
  },
  {
    label: "Assistant",
    path: "/assistant",
    action: "reports.view",
    phase: "Phase 8",
  },
  {
    label: "Settings",
    path: "/settings",
    action: "settings.manage",
    phase: "Phase 2",
  },
];
