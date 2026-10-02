import { RequestError } from '@octokit/request-error';
import type { PrFacts } from '@/components/cards/model';
import { githubClient, mapGitHubError } from './client';
import { dbPrCacheStore, type PrCacheRow, type PrCacheStore } from './pr-cache-store';
import { toPrFacts } from './to-pr-facts';
import type { GhCheckRun, GhFile, GhPull, GhReview } from './types';

export interface PrRef { owner: string; repo: string; number: number }
const TTL_OPEN_MS = 10 * 60 * 1000;
const TTL_DONE_MS = 24 * 60 * 60 * 1000;

const key = (r: PrRef) => `${r.owner}/${r.repo}`.toLowerCase();
const fresh = (row: PrCacheRow) =>
  Date.now() - row.fetchedAt.getTime() < (row.state === 'merged' || row.state === 'closed' ? TTL_DONE_MS : TTL_OPEN_MS);

interface FetchOpts {
  token: string | null;
  force?: boolean;
  store?: PrCacheStore;
  client?: ReturnType<typeof githubClient>;
}

export async function fetchPrFacts(ref: PrRef, opts: FetchOpts): Promise<{ facts: PrFacts; cached: boolean; rateRemaining: number | null }> {
  const store = opts.store ?? dbPrCacheStore;
  const row = await store.get(key(ref), ref.number);
  // `pr_cache` is keyed by (repo, number) only — it carries no notion of who may read a row. So a
  // private PR must never be served out of the TTL window: it would hand one user's private facts
  // to the next anonymous caller. Private rows always revalidate with the caller's own token and
  // let GitHub arbitrate — 304 for someone with access (serve the cached facts below), 404 for
  // everyone else (mapped to `pr_not_found`).
  if (row && !opts.force && !row.isPrivate && fresh(row)) return { facts: row.facts, cached: true, rateRemaining: null };

  const gh = opts.client ?? githubClient(opts.token);
  const base = { owner: ref.owner, repo: ref.repo, pull_number: ref.number };
  let pull: GhPull;
  let rateRemaining: number | null = null;
  let etag: string | null = null;
  try {
    // A forced refresh must hit GitHub for real: checks/reviews live on the head commit, not
    // the pull resource, so a 304 on the pull alone would short-circuit them out of a refresh.
    const res = await gh.rest.pulls.get({ ...base, headers: row?.etag && !opts.force ? { 'if-none-match': row.etag } : {} });
    pull = res.data as unknown as GhPull;
    const remainingHeader = res.headers['x-ratelimit-remaining'];
    rateRemaining = remainingHeader == null ? null : Number(remainingHeader);
    etag = res.headers.etag ?? null;
  } catch (e) {
    if (e instanceof RequestError && e.status === 304 && row) {
      await store.touch(key(ref), ref.number);
      return { facts: row.facts, cached: true, rateRemaining: null };
    }
    throw mapGitHubError(e);
  }

  let reviews: GhReview[];
  let files: GhFile[];
  let checks: GhCheckRun[];
  try {
    [reviews, files, checks] = await Promise.all([
      gh.rest.pulls.listReviews({ ...base, per_page: 100 }).then((r) => r.data as unknown as GhReview[]),
      gh.rest.pulls.listFiles({ ...base, per_page: 100 }).then((r) => r.data as unknown as GhFile[]),
      gh.rest.checks
        .listForRef({ owner: ref.owner, repo: ref.repo, ref: pull.head.sha, per_page: 100 })
        .then((r) => r.data.check_runs as unknown as GhCheckRun[])
        .catch((e) => {
          // Only a confirmed "no access to checks" result means no checks; anything else
          // (rate limit, timeout, 5xx) must not be cached as an empty, all-clear check list.
          if (e instanceof RequestError && (e.status === 403 || e.status === 404)) return [] as GhCheckRun[];
          throw e;
        }),
    ]);
  } catch (e) {
    throw mapGitHubError(e);
  }

  // Mapper/DB failures are ours, not GitHub's — let them propagate so withRoute logs them
  // and returns a real 500 instead of a misleading 502 github_error.
  const facts = toPrFacts({ pull, reviews, files, checkRuns: checks });
  await store.put({ repo: key(ref), number: ref.number, etag, state: facts.state, facts, isPrivate: pull.base.repo.private, fetchedAt: new Date() });
  return { facts, cached: false, rateRemaining };
}
