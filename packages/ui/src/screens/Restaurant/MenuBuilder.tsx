/**
 * Menu builder (CLAUDE.md §5, Phase 7). Categories + items + modifier groups.
 * Add menu items here; modifier groups drive the check's modifier picker.
 * Combos are noted for a later pass.
 */
import { useState } from "react";
import { formatMoney, money, newId } from "@merkat/core";
import { useRestaurant } from "../../state/restaurant.js";
import { useSession } from "../../state/session.js";

export function MenuBuilder(): JSX.Element {
  const categories = useRestaurant((s) => s.categories);
  const menuItems = useRestaurant((s) => s.menuItems);
  const modifierGroups = useRestaurant((s) => s.modifierGroups);
  const combos = useRestaurant((s) => s.combos);
  const addMenuItem = useRestaurant((s) => s.addMenuItem);
  const branding = useSession((s) => s.branding);
  const fmt = (m: number): string =>
    formatMoney(money(m, branding.currency), branding.locale);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");

  function add(): void {
    const priceMinor = Math.round((Number(price) || 0) * 100);
    if (!name.trim() || priceMinor <= 0 || !categoryId) return;
    addMenuItem({
      id: newId(),
      categoryId,
      name: name.trim(),
      priceMinor,
      modifierGroupIds: [],
    });
    setName("");
    setPrice("");
  }

  return (
    <div className="max-w-3xl">
      <h1 className="mb-4 text-xl font-semibold text-fg">Menu</h1>

      <div className="mb-6 flex flex-wrap items-end gap-2 rounded-[--radius-card] border border-border p-3">
        <label className="flex-1">
          <span className="mb-1 block text-xs text-muted">Item name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
          />
        </label>
        <label className="w-28">
          <span className="mb-1 block text-xs text-muted">Price</span>
          <input
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="input merkat-num"
          />
        </label>
        <label className="w-36">
          <span className="mb-1 block text-xs text-muted">Category</span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="input"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={add}
          className="rounded-[--radius-control] bg-accent px-4 py-2 font-medium text-white"
        >
          Add item
        </button>
      </div>

      {categories.map((category) => {
        const items = menuItems.filter((i) => i.categoryId === category.id);
        if (items.length === 0) return null;
        return (
          <div key={category.id} className="mb-6">
            <h2 className="mb-2 font-medium text-fg">{category.name}</h2>
            <div className="divide-y divide-border rounded-[--radius-card] border border-border">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between p-3 text-sm">
                  <span className="text-fg">
                    {item.name}
                    {item.station ? (
                      <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-xs capitalize text-muted">
                        {item.station}
                      </span>
                    ) : null}
                  </span>
                  <span className="merkat-num text-fg">
                    {fmt(item.priceMinor)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <h2 className="mb-2 font-medium text-fg">Modifier groups</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {modifierGroups.map((group) => (
          <div
            key={group.id}
            className="rounded-[--radius-card] border border-border p-3"
          >
            <div className="mb-1 text-sm font-medium text-fg">
              {group.name}
              {group.required ? <span className="text-danger"> *</span> : null}
            </div>
            <ul className="space-y-0.5 text-sm text-muted">
              {group.modifiers.map((m) => (
                <li key={m.id} className="flex justify-between">
                  <span>{m.name}</span>
                  <span className="merkat-num">
                    {m.priceDeltaMinor > 0 ? `+${fmt(m.priceDeltaMinor)}` : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <h2 className="mb-2 mt-6 font-medium text-fg">Combos</h2>
      <div className="divide-y divide-border rounded-[--radius-card] border border-border">
        {combos.map((combo) => (
          <div key={combo.id} className="flex justify-between p-3 text-sm">
            <span className="text-fg">
              {combo.name}
              <span className="ml-2 text-xs text-muted">
                {combo.itemIds.length} items
              </span>
            </span>
            <span className="merkat-num text-fg">{fmt(combo.priceMinor)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
