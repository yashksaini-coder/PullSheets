import type { PrState } from '@/components/cards/model';
import { githubClient, mapGitHubError } from './client';

export interface RecentPr { owner: string; repo: string; number: number; title: string; state: PrState; updatedAt: string }

export async function listRecentPrs(token: string, login: string): Promise<RecentPr[]> {
  try {
    const gh = githubClient(token);
    const r = await gh.rest.search.issuesAndPullRequests({ q: `is:pr author:${login} sort:updated-desc`, per_page: 12 });
    return r.data.items.map((it) => {
      const [, owner, repo] = /repos\/([^/]+)\/([^/]+)$/.exec(it.repository_url) ?? [];
      const state: PrState = it.pull_request?.merged_at ? 'merged' : it.state === 'closed' ? 'closed' : it.draft ? 'draft' : 'open';
      return { owner, repo, number: it.number, title: it.title, state, updatedAt: it.updated_at };
    });
  } catch (e) {
    throw mapGitHubError(e);
  }
}
