import { config } from 'dotenv';
config({ path: '.env.local' });
import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)('better-auth adapter persists githubLogin (needs Postgres)', async () => {
  const { auth, mapGitHubProfile } = await import('./index');
  const { db, schema } = await import('@/lib/db');
  const email = `probe-${Date.now()}@example.invalid`;
  afterAll(async () => { if (hasDb) await db.delete(schema.users).where(eq(schema.users.email, email)); });

  it('writes the mapped profile field through the internal adapter and reads it back', async () => {
    const ctx = await auth.$context;
    // better-auth 1.7.7's internalAdapter.createUser(user, source) requires a provisioning
    // `source` with `method` (see @better-auth/core dist/types/context.d.mts InternalAdapter,
    // and dist/types/init-options.d.mts UserProvisioningSource/ValidateUserInfoMethod). The
    // real OAuth callback passes `{ method: 'oauth', oauth: { providerId } }`, so mirror that.
    const created = await ctx.internalAdapter.createUser(
      { name: 'Probe', email, emailVerified: true, ...mapGitHubProfile({ login: 'probe-login' }) },
      { method: 'oauth', oauth: { providerId: 'github' } },
    );
    const [row] = await db.select({ githubLogin: schema.users.githubLogin }).from(schema.users).where(eq(schema.users.id, created.id));
    expect(row.githubLogin).toBe('probe-login');
  });
});
