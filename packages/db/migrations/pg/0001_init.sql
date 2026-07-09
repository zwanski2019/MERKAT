-- Generated from packages/db/src/schema/model.ts — do not edit by hand.
-- Regenerate with: pnpm --filter @merkat/db gen:migrations

CREATE TABLE IF NOT EXISTS "tenants" (
  "id" uuid PRIMARY KEY,
  "tenant_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "deleted_at" timestamptz,
  "business_type" text NOT NULL CHECK ("business_type" IN ('retail', 'restaurant', 'general')),
  "name" text NOT NULL,
  "logo_url" text,
  "accent_hex" text NOT NULL,
  "currency" text NOT NULL,
  "tax_config" jsonb,
  "locale" text NOT NULL,
  "sync_status" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "locations" (
  "id" uuid PRIMARY KEY,
  "tenant_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "deleted_at" timestamptz,
  "name" text NOT NULL,
  "address" text,
  "sync_status" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "staff" (
  "id" uuid PRIMARY KEY,
  "tenant_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "deleted_at" timestamptz,
  "role" text NOT NULL CHECK ("role" IN ('owner', 'manager', 'cashier', 'kitchen')),
  "name" text NOT NULL,
  "email" text,
  "pin_hash" text NOT NULL,
  "permissions" jsonb,
  "active" boolean NOT NULL,
  "sync_status" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "categories" (
  "id" uuid PRIMARY KEY,
  "tenant_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "deleted_at" timestamptz,
  "name" text NOT NULL,
  "sort_order" integer NOT NULL,
  "business_type" text CHECK ("business_type" IN ('retail', 'restaurant', 'general')),
  "sync_status" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "products" (
  "id" uuid PRIMARY KEY,
  "tenant_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "deleted_at" timestamptz,
  "category_id" uuid,
  "name" text NOT NULL,
  "price_minor" bigint NOT NULL,
  "cost_minor" bigint,
  "sku" text,
  "barcode" text,
  "description" text,
  "image_url" text,
  "low_stock_threshold" integer,
  "active" boolean NOT NULL,
  "sync_status" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "product_variants" (
  "id" uuid PRIMARY KEY,
  "tenant_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "deleted_at" timestamptz,
  "product_id" uuid NOT NULL,
  "attributes" jsonb,
  "sku" text,
  "barcode" text,
  "price_minor" bigint,
  "expiry_date" timestamptz,
  "batch_no" text,
  "sync_status" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "floor_zones" (
  "id" uuid PRIMARY KEY,
  "tenant_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "deleted_at" timestamptz,
  "name" text NOT NULL,
  "layout" jsonb,
  "sync_status" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "tables" (
  "id" uuid PRIMARY KEY,
  "tenant_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "deleted_at" timestamptz,
  "zone_id" uuid,
  "label" text NOT NULL,
  "seats" integer NOT NULL,
  "x" double precision NOT NULL,
  "y" double precision NOT NULL,
  "shape" text,
  "status" text NOT NULL CHECK ("status" IN ('open', 'occupied', 'check', 'reserved')),
  "sync_status" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "stock_movements" (
  "id" uuid PRIMARY KEY,
  "tenant_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "deleted_at" timestamptz,
  "product_id" uuid,
  "variant_id" uuid,
  "location_id" uuid NOT NULL,
  "delta" integer NOT NULL,
  "reason" text NOT NULL CHECK ("reason" IN ('sale', 'restock', 'adjustment', 'transfer_in', 'transfer_out', 'waste', 'count')),
  "ref_id" uuid,
  "staff_id" uuid,
  "sync_status" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "stock_levels" (
  "id" uuid PRIMARY KEY,
  "tenant_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "deleted_at" timestamptz,
  "product_id" uuid,
  "variant_id" uuid,
  "location_id" uuid NOT NULL,
  "qty" integer NOT NULL
);

CREATE TABLE IF NOT EXISTS "customers" (
  "id" uuid PRIMARY KEY,
  "tenant_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "deleted_at" timestamptz,
  "name" text NOT NULL,
  "email" text,
  "phone" text,
  "loyalty_points" integer NOT NULL,
  "total_spend_minor" bigint NOT NULL,
  "tags" jsonb,
  "notes" text,
  "sync_status" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "orders" (
  "id" uuid PRIMARY KEY,
  "tenant_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "deleted_at" timestamptz,
  "location_id" uuid NOT NULL,
  "customer_id" uuid,
  "channel" text NOT NULL CHECK ("channel" IN ('in_store', 'online')),
  "status" text NOT NULL CHECK ("status" IN ('open', 'paid', 'refunded', 'voided')),
  "subtotal_minor" bigint NOT NULL,
  "tax_minor" bigint NOT NULL,
  "discount_minor" bigint NOT NULL,
  "total_minor" bigint NOT NULL,
  "table_id" uuid,
  "opened_by" uuid,
  "closed_at" timestamptz,
  "sync_status" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "order_lines" (
  "id" uuid PRIMARY KEY,
  "tenant_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "deleted_at" timestamptz,
  "order_id" uuid NOT NULL,
  "product_id" uuid,
  "variant_id" uuid,
  "qty" integer NOT NULL,
  "unit_price_minor" bigint NOT NULL,
  "line_total_minor" bigint NOT NULL,
  "note" text,
  "sync_status" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "payments" (
  "id" uuid PRIMARY KEY,
  "tenant_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "deleted_at" timestamptz,
  "order_id" uuid NOT NULL,
  "method" text NOT NULL CHECK ("method" IN ('cash', 'card', 'mobile')),
  "amount_minor" bigint NOT NULL,
  "provider_ref" text,
  "status" text NOT NULL CHECK ("status" IN ('pending', 'paid', 'failed', 'refunded')),
  "sync_status" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "audit_log" (
  "id" uuid PRIMARY KEY,
  "tenant_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "deleted_at" timestamptz,
  "staff_id" uuid,
  "action" text NOT NULL,
  "entity" text NOT NULL,
  "entity_id" uuid,
  "before" jsonb,
  "after" jsonb,
  "sync_status" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "modifier_groups" (
  "id" uuid PRIMARY KEY,
  "tenant_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "deleted_at" timestamptz,
  "name" text NOT NULL,
  "min" integer NOT NULL,
  "max" integer NOT NULL,
  "required" boolean NOT NULL,
  "sync_status" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "modifiers" (
  "id" uuid PRIMARY KEY,
  "tenant_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "deleted_at" timestamptz,
  "group_id" uuid NOT NULL,
  "name" text NOT NULL,
  "price_delta_minor" bigint NOT NULL,
  "sync_status" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "product_modifier_groups" (
  "id" uuid PRIMARY KEY,
  "tenant_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "deleted_at" timestamptz,
  "product_id" uuid NOT NULL,
  "group_id" uuid NOT NULL,
  "sync_status" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "order_line_modifiers" (
  "id" uuid PRIMARY KEY,
  "tenant_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "deleted_at" timestamptz,
  "order_line_id" uuid NOT NULL,
  "modifier_id" uuid NOT NULL,
  "price_delta_minor" bigint NOT NULL,
  "note" text,
  "sync_status" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "combos" (
  "id" uuid PRIMARY KEY,
  "tenant_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "deleted_at" timestamptz,
  "name" text NOT NULL,
  "price_minor" bigint NOT NULL,
  "items" jsonb,
  "sync_status" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "kitchen_tickets" (
  "id" uuid PRIMARY KEY,
  "tenant_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "deleted_at" timestamptz,
  "order_id" uuid NOT NULL,
  "station" text NOT NULL CHECK ("station" IN ('grill', 'cold', 'bar', 'all')),
  "status" text NOT NULL CHECK ("status" IN ('new', 'preparing', 'done', 'bumped')),
  "sent_at" timestamptz,
  "bumped_at" timestamptz,
  "sync_status" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "outbox" (
  "op_id" uuid PRIMARY KEY,
  "entity" text NOT NULL,
  "entity_id" uuid NOT NULL,
  "op" text NOT NULL CHECK ("op" IN ('insert', 'update', 'delete')),
  "payload" jsonb NOT NULL,
  "seq" integer NOT NULL,
  "synced_at" timestamptz
);

CREATE TABLE IF NOT EXISTS "sync_cursor" (
  "id" text PRIMARY KEY,
  "checkpoint" text NOT NULL,
  "updated_at" timestamptz NOT NULL
);
