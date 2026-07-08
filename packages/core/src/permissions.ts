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
