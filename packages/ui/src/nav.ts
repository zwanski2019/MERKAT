/**
 * Sidebar navigation (CLAUDE.md §5). Each item may require a permission action
 * (§8) and/or a vertical feature flag (§4). The shell hides items the current
 * role can't use or the tenant's vertical doesn't enable — the API still
 * enforces access independently.
 */
import type { Action, FeatureFlags } from "@merkat/core";

export interface NavItem {
  readonly label: string;
  readonly path: string;
  /** Required action; undefined = visible to any authenticated staff. */
  readonly action?: Action;
  /** Required vertical feature (§4); undefined = all verticals. */
  readonly feature?: keyof FeatureFlags;
  /** Phase that ships the real screen (placeholder until then). */
  readonly phase: string;
}

export const NAV: readonly NavItem[] = [
  { label: "Dashboard", path: "/", phase: "Phase 8" },
  { label: "POS", path: "/pos", action: "pos.sell", phase: "Phase 4" },
  {
    label: "Floor",
    path: "/floor",
    action: "pos.sell",
    feature: "tables",
    phase: "Phase 7",
  },
  {
    label: "Kitchen",
    path: "/kds",
    action: "kds.bump",
    feature: "kitchenDisplay",
    phase: "Phase 7",
  },
  {
    label: "Menu",
    path: "/menu",
    action: "products.manage",
    feature: "menuModifiers",
    phase: "Phase 7",
  },
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
