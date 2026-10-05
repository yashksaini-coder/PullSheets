import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getGitHubToken } from '@/lib/auth/github-token';
import { env } from '@/lib/env';
import { BadRequest, RateLimited, withRoute } from '@/lib/errors';
import { fetchPrFacts } from '@/lib/github/fetch-pr';
import { parsePrUrl } from '@/lib/github/parse-url';
import { anonymousPrLimiter, clientIp } from '@/lib/rate-limit';

const NAME = /^[\w.-]+$/; // same grammar as parsePrUrl

export const GET = withRoute(async (req) => {
  const u = new URL(req.url);
  const ref = u.searchParams.get('url')
    ? parsePrUrl(u.searchParams.get('url')!)
    : u.searchParams.get('owner') && u.searchParams.get('repo') && u.searchParams.get('number')
      ? { owner: u.searchParams.get('owner')!, repo: u.searchParams.get('repo')!, number: Number(u.searchParams.get('number')) }
      : null;
  if (!ref || !Number.isInteger(ref.number) || ref.number <= 0 || !NAME.test(ref.owner) || !NAME.test(ref.repo)) {
    throw new BadRequest('Use github.com/owner/repo/pull/123');
  }

  const session = await getSession();
  if (!session) {
    const r = anonymousPrLimiter.take(clientIp(req));
    if (!r.ok) throw new RateLimited(r.resetAt.toISOString());
  }
  const token = (session ? await getGitHubToken(session.user.id) : null) ?? env.GITHUB_PUBLIC_TOKEN ?? null;
  const { facts, cached, rateRemaining } = await fetchPrFacts(ref, { token, force: u.searchParams.get('refresh') === '1' });

  const headers: Record<string, string> = { 'x-pr-cache': cached ? 'hit' : 'miss', 'cache-control': 'private, no-store' };
  if (rateRemaining !== null) headers['x-ratelimit-remaining'] = String(rateRemaining);
  return NextResponse.json(facts, { headers });
});
