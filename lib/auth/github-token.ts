import { and, eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { db, schema } from '@/lib/db';
import { auth } from './index';

/**
 * The signed-in user's GitHub OAuth token, decrypted by better-auth. Null when not linked.
 *
 * better-auth 1.7.7 selects the account by its row id (`accountId`), not by `providerId`,
 * so we resolve the row for (userId, 'github') first. `getAccessToken` refreshes the token
 * when it is near expiry and re-encrypts it before writing it back.
 */
export async function getGitHubToken(userId: string): Promise<string | null> {
  try {
    const [account] = await db
      .select({ id: schema.accounts.id })
      .from(schema.accounts)
      .where(and(eq(schema.accounts.userId, userId), eq(schema.accounts.providerId, 'github')))
      .limit(1);
    if (!account) return null;
    const r = await auth.api.getAccessToken({ body: { accountId: account.id, userId }, headers: await headers() });
    return r?.accessToken ?? null;
  } catch {
    return null;
  }
}
