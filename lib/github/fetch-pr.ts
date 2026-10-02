import { and, eq } from 'drizzle-orm';
import { RequestError } from '@octokit/request-error';
import type { PrFacts } from '@/components/cards/model';
import { db, schema } from '@/lib/db';
import { githubClient, mapGitHubError } from './client';
import { toPrFacts } from './to-pr-facts';
import type { GhCheckRun, GhFile, GhPull, GhReview } from './types';

export interface PrRef { owner: string; repo: string; number: number }
const TTL_OPEN_MS = 10 * 60 * 1000;
const TTL_DONE_MS = 24 * 60 * 60 * 1000;

const key = (r: PrRef) => `${r.owner}/${r.repo}`.toLowerCase();
const fresh = (row: typeof schema.prCache.$inferSelect) =>
  Date.now() - row.fetchedAt.getTime() < (row.state === 'merged' || row.state === 'closed' ? TTL_DONE_MS : TTL_OPEN_MS);

export async function fetchPrFacts(ref: PrRef, opts: { token: string | null; force?: boolean }): Promise<{ facts: PrFacts; cached: boolean; rateRemaining: number | null }> {
  const [row] = await db.select().from(schema.prCache).where(and(eq(schema.prCache.repo, key(ref)), eq(schema.prCache.number, ref.number))).limit(1);
  if (row && !opts.force && fresh(row)) return { facts: row.facts as PrFacts, cached: true, rateRemaining: null };

  const gh = githubClient(opts.token);
  const base = { owner: ref.owner, repo: ref.repo, pull_number: ref.number };
  let pull: GhPull;
  let rateRemaining: number | null = null;
  let etag: string | null = null;
  try {
    const res = await gh.rest.pulls.get({ ...base, headers: row?.etag ? { 'if-none-match': row.etag } : {} });
    pull = res.data as unknown as GhPull;
    rateRemaining = Number(res.headers['x-ratelimit-remaining'] ?? NaN) || null;
    etag = res.headers.etag ?? null;
  } catch (e) {
    if (e instanceof RequestError && e.status === 304 && row) {
      await db.update(schema.prCache).set({ fetchedAt: new Date() }).where(and(eq(schema.prCache.repo, key(ref)), eq(schema.prCache.number, ref.number)));
      return { facts: row.facts as PrFacts, cached: true, rateRemaining: null };
    }
    throw mapGitHubError(e);
  }
  try {
    const [reviews, files, checks] = await Promise.all([
      gh.rest.pulls.listReviews({ ...base, per_page: 100 }).then((r) => r.data as unknown as GhReview[]),
      gh.rest.pulls.listFiles({ ...base, per_page: 100 }).then((r) => r.data as unknown as GhFile[]),
      gh.rest.checks.listForRef({ owner: ref.owner, repo: ref.repo, ref: pull.head.sha, per_page: 100 }).then((r) => r.data.check_runs as unknown as GhCheckRun[]).catch(() => [] as GhCheckRun[]),
    ]);
    const facts = toPrFacts({ pull, reviews, files, checkRuns: checks });
    await db
      .insert(schema.prCache)
      .values({ repo: key(ref), number: ref.number, etag, state: facts.state, facts, fetchedAt: new Date() })
      .onConflictDoUpdate({ target: [schema.prCache.repo, schema.prCache.number], set: { etag, state: facts.state, facts, fetchedAt: new Date() } });
    return { facts, cached: false, rateRemaining };
  } catch (e) {
    throw mapGitHubError(e);
  }
}
