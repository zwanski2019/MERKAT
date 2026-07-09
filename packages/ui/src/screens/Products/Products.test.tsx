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
import { Products } from "./Products.js";
import { useInventory } from "../../state/inventory.js";

afterEach(cleanup);

function renderProducts() {
  return render(
    <MemoryRouter>
      <Products />
    </MemoryRouter>,
  );
}

describe("Products screen (Phase 3)", () => {
  it("lists seeded products with a low-stock pill on the low item", () => {
    renderProducts();
    expect(screen.getByText("Vitamin C Serum")).toBeDefined();
    const creamRow = screen.getByText("Face Cream").closest("tr")!;
    // low-stock products render the ▲ marker
    expect(within(creamRow).getByText(/▲/)).toBeDefined();
  });

  it("opens the add-product slide-over", () => {
    renderProducts();
    fireEvent.click(screen.getByRole("button", { name: "Add product" }));
    expect(screen.getByRole("dialog", { name: "Add product" })).toBeDefined();
  });

  it("adding stock updates the derived on-hand and clears low-stock", () => {
    renderProducts();
    const cream = useInventory
      .getState()
      .items.find((i) => i.product.name === "Face Cream")!;
    act(() => {
      useInventory.getState().addStock({
        productId: cream.product.id,
        locationId: useInventory.getState().locationId,
        qty: 20,
        reason: "restock",
      });
    });
    const creamRow = screen.getByText("Face Cream").closest("tr")!;
    expect(within(creamRow).getByText("26")).toBeDefined(); // 6 + 20
    expect(within(creamRow).queryByText(/▲/)).toBeNull(); // no longer low
  });
});
