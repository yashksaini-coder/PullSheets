import { RequestError } from '@octokit/request-error';
import { describe, expect, it } from 'vitest';
import { listRecentPrs } from './recent';

const item = (o: Partial<Record<string, unknown>>) => ({
  number: 1, title: 't', state: 'open', draft: false, updated_at: '2026-09-15T00:00:00Z',
  repository_url: 'https://api.github.com/repos/acme/review-pane', pull_request: { merged_at: null }, ...o,
});
const client = (items: unknown[], fail?: number) => ({
  rest: { search: { issuesAndPullRequests: async (params: Record<string, unknown>) => {
    if (fail) throw new RequestError('x', fail, { request: { method: 'GET', url: 'u', headers: {} }, response: { status: fail, url: 'u', headers: {}, data: {} } });
    return { data: { items }, params };
  } } },
}) as unknown as Parameters<typeof listRecentPrs>[2];

describe('listRecentPrs', () => {
  it('maps items and derives state (merged > closed > draft > open)', async () => {
    const rows = await listRecentPrs('tok', 'mkato', client([
      item({ number: 1, pull_request: { merged_at: '2026-09-14T00:00:00Z' }, state: 'closed' }),
      item({ number: 2, state: 'closed' }),
      item({ number: 3, draft: true }),
      item({ number: 4 }),
    ]));
    expect(rows.map((r) => r.state)).toEqual(['merged', 'closed', 'draft', 'open']);
    expect(rows[0]).toMatchObject({ owner: 'acme', repo: 'review-pane', number: 1 });
  });
  it('drops rows whose repository_url does not parse', async () => {
    const rows = await listRecentPrs('tok', 'mkato', client([item({ repository_url: 'nope' }), item({ number: 9 })]));
    expect(rows.map((r) => r.number)).toEqual([9]);
  });
  it('maps a 401 to github_token_invalid', async () => {
    await expect(listRecentPrs('tok', 'mkato', client([], 401))).rejects.toMatchObject({ status: 403, code: 'github_token_invalid' });
  });
});
