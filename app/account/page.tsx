import type { Metadata } from 'next';
import { and, eq } from 'drizzle-orm';
import { AccountShell } from '@/components/account/AccountShell';
import { requireUser } from '@/lib/auth/session';
import { db, schema } from '@/lib/db';
import { features } from '@/lib/env';

export const metadata: Metadata = { title: 'Account — Pullsheets' };

export default async function AccountPage() {
  const user = await requireUser('/account');
  const [gh] = await db
    .select({ at: schema.accounts.createdAt })
    .from(schema.accounts)
    .where(and(eq(schema.accounts.userId, user.id), eq(schema.accounts.providerId, 'github')))
    .limit(1);
  const plan: 'free' | 'pro' = user.plan === 'pro' ? 'pro' : 'free';
  return (
    <AccountShell
      user={{ id: user.id, name: user.name, email: user.email, image: user.image ?? null, plan, githubLogin: user.githubLogin ?? null }}
      github={gh ? { login: user.githubLogin ?? '(unknown)', connectedAt: gh.at.toISOString() } : null}
      features={features}
    />
  );
}
