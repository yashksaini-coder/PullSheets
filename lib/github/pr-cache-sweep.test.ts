import { describe, expect, it } from 'vitest';
import { maybeSweep, SWEEP_EVERY_MS, SWEEP_OLDER_THAN_MS } from './pr-cache-sweep';

describe('maybeSweep', () => {
  it('sweeps rows older than 7 days, then not again for 10 minutes', async () => {
    let t = 10_000_000_000;
    const calls: Date[] = [];
    const store = { sweep: async (before: Date) => { calls.push(before); return 3; } };
    expect(await maybeSweep(store, () => t)).toBe(true);
    expect(calls[0].getTime()).toBe(t - SWEEP_OLDER_THAN_MS);
    expect(await maybeSweep(store, () => t + 1000)).toBe(false);
    t += SWEEP_EVERY_MS + 1;
    expect(await maybeSweep(store, () => t)).toBe(true);
    expect(calls).toHaveLength(2);
  });
  it('a failing sweep never breaks the caller', async () => {
    const store = { sweep: async () => { throw new Error('db down'); } };
    await expect(maybeSweep(store, () => 99_000_000_000)).resolves.toBe(false);
  });
});
