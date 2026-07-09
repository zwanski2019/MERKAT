import { afterEach, describe, expect, it } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { Purchases } from "./Purchases.js";
import { useInventory } from "../../state/inventory.js";
import { usePurchasing } from "../../state/purchasing.js";

afterEach(cleanup);

function serumOnHand(): number {
  return useInventory
    .getState()
    .items.find((i) => i.product.name === "Vitamin C Serum")!.onHand;
}

describe("Purchasing — receive writes stock through the ledger (§14, §1.3)", () => {
  it("receiving a PO restocks the product", () => {
    const serum = useInventory
      .getState()
      .items.find((i) => i.product.name === "Vitamin C Serum")!;
    const supplierId = usePurchasing.getState().suppliers[0]!.id;

    act(() => {
      usePurchasing.getState().createOrder({
        supplierId,
        lines: [
          {
            productId: serum.product.id,
            name: serum.product.name,
            qty: 10,
            unitCostMinor: 1200,
          },
        ],
      });
    });

    render(<Purchases />);
    const before = serumOnHand();
    fireEvent.click(screen.getByRole("button", { name: "Receive" }));
    expect(serumOnHand()).toBe(before + 10);
    expect(screen.getByText("Received")).toBeDefined();
  });
});
