import type { PrState } from '@/components/cards/model';
import { ghRequest, githubClient, mapGitHubError } from './client';

export interface RecentPr { owner: string; repo: string; number: number; title: string; state: PrState; updatedAt: string }

export async function listRecentPrs(token: string, login: string, client = githubClient(token)): Promise<RecentPr[]> {
  try {
    const r = await client.rest.search.issuesAndPullRequests({ q: `is:pr author:${login}`, sort: 'updated', order: 'desc', per_page: 12, advanced_search: 'true', request: ghRequest() });
    return r.data.items.flatMap((it) => {
      const match = /repos\/([^/]+)\/([^/]+)$/.exec(it.repository_url);
      if (!match) return [];
      const [, owner, repo] = match;
      const state: PrState = it.pull_request?.merged_at ? 'merged' : it.state === 'closed' ? 'closed' : it.draft ? 'draft' : 'open';
      return [{ owner, repo, number: it.number, title: it.title, state, updatedAt: it.updated_at }];
    });
  } catch (e) {
    throw mapGitHubError(e);
  }
}
