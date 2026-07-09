import { afterEach, describe, expect, it } from "vitest";
import { applyAccent } from "./accent.js";

afterEach(() => {
  document.documentElement.removeAttribute("style");
});

describe("applyAccent (§11)", () => {
  it("sets the --accent variable for a valid hex", () => {
    applyAccent("#E11D74");
    expect(document.documentElement.style.getPropertyValue("--accent")).toBe(
      "#E11D74",
    );
  });

  it("ignores an invalid hex (no partial writes)", () => {
    applyAccent("not-a-color");
    expect(document.documentElement.style.getPropertyValue("--accent")).toBe(
      "",
    );
  });
});
