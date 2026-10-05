import { describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/auth/session', () => ({ getSession: vi.fn(async () => null) }));
vi.mock('@/lib/auth/github-token', () => ({ getGitHubToken: vi.fn(async () => null) }));
vi.mock('@/lib/env', () => ({ env: { GITHUB_PUBLIC_TOKEN: undefined }, features: {} }));
vi.mock('@/lib/github/fetch-pr', () => ({ fetchPrFacts: vi.fn(async () => ({ facts: { ok: 1 }, cached: true, rateRemaining: null })) }));
import { GET } from './route';
import { getSession } from '@/lib/auth/session';

const call = (ip: string) => GET(new Request(`http://x/api/pr?owner=acme&repo=r&number=1`, { headers: { 'x-forwarded-for': ip } }), {} as never);

describe('GET /api/pr rate limit', () => {
  it('serves 30 anonymous calls per IP then 429s; a signed-in call from the same IP still works', async () => {
    for (let i = 0; i < 30; i++) expect((await call('198.51.100.7')).status).toBe(200);
    const limited = await call('198.51.100.7');
    expect(limited.status).toBe(429);
    const body = await limited.json();
    expect(body.code).toBe('rate_limited');
    expect(new Date(body.resetAt).getTime()).toBeGreaterThan(Date.now());
    expect((await call('198.51.100.8')).status).toBe(200);
    vi.mocked(getSession).mockResolvedValueOnce({ user: { id: 'u1' } } as never);
    expect((await call('198.51.100.7')).status).toBe(200);
  });
});
