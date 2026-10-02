import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { auth } from './index';

export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

export async function requireUser(next?: string) {
  const session = await getSession();
  if (!session) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`);
  return session.user;
}
