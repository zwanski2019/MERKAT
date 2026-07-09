import { afterEach, describe, expect, it } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Customers } from "./Customers.js";

afterEach(cleanup);

describe("Customers CRM (§5)", () => {
  it("lists seeded customers and adds a new one", () => {
    render(
      <MemoryRouter>
        <Customers />
      </MemoryRouter>,
    );
    expect(screen.getByText("Nadia Haddad")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Add customer" }));
    const dialog = screen.getByRole("dialog", { name: "Add customer" });
    fireEvent.change(within(dialog).getAllByRole("textbox")[0]!, {
      target: { value: "Yasmin Kaddour" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(screen.getByText("Yasmin Kaddour")).toBeDefined();
  });
});
