import { RequestError } from '@octokit/request-error';
import { describe, expect, it } from 'vitest';
import { mapGitHubError } from './client';

const req = { method: 'GET' as const, url: 'https://api.github.com/x', headers: {} };
const mk = (status: number, headers: Record<string, string> = {}, message = 'x') =>
  new RequestError(message, status, { request: req, response: { status, url: req.url, headers, data: {} } });

describe('mapGitHubError', () => {
  it('404 → pr_not_found 404', () => {
    const e = mapGitHubError(mk(404));
    expect([e.status, e.code]).toEqual([404, 'pr_not_found']);
  });
  it('403 with x-ratelimit-remaining 0 → 429 with resetAt', () => {
    const e = mapGitHubError(mk(403, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1789000000' }));
    expect(e.status).toBe(429);
    expect(e.details?.resetAt).toBe(new Date(1789000000 * 1000).toISOString());
  });
  it('plain 403 → pr_forbidden', () => {
    expect(mapGitHubError(mk(403, { 'x-ratelimit-remaining': '42' })).code).toBe('pr_forbidden');
  });
  it('unknown → 502, never leaks', () => {
    const e = mapGitHubError(new Error('boom'));
    expect(e.status).toBe(502);
    expect(e.message).not.toContain('boom');
  });
  it('401 → github_token_invalid 403', () => {
    const e = mapGitHubError(mk(401));
    expect([e.status, e.code]).toEqual([403, 'github_token_invalid']);
  });
  it('bare 429 with no headers → 429 with resetAt ~60s out', () => {
    const before = Date.now();
    const e = mapGitHubError(mk(429));
    expect(e.status).toBe(429);
    const resetAt = new Date(e.details?.resetAt as string).getTime();
    expect(resetAt).toBeGreaterThanOrEqual(before + 59_000);
    expect(resetAt).toBeLessThanOrEqual(before + 61_000);
  });
  it('403 with "rate limit" message and no remaining header → 429', () => {
    const e = mapGitHubError(mk(403, {}, 'You have exceeded a secondary rate limit'));
    expect(e.status).toBe(429);
  });
});
