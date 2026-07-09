import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { FloorPlan } from "./FloorPlan.js";
import { KDS } from "./KDS.js";
import { useRestaurant } from "../../state/restaurant.js";
import { useOrders } from "../../state/orders.js";

// Reset the shared restaurant state between component tests.
beforeEach(() => {
  act(() =>
    useRestaurant.setState((s) => ({
      tickets: [],
      checks: {},
      tables: s.tables.map((t) => ({ ...t, status: "open" as const })),
    })),
  );
});
afterEach(cleanup);

describe("FloorPlan → check (§12 Phase 7 gate)", () => {
  it("seats a table, sends to the kitchen, and closes the check", async () => {
    render(
      <MemoryRouter>
        <FloorPlan />
      </MemoryRouter>,
    );

    // seat T1 → check panel opens
    fireEvent.click(screen.getByRole("button", { name: /T1/ }));
    expect(
      useRestaurant.getState().tables.find((t) => t.label === "T1")!.status,
    ).toBe("occupied");
    const check = screen.getByRole("dialog", { name: "Table check" });

    // add a no-modifier item and send to kitchen
    fireEvent.click(within(check).getByRole("button", { name: /Fries/ }));
    fireEvent.click(
      within(check).getByRole("button", { name: "Send to kitchen" }),
    );
    expect(useRestaurant.getState().tickets).toHaveLength(1);

    // close the check → cash payment → order recorded, table freed
    const ordersBefore = useOrders.getState().orders.length;
    fireEvent.click(within(check).getByRole("button", { name: "Close check" }));
    const pay = screen.getByRole("dialog", { name: "Cash payment" });
    fireEvent.change(within(pay).getByRole("textbox"), {
      target: { value: "20" },
    });
    fireEvent.click(within(pay).getByRole("button", { name: "Complete sale" }));

    expect(
      await screen.findByRole("dialog", { name: "Receipt" }),
    ).toBeDefined();
    expect(useOrders.getState().orders.length).toBe(ordersBefore + 1);
    expect(
      useRestaurant.getState().tables.find((t) => t.label === "T1")!.status,
    ).toBe("open");
  });
});

describe("KDS bump (§5, §12 gate)", () => {
  it("shows a sent ticket and bumps it", () => {
    // send a ticket via the store, then render the kitchen display
    act(() => {
      const t2 = useRestaurant.getState().tables[1]!.id;
      useRestaurant.getState().seatTable(t2);
      useRestaurant.getState().addToCheck(t2, {
        key: "k1",
        itemId: "item-fries",
        name: "Fries",
        unitPriceMinor: 500,
        qty: 1,
        modifiers: [],
      });
      useRestaurant.getState().sendToKitchen(t2);
    });

    render(
      <MemoryRouter>
        <KDS />
      </MemoryRouter>,
    );
    expect(screen.getByText("T2")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Bump" }));
    expect(useRestaurant.getState().tickets[0]!.status).toBe("bumped");
  });
});
