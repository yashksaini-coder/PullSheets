import { RequestError } from '@octokit/request-error';
import { describe, expect, it, vi } from 'vitest';
import type { PrFacts } from '@/components/cards/model';
import fixture from './fixtures/pull.json';
import { fetchPrFacts } from './fetch-pr';
import type { GhPull } from './types';
import type { PrCacheRow, PrCacheStore } from './pr-cache-store';

// The real store pulls in @/lib/db, which opens a pg pool and validates the env at import time.
// Every test injects its own store, so the default one only has to exist.
vi.mock('./pr-cache-store', () => ({ dbPrCacheStore: null }));

const req = { method: 'GET' as const, url: 'https://api.github.com/x', headers: {} };
const ghError = (status: number) =>
  new RequestError(`status ${status}`, status, { request: req, response: { status, url: req.url, headers: {}, data: {} } });

const REF = { owner: 'acme', repo: 'review-pane', number: 4821 };
const FACTS = { state: 'open' } as unknown as PrFacts;

function fakeStore(seed?: Partial<PrCacheRow>) {
  const rows = new Map<string, PrCacheRow>();
  const calls = { get: 0, touch: 0, put: 0, sweep: 0 };
  if (seed) {
    const row: PrCacheRow = {
      repo: 'acme/review-pane', number: 4821, etag: 'W/"old"', state: 'open',
      facts: FACTS, isPrivate: false, fetchedAt: new Date(), ...seed,
    };
    rows.set(`${row.repo}#${row.number}`, row);
  }
  const store: PrCacheStore = {
    async get(repo, number) { calls.get += 1; return rows.get(`${repo}#${number}`); },
    async touch() { calls.touch += 1; },
    async put(row) { calls.put += 1; rows.set(`${row.repo}#${row.number}`, row); },
    async sweep() { calls.sweep += 1; return 0; },
  };
  return { store, calls, rows };
}

/** Minimal octokit stand-in: records the headers the pull request was fetched with. */
function fakeGitHub(opts: { pull?: 304 | 404; checks?: 429; private?: boolean; mergeableState?: string } = {}) {
  const seen: { pullCalls: number; headers?: Record<string, string> } = { pullCalls: 0 };
  const pull = { ...(fixture.pull as unknown as GhPull) };
  pull.base = { ...pull.base, repo: { ...pull.base.repo, private: opts.private ?? false } };
  if (opts.mergeableState) pull.mergeable_state = opts.mergeableState as GhPull['mergeable_state'];
  const client = {
    rest: {
      pulls: {
        get: async ({ headers }: { headers?: Record<string, string> }) => {
          seen.pullCalls += 1;
          seen.headers = headers;
          if (opts.pull) throw ghError(opts.pull);
          return { data: pull, headers: { 'x-ratelimit-remaining': '4999', etag: 'W/"new"' } };
        },
        listReviews: async () => ({ data: fixture.reviews }),
        listFiles: async () => ({ data: fixture.files }),
      },
      checks: {
        listForRef: async () => {
          if (opts.checks) throw ghError(opts.checks);
          return { data: { check_runs: fixture.checkRuns } };
        },
      },
    },
  };
  return { seen, client: client as unknown as Parameters<typeof fetchPrFacts>[1]['client'] };
}

describe('fetchPrFacts cache', () => {
  it('serves a fresh public row from cache without touching GitHub', async () => {
    const { store } = fakeStore({ isPrivate: false });
    const { seen, client } = fakeGitHub();
    const res = await fetchPrFacts(REF, { token: null, store, client });
    expect(res.cached).toBe(true);
    expect(seen.pullCalls).toBe(0);
  });

  it('never serves a fresh private row from cache: an anonymous caller gets GitHub 404', async () => {
    const { store } = fakeStore({ isPrivate: true });
    const { seen, client } = fakeGitHub({ pull: 404 });
    await expect(fetchPrFacts(REF, { token: null, store, client })).rejects.toMatchObject({ code: 'pr_not_found' });
    expect(seen.pullCalls).toBe(1);
  });

  it('revalidates a fresh private row and serves it on 304 for an authorised token', async () => {
    const { store, calls } = fakeStore({ isPrivate: true });
    const { seen, client } = fakeGitHub({ pull: 304 });
    const res = await fetchPrFacts(REF, { token: 'gho_real', store, client });
    expect(res.cached).toBe(true);
    expect(calls.touch).toBe(1);
    expect(seen.headers).toEqual({ 'if-none-match': 'W/"old"' });
  });

  it('records is_private from the pull payload', async () => {
    const { store, rows, calls } = fakeStore();
    const { client } = fakeGitHub({ private: true });
    await fetchPrFacts(REF, { token: 'gho_real', store, client });
    expect(rows.get('acme/review-pane#4821')?.isPrivate).toBe(true);
    expect(calls.sweep).toBe(1);
  });

  it('a forced refresh sends no if-none-match', async () => {
    const { store } = fakeStore({ isPrivate: false });
    const { seen, client } = fakeGitHub();
    const res = await fetchPrFacts(REF, { token: null, store, client, force: true });
    expect(res.cached).toBe(false);
    expect(seen.headers).toEqual({});
  });

  it('does not cache a pull whose mergeability GitHub is still computing', async () => {
    const { store, calls } = fakeStore();
    const { client } = fakeGitHub({ mergeableState: 'unknown' });
    const res = await fetchPrFacts(REF, { token: 'gho_real', store, client });
    expect(res.cached).toBe(false);
    expect(res.facts.state).not.toBe('conflict'); // served, but never written down as a fact
    expect(calls.put).toBe(0);
  });

  it('propagates a check-runs 429 as rate_limited and writes nothing', async () => {
    const { store, calls } = fakeStore();
    const { client } = fakeGitHub({ checks: 429 });
    await expect(fetchPrFacts(REF, { token: null, store, client })).rejects.toMatchObject({ code: 'rate_limited' });
    expect(calls.put).toBe(0);
  });
});
