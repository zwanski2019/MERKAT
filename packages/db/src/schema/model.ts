/**
 * Canonical MERKAT data model — the single source of truth (CLAUDE.md §1.7,
 * §4). Both the Postgres (cloud) and SQLite (local) Drizzle schemas are
 * materialized from this one description, so the two dialects cannot drift.
 *
 * Logical column types map to each dialect in `materialize.ts`. JS runtime
 * types are kept identical across dialects on purpose:
 *   uuid/text/enum -> string     int/real -> number
 *   bigint         -> bigint     bool     -> boolean     ts -> Date     json -> unknown
 *
 * Money is always `bigint` minor units (CLAUDE.md §1.5). Counts are `int`.
 */

export type LogicalType =
  "uuid" | "text" | "int" | "bigint" | "bool" | "ts" | "json" | "real";

export interface ColumnSpec {
  readonly name: string; // snake_case db column
  readonly type: LogicalType;
  readonly notNull?: boolean;
  readonly pk?: boolean;
  /** `table.column` this column references (documentation + pg FK). */
  readonly ref?: string;
  /** Allowed values for enum-like text columns (stored as text). */
  readonly enumValues?: readonly string[];
}

export interface TableSpec {
  readonly name: string;
  readonly columns: readonly ColumnSpec[];
  /** Syncing tables carry `sync_status` and flow through the outbox (§6). */
  readonly syncing: boolean;
}

const c = (
  name: string,
  type: LogicalType,
  opts: Omit<ColumnSpec, "name" | "type"> = {},
): ColumnSpec => ({ name, type, ...opts });

/** Columns every domain table carries (CLAUDE.md §4). */
const BASE: readonly ColumnSpec[] = [
  c("id", "uuid", { pk: true, notNull: true }),
  c("tenant_id", "uuid", { notNull: true }),
  c("created_at", "ts", { notNull: true }),
  c("updated_at", "ts", { notNull: true }),
  c("deleted_at", "ts"),
];

const SYNC_STATUS = c("sync_status", "text", { notNull: true });

interface TableOpts {
  /** Omit the tenant-scoped base columns (only the sync bookkeeping tables). */
  readonly bare?: boolean;
  readonly syncing?: boolean;
}

function table(
  name: string,
  columns: readonly ColumnSpec[],
  opts: TableOpts = {},
): TableSpec {
  const syncing = opts.syncing ?? !opts.bare;
  const head = opts.bare ? [] : BASE;
  const tail = syncing && !opts.bare ? [SYNC_STATUS] : [];
  return { name, syncing, columns: [...head, ...columns, ...tail] };
}

// ── enums (stored as text; validated by Zod at the edge) ───────────────────
export const BUSINESS_TYPES = ["retail", "restaurant", "general"] as const;
export const STAFF_ROLES = ["owner", "manager", "cashier", "kitchen"] as const;
export const STOCK_REASONS = [
  "sale",
  "restock",
  "adjustment",
  "transfer_in",
  "transfer_out",
  "waste",
  "count",
] as const;
export const ORDER_CHANNELS = ["in_store", "online"] as const;
export const ORDER_STATUSES = ["open", "paid", "refunded", "voided"] as const;
export const PAYMENT_METHODS = ["cash", "card", "mobile"] as const;
export const PAYMENT_STATUSES = [
  "pending",
  "paid",
  "failed",
  "refunded",
] as const;
export const TABLE_STATUSES = [
  "open",
  "occupied",
  "check",
  "reserved",
] as const;
export const KITCHEN_STATIONS = ["grill", "cold", "bar", "all"] as const;
export const KITCHEN_STATUSES = ["new", "preparing", "done", "bumped"] as const;
export const SYNC_STATUSES = ["pending", "synced", "conflict"] as const;
export const OUTBOX_OPS = ["insert", "update", "delete"] as const;

// ── core tables (all verticals) ────────────────────────────────────────────
const tenants = table(
  "tenants",
  [
    c("business_type", "text", { notNull: true, enumValues: BUSINESS_TYPES }),
    c("name", "text", { notNull: true }),
    c("logo_url", "text"),
    c("accent_hex", "text", { notNull: true }),
    c("currency", "text", { notNull: true }),
    c("tax_config", "json"),
    c("locale", "text", { notNull: true }),
  ],
  // A tenant has no parent tenant; keep base id/timestamps but tenant_id === id.
);

