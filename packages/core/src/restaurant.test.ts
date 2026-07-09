import { describe, expect, it } from "vitest";
import {
  checkLineTotalMinor,
  checkToCartLines,
  groupByStation,
  ticketAgeSeconds,
  ticketUrgency,
  type CheckLine,
  type KitchenTicket,
} from "./restaurant.js";

const burger: CheckLine = {
  key: "l1",
  itemId: "0191a000-0000-7000-8000-000000000001",
  name: "Classic Burger",
  unitPriceMinor: 1450,
  qty: 2,
  modifiers: [{ modifierId: "m1", name: "Double", priceDeltaMinor: 300 }],
};

describe("check line pricing with modifiers", () => {
  it("adds modifier deltas into the unit price", () => {
    expect(checkLineTotalMinor(burger)).toBe((1450 + 300) * 2);
  });

  it("flattens a check into cart lines the sale builder consumes", () => {
    const [line] = checkToCartLines([burger]);
    expect(line!.unitPriceMinor).toBe(1750);
    expect(line!.name).toContain("Double");
    expect(line!.qty).toBe(2);
  });

  it("groups lines by kitchen station for KDS routing", () => {
    const grill: CheckLine = { ...burger, key: "g", station: "grill" };
    const bar: CheckLine = { ...burger, key: "b", station: "bar" };
    const groups = groupByStation([grill, bar, { ...burger, key: "n" }]);
    expect(groups.get("grill")).toHaveLength(1);
    expect(groups.get("bar")).toHaveLength(1);
    expect(groups.get("all")).toHaveLength(1); // no station → "all"
  });
});

describe("kitchen ticket aging (§5, §11)", () => {
  const ticket: KitchenTicket = {
    id: "t1",
    orderId: null,
    tableLabel: "T1",
    station: "all",
    status: "new",
    sentAt: 1_000_000,
    bumpedAt: null,
    items: [],
  };

  it("ages in seconds and stops at bump time", () => {
    expect(ticketAgeSeconds(ticket, 1_000_000 + 90_000)).toBe(90);
    expect(
      ticketAgeSeconds({ ...ticket, bumpedAt: 1_000_000 + 30_000 }, 9e12),
    ).toBe(30);
  });

  it("escalates urgency by age", () => {
    expect(ticketUrgency(10)).toBe("fresh");
    expect(ticketUrgency(360)).toBe("aging"); // > 5 min
    expect(ticketUrgency(700)).toBe("late"); // > 10 min
  });
});
