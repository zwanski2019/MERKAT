import { describe, expect, it } from "vitest";
import { RateLimiter } from "./ratelimit.js";

describe("RateLimiter (§9)", () => {
  it("allows a burst up to capacity, then throttles", () => {
    const t = 0;
    const rl = new RateLimiter({ capacity: 3, ratePerSec: 1, now: () => t });
    expect(rl.take("tenant-a")).toBe(true);
    expect(rl.take("tenant-a")).toBe(true);
    expect(rl.take("tenant-a")).toBe(true);
    expect(rl.take("tenant-a")).toBe(false); // bucket empty
  });

  it("refills over time", () => {
    let t = 0;
    const rl = new RateLimiter({ capacity: 1, ratePerSec: 1, now: () => t });
    expect(rl.take("a")).toBe(true);
    expect(rl.take("a")).toBe(false);
    t = 1000; // one second later → one token back
    expect(rl.take("a")).toBe(true);
  });

  it("isolates buckets per key (per-tenant)", () => {
    const t = 0;
    const rl = new RateLimiter({ capacity: 1, ratePerSec: 1, now: () => t });
    expect(rl.take("a")).toBe(true);
    expect(rl.take("b")).toBe(true); // different tenant unaffected
    expect(rl.take("a")).toBe(false);
  });
});
