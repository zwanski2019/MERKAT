import { describe, expect, it } from "vitest";
import { checkToCartLines } from "@merkat/core";
import { createRestaurantStore } from "./restaurant.js";

describe("restaurant flow — seat → send → bump → close (§12 Phase 7 gate)", () => {
  it("runs the whole table lifecycle", () => {
    const s = createRestaurantStore();
    const t1 = s.getState().tables[0]!.id;
    const burger = s
      .getState()
      .menuItems.find((i) => i.name === "Classic Burger")!;

    // seat the table
    s.getState().seatTable(t1);
    expect(s.getState().tables.find((t) => t.id === t1)!.status).toBe(
      "occupied",
    );

    // add a burger with a modifier
    s.getState().addToCheck(t1, {
      key: "l1",
      itemId: burger.id,
      name: burger.name,
      unitPriceMinor: burger.priceMinor,
      qty: 1,
      modifiers: [
        { modifierId: "mod-double", name: "Double", priceDeltaMinor: 300 },
      ],
    });
    expect(s.getState().checks[t1]).toHaveLength(1);

    // send to kitchen → a ticket appears
    s.getState().sendToKitchen(t1);
    expect(s.getState().tickets).toHaveLength(1);
    const ticket = s.getState().tickets[0]!;
    expect(ticket.status).toBe("new");
    expect(ticket.items[0]!.modifiers).toContain("Double");

    // bump it → done
    s.getState().bumpTicket(ticket.id);
    expect(s.getState().tickets[0]!.status).toBe("bumped");

    // close the check → returns priced lines, frees the table
    const lines = s.getState().closeCheck(t1);
    const cart = checkToCartLines(lines);
    expect(cart[0]!.unitPriceMinor).toBe(1450 + 300); // burger + double
    expect(s.getState().checks[t1]).toBeUndefined();
    expect(s.getState().tables.find((t) => t.id === t1)!.status).toBe("open");
  });

  it("won't send an empty check to the kitchen", () => {
    const s = createRestaurantStore();
    s.getState().seatTable(s.getState().tables[0]!.id);
    s.getState().sendToKitchen(s.getState().tables[0]!.id);
    expect(s.getState().tickets).toHaveLength(0);
  });
});
