import { Octokit } from '@octokit/rest';
import { RequestError } from '@octokit/request-error';
import { AppError, Forbidden, NotFound, RateLimited } from '@/lib/errors';

export function githubClient(token: string | null) {
  return new Octokit({ auth: token ?? undefined, userAgent: 'pullsheets/0.1', request: { timeout: 10_000 } });
}

export function mapGitHubError(e: unknown): AppError {
  if (e instanceof RequestError) {
    const remaining = e.response?.headers?.['x-ratelimit-remaining'];
    const reset = e.response?.headers?.['x-ratelimit-reset'];
    if ((e.status === 403 || e.status === 429) && (remaining === '0' || /rate limit/i.test(e.message))) {
      return new RateLimited(reset ? new Date(Number(reset) * 1000).toISOString() : new Date(Date.now() + 60_000).toISOString());
    }
    if (e.status === 404) return new NotFound('pr_not_found', 'Pull request not found, or it is private and your GitHub login has no access');
    if (e.status === 403) return new Forbidden('pr_forbidden', 'GitHub refused access to this pull request');
    if (e.status === 401) return new Forbidden('github_token_invalid', 'Your GitHub token is no longer valid — sign out and back in');
    return new AppError(502, 'github_error', `GitHub responded ${e.status}`);
  }
  if (e instanceof AppError) return e;
  return new AppError(502, 'github_error', 'GitHub request failed');
}