const locations = table("locations", [
  c("name", "text", { notNull: true }),
  c("address", "text"),
]);

const staff = table("staff", [
  c("role", "text", { notNull: true, enumValues: STAFF_ROLES }),
  c("name", "text", { notNull: true }),
  c("email", "text"),
  c("pin_hash", "text", { notNull: true }),
  c("permissions", "json"),
  c("active", "bool", { notNull: true }),
]);

const categories = table("categories", [
  c("name", "text", { notNull: true }),
  c("sort_order", "int", { notNull: true }),
  c("business_type", "text", { enumValues: BUSINESS_TYPES }),
]);

const products = table("products", [
  c("category_id", "uuid", { ref: "categories.id" }),
  c("name", "text", { notNull: true }),
  c("price_minor", "bigint", { notNull: true }),
  c("cost_minor", "bigint"),
  c("sku", "text"),
  c("barcode", "text"),
  c("description", "text"),
  c("image_url", "text"),
  c("low_stock_threshold", "int"),
  c("active", "bool", { notNull: true }),
]);

const productVariants = table("product_variants", [
  c("product_id", "uuid", { notNull: true, ref: "products.id" }),
  c("attributes", "json"), // { shade, size }
  c("sku", "text"),
  c("barcode", "text"),
  c("price_minor", "bigint"),
  c("expiry_date", "ts"),
  c("batch_no", "text"),
]);

// Append-only ledger (CLAUDE.md §1.3). Never UPDATE hand stock.
const stockMovements = table("stock_movements", [
  c("product_id", "uuid", { ref: "products.id" }),
  c("variant_id", "uuid", { ref: "product_variants.id" }),
  c("location_id", "uuid", { notNull: true, ref: "locations.id" }),
  c("delta", "int", { notNull: true }), // signed
  c("reason", "text", { notNull: true, enumValues: STOCK_REASONS }),
  c("ref_id", "uuid"), // order id etc.
  c("staff_id", "uuid", { ref: "staff.id" }),
]);

// Derived cache of SUM(delta) per (product/variant, location). Never written
// directly by app code — rebuilt from stock_movements (CLAUDE.md §1.3, §4).
const stockLevels = table(
  "stock_levels",
  [
    c("product_id", "uuid", { ref: "products.id" }),
    c("variant_id", "uuid", { ref: "product_variants.id" }),
    c("location_id", "uuid", { notNull: true, ref: "locations.id" }),
    c("qty", "int", { notNull: true }),
  ],
  { syncing: false }, // derived locally on each terminal; not synced
);

const customers = table("customers", [
  c("name", "text", { notNull: true }),
  c("email", "text"),
  c("phone", "text"),
  c("loyalty_points", "int", { notNull: true }),
  c("total_spend_minor", "bigint", { notNull: true }),
  c("tags", "json"),
  c("notes", "text"),
]);

const orders = table("orders", [
  c("location_id", "uuid", { notNull: true, ref: "locations.id" }),
  c("customer_id", "uuid", { ref: "customers.id" }),
  c("channel", "text", { notNull: true, enumValues: ORDER_CHANNELS }),
  c("status", "text", { notNull: true, enumValues: ORDER_STATUSES }),
  c("subtotal_minor", "bigint", { notNull: true }),
  c("tax_minor", "bigint", { notNull: true }),
  c("discount_minor", "bigint", { notNull: true }),
  c("total_minor", "bigint", { notNull: true }),
  c("table_id", "uuid", { ref: "tables.id" }),
  c("opened_by", "uuid", { ref: "staff.id" }),
  c("closed_at", "ts"),
]);

const orderLines = table("order_lines", [
  c("order_id", "uuid", { notNull: true, ref: "orders.id" }),
  c("product_id", "uuid", { ref: "products.id" }),
  c("variant_id", "uuid", { ref: "product_variants.id" }),
  c("qty", "int", { notNull: true }),
  c("unit_price_minor", "bigint", { notNull: true }),
  c("line_total_minor", "bigint", { notNull: true }),
  c("note", "text"),
]);

