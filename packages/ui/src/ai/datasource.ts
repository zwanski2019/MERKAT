/**
 * Browser AI data source (CLAUDE.md §9). Implements the read-only, tenant-scoped
 * `AiDataSource` by reading the app's demo stores live, so the Assistant answers
 * about real data via tool-use. In production these reads run server-side
 * (parameterized, tenant-scoped) behind the API AI proxy — the AI never touches
 * the DB directly.
 */
import type {
  AiDataSource,
  ExpiringItem,
  LowStockItem,
  ReorderForecast,
  SalesSummary,
  SlowMover,
  TopProduct,
} from "@merkat/ai";
import { useInventory } from "../state/inventory.js";
import { useOrders } from "../state/orders.js";

export class UiAiDataSource implements AiDataSource {
  salesSummary(): SalesSummary {
    const orders = useOrders.getState().orders;
    const paid = orders.filter((o) => o.order.status !== "voided");
    const buckets = new Map<string, { revenueMinor: number; orders: number }>();
    let total = 0;
    for (const { order } of paid) {
      total += order.totalMinor;
      const key = new Date(order.createdAt).toISOString().slice(0, 10);
      const b = buckets.get(key) ?? { revenueMinor: 0, orders: 0 };
      b.revenueMinor += order.totalMinor;
      b.orders += 1;
      buckets.set(key, b);
    }
    return {
      totalRevenueMinor: total,
      orders: paid.length,
      buckets: [...buckets.entries()].map(([key, v]) => ({ key, ...v })),
    };
  }

  lowStock(): LowStockItem[] {
    return useInventory
      .getState()
      .items.filter((i) => i.lowStock)
      .map((i) => ({
        productId: i.product.id,
        name: i.product.name,
        onHand: i.onHand,
        threshold: i.product.lowStockThreshold ?? 0,
      }));
  }

  topProducts(_range: unknown, limit: number, metric: string): TopProduct[] {
    const agg = new Map<string, TopProduct>();
    for (const { lines } of useOrders.getState().orders) {
      for (const l of lines) {
        const id = l.productId ?? l.variantId ?? l.name;
        const prev = agg.get(id) ?? {
          productId: id,
          name: l.name,
          revenueMinor: 0,
          units: 0,
        };
        agg.set(id, {
          ...prev,
          revenueMinor: prev.revenueMinor + l.lineTotalMinor,
          units: prev.units + l.qty,
        });
      }
    }
    const sorted = [...agg.values()].sort((a, b) =>
      metric === "units" ? b.units - a.units : b.revenueMinor - a.revenueMinor,
    );
    return sorted.slice(0, limit);
  }

  slowMovers(): SlowMover[] {
    const sold = new Set<string>();
    for (const { lines } of useOrders.getState().orders) {
      for (const l of lines) if (l.productId) sold.add(l.productId);
    }
    return useInventory
      .getState()
      .items.filter((i) => !sold.has(i.product.id))
      .map((i) => ({
        productId: i.product.id,
        name: i.product.name,
        units: 0,
        lastSoldAt: null,
      }));
  }

  forecastReorder(): ReorderForecast[] {
    return useInventory
      .getState()
      .items.filter((i) => i.lowStock)
      .map((i) => {
        const threshold = i.product.lowStockThreshold ?? 0;
        return {
          productId: i.product.id,
          name: i.product.name,
          onHand: i.onHand,
          dailyVelocity: 1,
          suggestedReorder: Math.max(0, threshold * 3 - i.onHand),
        };
      });
  }

  expiringStock(): ExpiringItem[] {
    return [];
  }
}
