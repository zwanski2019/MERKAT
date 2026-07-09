import { afterEach, describe, expect, it } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { ReceiptStockIn } from "./ReceiptStockIn.js";
import { useInventory } from "../../state/inventory.js";

afterEach(cleanup);

function serumOnHand(): number {
  return useInventory
    .getState()
    .items.find((i) => i.product.name === "Vitamin C Serum")!.onHand;
}

describe("Receipt OCR stock-in — confirm before write (§9, §12 gate)", () => {
  it("shows a draft and only writes stock after the operator confirms", () => {
    render(<ReceiptStockIn onClose={() => {}} />);
    const dialog = screen.getByRole("dialog", { name: "Receipt stock-in" });

    // the AI draft is shown; nothing written yet
    expect(within(dialog).getByText("Vitamin C Serum")).toBeDefined();
    const before = serumOnHand();

    // confirm → stock is written through the ledger
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Confirm & add stock" }),
    );
    expect(serumOnHand()).toBe(before + 24); // OCR draft: +24 serum
  });
});
