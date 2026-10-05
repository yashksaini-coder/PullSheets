import type { PrCacheStore } from './pr-cache-store';

export const SWEEP_OLDER_THAN_MS = 7 * 24 * 60 * 60 * 1000;
export const SWEEP_EVERY_MS = 10 * 60 * 1000;

const lastRun = new WeakMap<object, number>();

/** Opportunistic janitor: called after every cache write, runs a DELETE at most every 10 minutes. */
export async function maybeSweep(store: Pick<PrCacheStore, 'sweep'>, now: () => number = Date.now): Promise<boolean> {
  const t = now();
  const last = lastRun.get(store) ?? 0;
  if (t - last < SWEEP_EVERY_MS) return false;
  lastRun.set(store, t);
  try {
    await store.sweep(new Date(t - SWEEP_OLDER_THAN_MS));
    return true;
  } catch (e) {
    console.error('[pr_cache] sweep failed', e);
    return false;
  }
}
