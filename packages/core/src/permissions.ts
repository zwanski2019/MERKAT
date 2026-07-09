/**
 * Role → allowed actions (CLAUDE.md §8).
 * Client hides disallowed UI; the API enforces this independently.
 * `permissions jsonb` on staff can override per-tenant.
 */
export type Role = "owner" | "manager" | "cashier" | "kitchen";

export type Action =
  | "pos.sell"
  | "pos.discount"
  | "refunds.issue"
  | "orders.void"
  | "products.manage"
  | "reports.view"
  | "settings.manage"
  | "team.manage"
  | "kds.bump";

const MATRIX: Record<Role, ReadonlySet<Action>> = {
  owner: new Set<Action>([
    "pos.sell",
    "pos.discount",
    "refunds.issue",
    "orders.void",
    "products.manage",
    "reports.view",
    "settings.manage",
    "team.manage",
    "kds.bump",
  ]),
  manager: new Set<Action>([
    "pos.sell",
    "pos.discount",
    "refunds.issue",
    "orders.void",
    "products.manage",
    "reports.view",
    "kds.bump",
  ]),
  cashier: new Set<Action>(["pos.sell", "pos.discount"]),
  kitchen: new Set<Action>(["kds.bump"]),
};

export function can(
  role: Role,
  action: Action,
  overrides?: Partial<Record<Action, boolean>>,
): boolean {
  if (overrides && action in overrides) {
    return overrides[action] === true;
  }
  return MATRIX[role].has(action);
}

// Ordered lists + metadata for rendering the permission matrix (§8). Actions
// are grouped by area for the Team screen.
export const ROLES: readonly Role[] = [
  "owner",
  "manager",
  "cashier",
  "kitchen",
];

export type PermissionArea =
  "POS" | "Refunds" | "Products" | "Reports" | "Settings" | "Team" | "Kitchen";

export interface ActionMeta {
  readonly action: Action;
  readonly area: PermissionArea;
  readonly label: string;
}

export const ACTIONS: readonly ActionMeta[] = [
  { action: "pos.sell", area: "POS", label: "Sell" },
  { action: "pos.discount", area: "POS", label: "Apply discounts" },
  { action: "refunds.issue", area: "Refunds", label: "Issue refunds" },
  { action: "orders.void", area: "Refunds", label: "Void orders" },
  { action: "products.manage", area: "Products", label: "Manage products" },
  { action: "reports.view", area: "Reports", label: "View reports" },
  { action: "settings.manage", area: "Settings", label: "Manage settings" },
  { action: "team.manage", area: "Team", label: "Manage team" },
  { action: "kds.bump", area: "Kitchen", label: "Bump tickets" },
];