const payments = table("payments", [
  c("order_id", "uuid", { notNull: true, ref: "orders.id" }),
  c("method", "text", { notNull: true, enumValues: PAYMENT_METHODS }),
  c("amount_minor", "bigint", { notNull: true }),
  c("provider_ref", "text"),
  c("status", "text", { notNull: true, enumValues: PAYMENT_STATUSES }),
]);

const auditLog = table("audit_log", [
  c("staff_id", "uuid", { ref: "staff.id" }),
  c("action", "text", { notNull: true }),
  c("entity", "text", { notNull: true }),
  c("entity_id", "uuid"),
  c("before", "json"),
  c("after", "json"),
]);

// ── restaurant-only tables (empty in retail tenants) ───────────────────────
const floorZones = table("floor_zones", [
  c("name", "text", { notNull: true }),
  c("layout", "json"),
]);

const tables = table("tables", [
  c("zone_id", "uuid", { ref: "floor_zones.id" }),
  c("label", "text", { notNull: true }),
  c("seats", "int", { notNull: true }),
  c("x", "real", { notNull: true }),
  c("y", "real", { notNull: true }),
  c("shape", "text"),
  c("status", "text", { notNull: true, enumValues: TABLE_STATUSES }),
]);

const modifierGroups = table("modifier_groups", [
  c("name", "text", { notNull: true }),
  c("min", "int", { notNull: true }),
  c("max", "int", { notNull: true }),
  c("required", "bool", { notNull: true }),
]);

const modifiers = table("modifiers", [
  c("group_id", "uuid", { notNull: true, ref: "modifier_groups.id" }),
  c("name", "text", { notNull: true }),
  c("price_delta_minor", "bigint", { notNull: true }),
]);

const productModifierGroups = table("product_modifier_groups", [
  c("product_id", "uuid", { notNull: true, ref: "products.id" }),
  c("group_id", "uuid", { notNull: true, ref: "modifier_groups.id" }),
]);

const orderLineModifiers = table("order_line_modifiers", [
  c("order_line_id", "uuid", { notNull: true, ref: "order_lines.id" }),
  c("modifier_id", "uuid", { notNull: true, ref: "modifiers.id" }),
  c("price_delta_minor", "bigint", { notNull: true }),
  c("note", "text"),
]);

const combos = table("combos", [
  c("name", "text", { notNull: true }),
  c("price_minor", "bigint", { notNull: true }),
  c("items", "json"), // product ids in the bundle
]);

const kitchenTickets = table("kitchen_tickets", [
  c("order_id", "uuid", { notNull: true, ref: "orders.id" }),
  c("station", "text", { notNull: true, enumValues: KITCHEN_STATIONS }),
  c("status", "text", { notNull: true, enumValues: KITCHEN_STATUSES }),
  c("sent_at", "ts"),
  c("bumped_at", "ts"),
]);

// ── sync bookkeeping (local only) ──────────────────────────────────────────
const outbox = table(
  "outbox",
  [
    c("op_id", "uuid", { pk: true, notNull: true }),
    c("entity", "text", { notNull: true }),
    c("entity_id", "uuid", { notNull: true }),
    c("op", "text", { notNull: true, enumValues: OUTBOX_OPS }),
    c("payload", "json", { notNull: true }),
    c("seq", "int", { notNull: true }), // monotonic local
    c("synced_at", "ts"),
  ],
  { bare: true },
);

const syncCursor = table(
  "sync_cursor",
  [
    c("id", "text", { pk: true, notNull: true }),
    c("checkpoint", "text", { notNull: true }),
    c("updated_at", "ts", { notNull: true }),
  ],
  { bare: true },
);

/** Every table, in dependency order (parents before children). */
export const MODEL: readonly TableSpec[] = [
  tenants,
  locations,
  staff,
  categories,
  products,
  productVariants,
  floorZones,
  tables,
  stockMovements,
  stockLevels,
  customers,
  orders,
  orderLines,
  payments,
  auditLog,
  modifierGroups,
  modifiers,
  productModifierGroups,
  orderLineModifiers,
  combos,
  kitchenTickets,
  outbox,
  syncCursor,
];
