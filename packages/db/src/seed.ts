/**
 * Deterministic-shape seed for one retail and one restaurant tenant
 * (CLAUDE.md §12 Phase 1). Demonstrates the model end-to-end: products +
 * variants, the stock movement ledger, and (for restaurant) floor + menu +
 * modifiers. Stock levels are derived from movements at the end.
 */
import { newId, type Id } from "@merkat/core";
import type { LocalHandle } from "./local.js";
import { rebuildStockLevels } from "./stock.js";
import { insertRow, type Row } from "./write.js";

export interface SeededTenant {
  readonly tenantId: Id;
  readonly locationId: Id;
  readonly productIds: readonly Id[];
}

export interface SeedResult {
  readonly retail: SeededTenant;
  readonly restaurant: SeededTenant;
}

function baseFields(tenantId: Id, now: Date): Row {
  return {
    tenant_id: tenantId,
    created_at: now,
    updated_at: now,
    sync_status: "synced",
  };
}

function seedRetail(handle: LocalHandle, now: Date): SeededTenant {
  const tenantId = newId();
  const locationId = newId();
  const staffId = newId();
  const skincareId = newId();
  const makeupId = newId();
  const serumId = newId();
  const lipstickId = newId();
  const shadeRose = newId();
  const shadeCoral = newId();

  insertRow(handle, "tenants", {
    id: tenantId,
    tenant_id: tenantId, // a tenant is its own scope
    created_at: now,
    updated_at: now,
    sync_status: "synced",
    business_type: "retail",
    name: "Lumière Cosmetics",
    accent_hex: "#E11D74",
    currency: "USD",
    locale: "en-US",
    tax_config: { rate: 0.08, inclusive: false },
  });

  insertRow(handle, "locations", {
    id: locationId,
    ...baseFields(tenantId, now),
    name: "Downtown Store",
    address: "12 Market St",
  });

  insertRow(handle, "staff", {
    id: staffId,
    ...baseFields(tenantId, now),
    role: "owner",
    name: "Amira",
    email: "amira@lumiere.example",
    pin_hash: "argon2id$placeholder", // real argon2id lands in Phase 2
    active: true,
  });

  insertRow(handle, "categories", {
    id: skincareId,
    ...baseFields(tenantId, now),
    name: "Skincare",
    sort_order: 0,
    business_type: "retail",
  });
  insertRow(handle, "categories", {
    id: makeupId,
    ...baseFields(tenantId, now),
    name: "Makeup",
    sort_order: 1,
    business_type: "retail",
  });

  insertRow(handle, "products", {
    id: serumId,
    ...baseFields(tenantId, now),
    category_id: skincareId,
    name: "Vitamin C Serum",
    price_minor: 2999,
    cost_minor: 1200,
    sku: "SKN-SERUM-30",
    low_stock_threshold: 5,
    active: true,
  });
  insertRow(handle, "products", {
    id: lipstickId,
    ...baseFields(tenantId, now),
    category_id: makeupId,
    name: "Matte Lipstick",
    price_minor: 1899,
    cost_minor: 700,
    sku: "MKP-LIP",
    low_stock_threshold: 8,
    active: true,
  });

  // Lipstick sells in shades (retail variants, §4).
  insertRow(handle, "product_variants", {
    id: shadeRose,
    ...baseFields(tenantId, now),
    product_id: lipstickId,
    attributes: { shade: "Rose" },
    sku: "MKP-LIP-ROSE",
    price_minor: 1899,
  });
  insertRow(handle, "product_variants", {
    id: shadeCoral,
    ...baseFields(tenantId, now),
    product_id: lipstickId,
    attributes: { shade: "Coral" },
    sku: "MKP-LIP-CORAL",
    price_minor: 1899,
  });

  // Opening stock as ledger movements (§1.3), not a quantity field.
  const restock = (row: Row): void =>
    insertRow(handle, "stock_movements", {
      id: newId(),
      ...baseFields(tenantId, now),
      location_id: locationId,
      reason: "restock",
      staff_id: staffId,
      ...row,
    });
  restock({ product_id: serumId, delta: 40 });
  restock({ variant_id: shadeRose, delta: 25 });
  restock({ variant_id: shadeCoral, delta: 18 });

  rebuildStockLevels(handle, tenantId);
  return { tenantId, locationId, productIds: [serumId, lipstickId] };
}

