import { Octokit } from '@octokit/rest';
import { RequestError } from '@octokit/request-error';
import { AppError, Forbidden, NotFound, RateLimited } from '@/lib/errors';

export const GITHUB_TIMEOUT_MS = 10_000;

export function githubClient(token: string | null) {
  return new Octokit({ auth: token ?? undefined, userAgent: 'pullsheets/0.1' });
}

/** Per-request deadline: pass as `request: ghRequest()` on every octokit call — a signal attached
 * at client construction would be shared (and so exhausted) across every request the client makes. */
export const ghRequest = () => ({ signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS) });

// Node's fetch rejects an AbortSignal.timeout with a TimeoutError, but @octokit/request's fetch
// wrapper only rethrows unwrapped for name === 'AbortError' — a TimeoutError gets wrapped in a
// `RequestError(message, 500)` whose own `.name` is 'HttpError' and whose `.cause` is the
// original TimeoutError. So both the raw error and a RequestError's `.cause` must be checked.
const aborted = (x: unknown): boolean => x instanceof Error && (x.name === 'TimeoutError' || x.name === 'AbortError');

export function mapGitHubError(e: unknown): AppError {
  if (aborted(e) || (e instanceof RequestError && aborted(e.cause))) {
    return new AppError(502, 'github_error', 'GitHub did not answer within 10 seconds');
  }
  if (e instanceof RequestError) {
    const remaining = e.response?.headers?.['x-ratelimit-remaining'];
    const reset = e.response?.headers?.['x-ratelimit-reset'];
    if (e.status === 429 || (e.status === 403 && (remaining === '0' || /rate limit/i.test(e.message)))) {
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
