-- Generated from packages/db/src/schema/model.ts — do not edit by hand.
-- Regenerate with: pnpm --filter @merkat/db gen:migrations

CREATE TABLE IF NOT EXISTS "tenants" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  "deleted_at" INTEGER,
  "business_type" TEXT NOT NULL CHECK ("business_type" IN ('retail', 'restaurant', 'general')),
  "name" TEXT NOT NULL,
  "logo_url" TEXT,
  "accent_hex" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "tax_config" TEXT,
  "locale" TEXT NOT NULL,
  "sync_status" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "locations" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  "deleted_at" INTEGER,
  "name" TEXT NOT NULL,
  "address" TEXT,
  "sync_status" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "staff" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  "deleted_at" INTEGER,
  "role" TEXT NOT NULL CHECK ("role" IN ('owner', 'manager', 'cashier', 'kitchen')),
  "name" TEXT NOT NULL,
  "email" TEXT,
  "pin_hash" TEXT NOT NULL,
  "permissions" TEXT,
  "active" INTEGER NOT NULL,
  "sync_status" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "categories" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  "deleted_at" INTEGER,
  "name" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL,
  "business_type" TEXT CHECK ("business_type" IN ('retail', 'restaurant', 'general')),
  "sync_status" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "products" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  "deleted_at" INTEGER,
  "category_id" TEXT,
  "name" TEXT NOT NULL,
  "price_minor" INTEGER NOT NULL,
  "cost_minor" INTEGER,
  "sku" TEXT,
  "barcode" TEXT,
  "description" TEXT,
  "image_url" TEXT,
  "low_stock_threshold" INTEGER,
  "active" INTEGER NOT NULL,
  "sync_status" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "product_variants" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  "deleted_at" INTEGER,
  "product_id" TEXT NOT NULL,
  "attributes" TEXT,
  "sku" TEXT,
  "barcode" TEXT,
  "price_minor" INTEGER,
  "expiry_date" INTEGER,
  "batch_no" TEXT,
  "sync_status" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "floor_zones" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  "deleted_at" INTEGER,
  "name" TEXT NOT NULL,
  "layout" TEXT,
  "sync_status" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "tables" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  "deleted_at" INTEGER,
  "zone_id" TEXT,
  "label" TEXT NOT NULL,
  "seats" INTEGER NOT NULL,
  "x" REAL NOT NULL,
  "y" REAL NOT NULL,
  "shape" TEXT,
  "status" TEXT NOT NULL CHECK ("status" IN ('open', 'occupied', 'check', 'reserved')),
  "sync_status" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "stock_movements" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  "deleted_at" INTEGER,
  "product_id" TEXT,
  "variant_id" TEXT,
  "location_id" TEXT NOT NULL,
  "delta" INTEGER NOT NULL,
  "reason" TEXT NOT NULL CHECK ("reason" IN ('sale', 'restock', 'adjustment', 'transfer_in', 'transfer_out', 'waste', 'count')),
  "ref_id" TEXT,
  "staff_id" TEXT,
  "sync_status" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "stock_levels" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  "deleted_at" INTEGER,
  "product_id" TEXT,
  "variant_id" TEXT,
  "location_id" TEXT NOT NULL,
  "qty" INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS "customers" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  "deleted_at" INTEGER,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "loyalty_points" INTEGER NOT NULL,
  "total_spend_minor" INTEGER NOT NULL,
  "tags" TEXT,
  "notes" TEXT,
  "sync_status" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "orders" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  "deleted_at" INTEGER,
  "location_id" TEXT NOT NULL,
  "customer_id" TEXT,
  "channel" TEXT NOT NULL CHECK ("channel" IN ('in_store', 'online')),
  "status" TEXT NOT NULL CHECK ("status" IN ('open', 'paid', 'refunded', 'voided')),
  "subtotal_minor" INTEGER NOT NULL,
  "tax_minor" INTEGER NOT NULL,
  "discount_minor" INTEGER NOT NULL,
  "total_minor" INTEGER NOT NULL,
  "table_id" TEXT,
  "opened_by" TEXT,
  "closed_at" INTEGER,
  "sync_status" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "order_lines" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  "deleted_at" INTEGER,
  "order_id" TEXT NOT NULL,
  "product_id" TEXT,
  "variant_id" TEXT,
  "qty" INTEGER NOT NULL,
  "unit_price_minor" INTEGER NOT NULL,
  "line_total_minor" INTEGER NOT NULL,
  "note" TEXT,
  "sync_status" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "payments" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  "deleted_at" INTEGER,
  "order_id" TEXT NOT NULL,
  "method" TEXT NOT NULL CHECK ("method" IN ('cash', 'card', 'mobile')),
  "amount_minor" INTEGER NOT NULL,
  "provider_ref" TEXT,
  "status" TEXT NOT NULL CHECK ("status" IN ('pending', 'paid', 'failed', 'refunded')),
  "sync_status" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "audit_log" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  "deleted_at" INTEGER,
  "staff_id" TEXT,
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entity_id" TEXT,
  "before" TEXT,
  "after" TEXT,
  "sync_status" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "modifier_groups" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  "deleted_at" INTEGER,
  "name" TEXT NOT NULL,
  "min" INTEGER NOT NULL,
  "max" INTEGER NOT NULL,
  "required" INTEGER NOT NULL,
  "sync_status" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "modifiers" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  "deleted_at" INTEGER,
  "group_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "price_delta_minor" INTEGER NOT NULL,
  "sync_status" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "product_modifier_groups" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  "deleted_at" INTEGER,
  "product_id" TEXT NOT NULL,
  "group_id" TEXT NOT NULL,
  "sync_status" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "order_line_modifiers" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  "deleted_at" INTEGER,
  "order_line_id" TEXT NOT NULL,
  "modifier_id" TEXT NOT NULL,
  "price_delta_minor" INTEGER NOT NULL,
  "note" TEXT,
  "sync_status" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "combos" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  "deleted_at" INTEGER,
  "name" TEXT NOT NULL,
  "price_minor" INTEGER NOT NULL,
  "items" TEXT,
  "sync_status" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "kitchen_tickets" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  "deleted_at" INTEGER,
  "order_id" TEXT NOT NULL,
  "station" TEXT NOT NULL CHECK ("station" IN ('grill', 'cold', 'bar', 'all')),
  "status" TEXT NOT NULL CHECK ("status" IN ('new', 'preparing', 'done', 'bumped')),
  "sent_at" INTEGER,
  "bumped_at" INTEGER,
  "sync_status" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "outbox" (
  "op_id" TEXT PRIMARY KEY,
  "entity" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "op" TEXT NOT NULL CHECK ("op" IN ('insert', 'update', 'delete')),
  "payload" TEXT NOT NULL,
  "seq" INTEGER NOT NULL,
  "synced_at" INTEGER
);

CREATE TABLE IF NOT EXISTS "sync_cursor" (
  "id" TEXT PRIMARY KEY,
  "checkpoint" TEXT NOT NULL,
  "updated_at" INTEGER NOT NULL
);
