import { afterEach, describe, expect, it } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { Transfers } from "./Transfers.js";
import { useInventory } from "../../state/inventory.js";
import { useLocations } from "../../state/locations.js";

afterEach(cleanup);

describe("Stock transfers — paired ledger movements (§4, §1.3)", () => {
  it("moves stock from one location to another, conserving net", () => {
    const store = useInventory.getState().store;
    const serum = useInventory
      .getState()
      .items.find((i) => i.product.name === "Vitamin C Serum")!.product;
    const [from, to] = useLocations.getState().locations;

    const beforeFrom = store.onHandAt(serum.id, from!.id);
    const beforeTo = store.onHandAt(serum.id, to!.id);

    render(<Transfers />);
    fireEvent.change(screen.getByLabelText("Add product"), {
      target: { value: serum.id },
    });
    fireEvent.change(screen.getByLabelText(`Qty for ${serum.name}`), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Transfer stock" }));

    expect(store.onHandAt(serum.id, from!.id)).toBe(beforeFrom - 5);
    expect(store.onHandAt(serum.id, to!.id)).toBe(beforeTo + 5);
  });
});
