/**
 * Add-product slide-over (CLAUDE.md §5). Name, price/cost, SKU, low-stock
 * threshold, and — for verticals with variants (§4, features.ts) — a variant
 * repeater (shade/size). AI description is a Phase 8 affordance (§9).
 */
import {
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  featuresFor,
  productInputSchema,
  type VariantInput,
} from "@merkat/core";
import { useInventory } from "../../state/inventory.js";
import { useSession } from "../../state/session.js";

interface VariantDraft {
  attrKey: string;
  attrValue: string;
  sku: string;
}

function toMinor(major: string): number | null {
  const n = Number(major);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function AddProductSlideOver({
  onClose,
}: {
  onClose: () => void;
}): JSX.Element {
  const createProduct = useInventory((s) => s.createProduct);
  const branding = useSession((s) => s.branding);
  const variantsEnabled = featuresFor(branding.businessType).variants;

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [sku, setSku] = useState("");
  const [threshold, setThreshold] = useState("");
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [error, setError] = useState<string | null>(null);

  function submit(): void {
    const priceMinor = toMinor(price);
    if (priceMinor === null) {
      setError("Enter a valid price.");
      return;
    }
    const variantInputs: VariantInput[] = variants
      .filter((v) => v.attrValue.trim())
      .map((v) => ({
        attributes: v.attrKey.trim()
          ? { [v.attrKey.trim()]: v.attrValue.trim() }
          : {},
        sku: v.sku.trim() || null,
      }));

    const parsed = productInputSchema.safeParse({
      name,
      priceMinor,
      costMinor: cost ? toMinor(cost) : null,
      sku: sku.trim() || null,
      lowStockThreshold: threshold ? Number(threshold) : null,
      active: true,
      variants: variantInputs,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form.");
      return;
    }
    createProduct(parsed.data);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-black/30">
      <div
        className="h-full w-full max-w-md overflow-y-auto bg-surface p-6 shadow-xl"
        role="dialog"
        aria-label="Add product"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-fg">Add product</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-muted hover:text-fg"
          >
            ✕
          </button>
        </div>

        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
          />
          <button
            type="button"
            disabled
            title="AI description arrives in Phase 8"
            className="mt-1 text-xs text-muted disabled:opacity-60"
          >
            ✦ Generate description with AI (Phase 8)
          </button>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={`Price (${branding.currency})`}>
            <input
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="input merkat-num"
            />
          </Field>
          <Field label={`Cost (${branding.currency})`}>
            <input
              inputMode="decimal"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="input merkat-num"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="SKU">
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="input merkat-num"
            />
          </Field>
          <Field label="Low-stock at">
            <input
              inputMode="numeric"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="input merkat-num"
            />
          </Field>
        </div>

        {variantsEnabled ? (
          <div className="mt-2">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-fg">Variants</span>
              <button
                type="button"
                onClick={() =>
                  setVariants((v) => [
                    ...v,
                    { attrKey: "shade", attrValue: "", sku: "" },
                  ])
                }
                className="text-sm text-accent"
              >
                + Add variant
              </button>
            </div>
            {variants.map((v, i) => (
              <div
                key={i}
                className="mb-2 grid grid-cols-[1fr_1fr_1fr_auto] gap-2"
              >
                <input
                  placeholder="attribute"
                  value={v.attrKey}
                  onChange={(e) =>
                    updateVariant(setVariants, i, "attrKey", e.target.value)
                  }
                  className="input text-sm"
                />
                <input
                  placeholder="value"
                  value={v.attrValue}
                  onChange={(e) =>
                    updateVariant(setVariants, i, "attrValue", e.target.value)
                  }
                  className="input text-sm"
                />
                <input
                  placeholder="SKU"
                  value={v.sku}
                  onChange={(e) =>
                    updateVariant(setVariants, i, "sku", e.target.value)
                  }
                  className="input merkat-num text-sm"
                />
                <button
                  type="button"
                  onClick={() =>
                    setVariants((vs) => vs.filter((_, j) => j !== i))
                  }
                  aria-label="Remove variant"
                  className="text-muted hover:text-danger"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex gap-3">
          <button
            onClick={submit}
            className="rounded-[--radius-control] bg-accent px-4 py-2 font-medium text-white"
          >
            Save product
          </button>
          <button
            onClick={onClose}
            className="rounded-[--radius-control] border border-border px-4 py-2 text-fg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function updateVariant(
  set: Dispatch<SetStateAction<VariantDraft[]>>,
  index: number,
  key: keyof VariantDraft,
  value: string,
): void {
  set((vs) => vs.map((v, i) => (i === index ? { ...v, [key]: value } : v)));
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <label className="mb-4 block">
      <span className="mb-1 block text-sm text-fg">{label}</span>
      {children}
    </label>
  );
}
