/**
 * Single source of truth for the product name.
 * Per CLAUDE.md §0: rename the product by changing PRODUCT_NAME here only.
 * Never hardcode the name anywhere else in the codebase.
 */
export const PRODUCT_NAME = "MERKAT" as const;

export type ProductName = typeof PRODUCT_NAME;
