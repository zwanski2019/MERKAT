/**
 * Vertical feature flags (CLAUDE.md §4, §13).
 * UI reads these flags; never branch on raw `business_type` strings in components.
 */
export const BUSINESS_TYPES = ["retail", "restaurant", "general"] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export interface FeatureFlags {
  variants: boolean; // shade/size, batch/expiry
  tables: boolean; // restaurant floor plan
  kitchenDisplay: boolean; // KDS
  menuModifiers: boolean; // modifier groups / combos
  expiryTracking: boolean;
}

const FLAGS: Record<BusinessType, FeatureFlags> = {
  retail: {
    variants: true,
    tables: false,
    kitchenDisplay: false,
    menuModifiers: false,
    expiryTracking: true,
  },
  restaurant: {
    variants: false,
    tables: true,
    kitchenDisplay: true,
    menuModifiers: true,
    expiryTracking: false,
  },
  general: {
    variants: true,
    tables: false,
    kitchenDisplay: false,
    menuModifiers: false,
    expiryTracking: false,
  },
};

export function featuresFor(businessType: BusinessType): FeatureFlags {
  return FLAGS[businessType];
}
