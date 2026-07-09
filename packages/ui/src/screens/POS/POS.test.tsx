import { afterEach, describe, expect, it } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { POS } from "./POS.js";
import { useInventory } from "../../state/inventory.js";
import { usePos } from "../../state/pos.js";

afterEach(() => {
  cleanup();
  act(() => usePos.getState().clear());
});

// The offline-sale flow is a release blocker (§13). No network is touched:
// the seed store is in-memory and WebHardware is a local no-op.
describe("POS — full offline cash sale (§12 Phase 4 gate)", () => {
  it("browse → cart → charge → receipt, and stock decrements via the ledger", async () => {
    const before = useInventory
      .getState()
      .items.find((i) => i.product.name === "Vitamin C Serum")!.onHand;

    render(
      <MemoryRouter>
        <POS />
      </MemoryRouter>,
    );

    // browse → add to cart
    fireEvent.click(screen.getByRole("button", { name: /Vitamin C Serum/ }));

    // charge
    fireEvent.click(screen.getByRole("button", { name: /^Charge/ }));
    const payDialog = screen.getByRole("dialog", { name: "Cash payment" });
    fireEvent.change(within(payDialog).getByRole("textbox"), {
      target: { value: "100" },
    });
    fireEvent.click(
      within(payDialog).getByRole("button", { name: "Complete sale" }),
    );

    // receipt prints (previews) — sale complete
    const receipt = await screen.findByRole("dialog", { name: "Receipt" });
    expect(within(receipt).getByText("Sale complete ✓")).toBeDefined();
    expect(within(receipt).getByText(/Vitamin C Serum/)).toBeDefined();

    // stock decremented through the sale movement (§1.3)
    await waitFor(() => {
      const after = useInventory
        .getState()
        .items.find((i) => i.product.name === "Vitamin C Serum")!.onHand;
      expect(after).toBe(before - 1);
    });
  });

  it("opens a variant picker for products with variants", () => {
    render(
      <MemoryRouter>
        <POS />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Matte Lipstick/ }));
    const picker = screen.getByRole("dialog", { name: "Choose variant" });
    expect(within(picker).getByText(/Rose/)).toBeDefined();
    expect(within(picker).getByText(/Coral/)).toBeDefined();
  });
});
