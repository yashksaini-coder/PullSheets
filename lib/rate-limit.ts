export interface Bucket { capacity: number; refillPerMs: number }

export const MAX_KEYS = 50_000;

/**
 * In-memory token bucket. One instance per process — fine for a single Next server and for
 * phase 2; a multi-instance deploy moves this to Redis/Upstash behind the same `take()`.
 */
export class TokenBucket {
  private state = new Map<string, { tokens: number; at: number }>();
  private lastGc = 0;
  constructor(private opts: Bucket, private now: () => number = Date.now) {}

  get size() { return this.state.size; }

  take(key: string): { ok: true } | { ok: false; resetAt: Date } {
    const now = this.now();
    this.gc(now);
    const s = this.state.get(key) ?? { tokens: this.opts.capacity, at: now };
    s.tokens = Math.min(this.opts.capacity, s.tokens + (now - s.at) * this.opts.refillPerMs);
    s.at = now;
    let result: { ok: true } | { ok: false; resetAt: Date };
    if (s.tokens >= 1) {
      s.tokens -= 1;
      this.state.set(key, s);
      result = { ok: true };
    } else {
      this.state.set(key, s);
      const msUntilToken = this.opts.refillPerMs > 0 ? (1 - s.tokens) / this.opts.refillPerMs : Number.POSITIVE_INFINITY;
      result = { ok: false, resetAt: new Date(now + Math.min(msUntilToken, 24 * 3600 * 1000)) };
    }
    // The idle gc below only removes keys that have fully refilled (up to 10 min for
    // anonymousPrLimiter) — a sustained flood of never-repeating keys would otherwise grow this
    // map unbounded for that whole window. Real eviction caps it regardless of refill eligibility.
    if (this.state.size > MAX_KEYS) this.evictOldest(this.state.size - Math.floor(MAX_KEYS / 2));
    return result;
  }

  /** Drop keys that have fully refilled — they are indistinguishable from unseen keys. Runs at most once a minute. */
  private gc(now: number) {
    if (now - this.lastGc < 60_000) return;
    this.lastGc = now;
    const full = this.opts.refillPerMs > 0 ? this.opts.capacity / this.opts.refillPerMs : Number.POSITIVE_INFINITY;
    for (const [k, s] of this.state) if (now - s.at >= full) this.state.delete(k);
  }

  // ponytail: oldest-touched eviction, not LRU-exact; keys an attacker mints never recur, and a
  // busy legitimate IP evicted early just gets a fresh bucket. Move to Redis with TTLs before
  // multi-instance.
  private evictOldest(n: number) {
    const oldest = [...this.state.entries()].sort((a, b) => a[1].at - b[1].at).slice(0, n);
    for (const [k] of oldest) this.state.delete(k);
  }
}

/** Anonymous `/api/pr`: 30 requests per 10 minutes per client. */
export const anonymousPrLimiter = new TokenBucket({ capacity: 30, refillPerMs: 30 / (10 * 60 * 1000) });

// ponytail: trusts the first x-forwarded-for hop. Only sound behind a proxy that overwrites XFF
// (Vercel, Cloudflare, nginx with real_ip). A direct-exposed deploy must put one in front or this
// limiter is bypassable by sending a random XFF per request.
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip')?.trim() || 'local';
}