function seedRestaurant(handle: LocalHandle, now: Date): SeededTenant {
  const tenantId = newId();
  const locationId = newId();
  const staffId = newId();
  const zoneId = newId();
  const mainsId = newId();
  const burgerId = newId();
  const friesId = newId();
  const sizeGroupId = newId();

  insertRow(handle, "tenants", {
    id: tenantId,
    tenant_id: tenantId,
    created_at: now,
    updated_at: now,
    sync_status: "synced",
    business_type: "restaurant",
    name: "Café Central",
    accent_hex: "#0EA5E9",
    currency: "EUR",
    locale: "fr-FR",
    tax_config: { rate: 0.1, inclusive: true },
  });

  insertRow(handle, "locations", {
    id: locationId,
    ...baseFields(tenantId, now),
    name: "Main Branch",
    address: "3 Rue de la Paix",
  });

  insertRow(handle, "staff", {
    id: staffId,
    ...baseFields(tenantId, now),
    role: "manager",
    name: "Karim",
    pin_hash: "argon2id$placeholder",
    active: true,
  });

  insertRow(handle, "floor_zones", {
    id: zoneId,
    ...baseFields(tenantId, now),
    name: "Terrace",
  });
  insertRow(handle, "tables", {
    id: newId(),
    ...baseFields(tenantId, now),
    zone_id: zoneId,
    label: "T1",
    seats: 4,
    x: 40,
    y: 60,
    shape: "round",
    status: "open",
  });
  insertRow(handle, "tables", {
    id: newId(),
    ...baseFields(tenantId, now),
    zone_id: zoneId,
    label: "T2",
    seats: 2,
    x: 140,
    y: 60,
    shape: "square",
    status: "open",
  });

  insertRow(handle, "categories", {
    id: mainsId,
    ...baseFields(tenantId, now),
    name: "Mains",
    sort_order: 0,
    business_type: "restaurant",
  });

  insertRow(handle, "products", {
    id: burgerId,
    ...baseFields(tenantId, now),
    category_id: mainsId,
    name: "Classic Burger",
    price_minor: 1450,
    cost_minor: 500,
    active: true,
  });
  insertRow(handle, "products", {
    id: friesId,
    ...baseFields(tenantId, now),
    category_id: mainsId,
    name: "Fries",
    price_minor: 500,
    cost_minor: 150,
    active: true,
  });

  // Burger has a required "Choose size" modifier group (§4).
  insertRow(handle, "modifier_groups", {
    id: sizeGroupId,
    ...baseFields(tenantId, now),
    name: "Choose size",
    min: 1,
    max: 1,
    required: true,
  });
  const single = newId();
  const double = newId();
  insertRow(handle, "modifiers", {
    id: single,
    ...baseFields(tenantId, now),
    group_id: sizeGroupId,
    name: "Single",
    price_delta_minor: 0,
  });
  insertRow(handle, "modifiers", {
    id: double,
    ...baseFields(tenantId, now),
    group_id: sizeGroupId,
    name: "Double",
    price_delta_minor: 300,
  });
  insertRow(handle, "product_modifier_groups", {
    id: newId(),
    ...baseFields(tenantId, now),
    product_id: burgerId,
    group_id: sizeGroupId,
  });

  rebuildStockLevels(handle, tenantId);
  return { tenantId, locationId, productIds: [burgerId, friesId] };
}

/** Seed both reference tenants into an already-migrated local database. */
export function seed(handle: LocalHandle, now = new Date()): SeedResult {
  return {
    retail: seedRetail(handle, now),
    restaurant: seedRestaurant(handle, now),
  };
}
