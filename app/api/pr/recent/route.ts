import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getGitHubToken } from '@/lib/auth/github-token';
import { Unauthorized, withRoute } from '@/lib/errors';
import { githubClient, mapGitHubError } from '@/lib/github/client';
import { listRecentPrs } from '@/lib/github/recent';

export const GET = withRoute(async () => {
  const session = await getSession();
  if (!session) throw new Unauthorized();
  const token = await getGitHubToken(session.user.id);
  if (!token) throw new Unauthorized('GitHub is not connected');
  let login = session.user.githubLogin;
  if (!login) {
    try {
      login = (await githubClient(token).rest.users.getAuthenticated()).data.login;
    } catch (e) {
      throw mapGitHubError(e);
    }
  }
  return NextResponse.json(await listRecentPrs(token, login), { headers: { 'cache-control': 'private, max-age=60' } });
});
