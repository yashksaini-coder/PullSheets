import { and, eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { db, schema } from '@/lib/db';
import { auth } from './index';
import { getSession } from './session';

/**
 * The signed-in user's GitHub OAuth token, decrypted by better-auth. Null when not linked.
 *
 * **Session-bound.** This resolves the *current request's* session user and returns `null` for
 * any other `userId` — it is not a way to read another user's token, and it returns `null`
 * outside a request scope (no headers, so no session). better-auth enforces the same thing
 * internally (`resolveUserId`, `better-auth/dist/api/routes/account.mjs`); the explicit check
 * below makes the contract visible instead of letting it surface as a swallowed error.
 *
 * better-auth 1.7.7 selects the account by its row id (`accountId`), not by `providerId`, so we
 * resolve the row for (userId, 'github') first. `getAccessToken` refreshes the token when it is
 * near expiry and re-encrypts it before writing it back.
 *
 * Returns `null` on failure rather than throwing, so callers can degrade to the public GitHub
 * token. The cause is logged server-side — never the token value.
 */
export async function getGitHubToken(userId: string): Promise<string | null> {
  try {
    const session = await getSession();
    if (!session) return null;
    if (session.user.id !== userId) {
      console.warn('[auth] getGitHubToken: userId does not match the session user; returning null');
      return null;
    }
    const [account] = await db
      .select({ id: schema.accounts.id })
      .from(schema.accounts)
      .where(and(eq(schema.accounts.userId, userId), eq(schema.accounts.providerId, 'github')))
      .limit(1);
    if (!account) return null;
    const r = await auth.api.getAccessToken({ body: { accountId: account.id, userId }, headers: await headers() });
    return r?.accessToken ?? null;
  } catch (err) {
    // Distinct causes collapse into null here: a wrong BETTER_AUTH_SECRET (decrypt throws),
    // GitHub rejecting the refresh token, or headers() outside a request scope.
    console.error('[auth] getGitHubToken', err);
    return null;
  }
}
