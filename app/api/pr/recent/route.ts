import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getGitHubToken } from '@/lib/auth/github-token';
import { Unauthorized, withRoute } from '@/lib/errors';
import { githubClient } from '@/lib/github/client';
import { listRecentPrs } from '@/lib/github/recent';

export const GET = withRoute(async () => {
  const session = await getSession();
  if (!session) throw new Unauthorized();
  const token = await getGitHubToken(session.user.id);
  if (!token) throw new Unauthorized('GitHub is not connected');
  const login = session.user.githubLogin ?? (await githubClient(token).rest.users.getAuthenticated()).data.login;
  return NextResponse.json(await listRecentPrs(token, login), { headers: { 'cache-control': 'private, max-age=60' } });
});
