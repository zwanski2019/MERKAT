import { afterEach, describe, expect, it } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { buildSale } from "@merkat/core";
import { Orders } from "./Orders.js";
import { useInventory } from "../../state/inventory.js";
import { useOrders } from "../../state/orders.js";

afterEach(cleanup);

function serumOnHand(): number {
  return useInventory
    .getState()
    .items.find((i) => i.product.name === "Vitamin C Serum")!.onHand;
}

describe("Orders — refund reverses rows and reprints (§1.4, §12 gate)", () => {
  it("refund returns stock, marks the order refunded, and shows a refund receipt", () => {
    const serum = useInventory
      .getState()
      .items.find((i) => i.product.name === "Vitamin C Serum")!;

    // Simulate a completed POS sale of 2 units.
    const sale = buildSale({
      tenantId: "0191a000-0000-7000-8000-000000000001",
      locationId: useInventory.getState().locationId,
      lines: [
        {
          key: "p:serum",
          productId: serum.product.id,
          variantId: null,
          name: "Vitamin C Serum",
          unitPriceMinor: serum.product.priceMinor,
          qty: 2,
        },
      ],
      taxConfig: { rate: 0.08, inclusive: false },
      method: "cash",
      tenderedMinor: 10000,
    });
    act(() => {
      useInventory.getState().applyMovements(sale.movements);
      useOrders.getState().recordSale(sale);
    });
    expect(serumOnHand()).toBe(38); // 40 - 2 sold

    render(
      <MemoryRouter>
        <Orders />
      </MemoryRouter>,
    );

    // open the order, refund it
    fireEvent.click(screen.getByText(`#${sale.order.id.slice(0, 8)}`));
    const detail = screen.getByRole("dialog", { name: "Order detail" });
    fireEvent.click(within(detail).getByRole("button", { name: "Refund" }));

    // a refund receipt reprints
    const receipt = screen.getByRole("dialog", { name: "Receipt" });
    expect(within(receipt).getByText(/REFUND/)).toBeDefined();

    // stock returned via the ledger, order now refunded
    expect(serumOnHand()).toBe(40);
    expect(screen.getByText("refunded")).toBeDefined();
  });
});
