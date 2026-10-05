import { describe, expect, it } from 'vitest';
import { TokenBucket, clientIp } from './rate-limit';

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
  it('a flood past MAX_KEYS in the same millisecond still collapses once the clock advances', () => {
    let t = 0;
    // full refill (capacity/refillPerMs) deliberately > the 60s gc throttle, so advancing past
    // "full" below also clears the throttle and the collapse isn't just an artifact of the test.
    const b = new TokenBucket({ capacity: 1, refillPerMs: 1 / 70_000 }, () => t);
    for (let i = 0; i < 60_000; i++) b.take(`k${i}`);
    expect(b.size).toBeLessThanOrEqual(60_000); // none have refilled yet — gc has nothing to delete
    t += 70_001; // past a full refill (and past the 60s gc throttle)
    b.take('fresh');
    expect(b.size).toBeLessThanOrEqual(2);
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
