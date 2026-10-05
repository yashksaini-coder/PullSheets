import { describe, expect, it } from 'vitest';
import { MAX_KEYS, TokenBucket, clientIp } from './rate-limit';

describe('TokenBucket', () => {
  it('allows capacity hits then refuses with a future resetAt', () => {
    let t = 1_000_000;
    const b = new TokenBucket({ capacity: 3, refillPerMs: 3 / 600_000 }, () => t);
    expect(b.take('a').ok).toBe(true);
    expect(b.take('a').ok).toBe(true);
    expect(b.take('a').ok).toBe(true);
    const r = b.take('a');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.resetAt.getTime()).toBeGreaterThan(t);
    t += 200_001; // one token refilled
    expect(b.take('a').ok).toBe(true);
  });
  it('keys are independent', () => {
    const b = new TokenBucket({ capacity: 1, refillPerMs: 0 });
    expect(b.take('a').ok).toBe(true);
    expect(b.take('b').ok).toBe(true);
    expect(b.take('a').ok).toBe(false);
  });
  it('forgets idle keys so memory stays bounded', () => {
    let t = 0;
    const b = new TokenBucket({ capacity: 1, refillPerMs: 1 / 1000 }, () => t);
    for (let i = 0; i < 5000; i++) b.take(`k${i}`);
    t += 60 * 60 * 1000;
    b.take('fresh');
    expect(b.size).toBeLessThan(10);
  });
  it('evicts the oldest keys once the map exceeds MAX_KEYS, even when nothing is idle and the clock never advances', () => {
    const t = 0;
    // refillPerMs: 0 — tokens never refill, so the idle gc (keyed off a full refill) can never
    // delete anything here. Only size-triggered eviction can keep this bounded.
    const b = new TokenBucket({ capacity: 1, refillPerMs: 0 }, () => t);
    for (let i = 0; i <= MAX_KEYS; i++) b.take(`k${i}`);
    expect(b.size).toBeLessThanOrEqual(MAX_KEYS);
    expect(b.take('k0').ok).toBe(true); // the oldest key was evicted — this is a fresh bucket
    expect(b.take(`k${MAX_KEYS}`).ok).toBe(false); // the newest key survived and is still refused
  });
});

describe('clientIp', () => {
  const mk = (h: Record<string, string>) => new Request('http://x', { headers: h });
  it('takes the first x-forwarded-for hop', () => { expect(clientIp(mk({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1' }))).toBe('203.0.113.9'); });
  it('falls back to x-real-ip then local', () => {
    expect(clientIp(mk({ 'x-real-ip': '198.51.100.2' }))).toBe('198.51.100.2');
    expect(clientIp(mk({}))).toBe('local');
  });
});
