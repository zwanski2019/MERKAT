/**
 * Per-key token-bucket rate limiter (CLAUDE.md §9 — "rate-limit every AI tool
 * call"). Pure and deterministic (clock is injectable), so the API can throttle
 * assistant calls per tenant. Refills continuously at `ratePerSec`.
 */
export interface RateLimiterOptions {
  readonly capacity: number; // max burst
  readonly ratePerSec: number; // sustained refill rate
  now?(): number;
}

interface Bucket {
  tokens: number;
  updatedAt: number;
}

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly capacity: number;
  private readonly ratePerSec: number;
  private readonly now: () => number;

  constructor(opts: RateLimiterOptions) {
    this.capacity = opts.capacity;
    this.ratePerSec = opts.ratePerSec;
    this.now = opts.now ?? (() => Date.now());
  }

  /** Consume one token for `key`; returns false when the bucket is empty. */
  take(key: string): boolean {
    const t = this.now();
    const bucket = this.buckets.get(key) ?? {
      tokens: this.capacity,
      updatedAt: t,
    };
    const elapsedSec = (t - bucket.updatedAt) / 1000;
    bucket.tokens = Math.min(
      this.capacity,
      bucket.tokens + elapsedSec * this.ratePerSec,
    );
    bucket.updatedAt = t;
    if (bucket.tokens < 1) {
      this.buckets.set(key, bucket);
      return false;
    }
    bucket.tokens -= 1;
    this.buckets.set(key, bucket);
    return true;
  }
}
