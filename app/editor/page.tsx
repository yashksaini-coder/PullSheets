import type { Metadata } from 'next';
import { Editor } from '@/components/editor/Editor';
import { requireUser } from '@/lib/auth/session';
import { decodeDesign } from '@/lib/editor/design';
import { features } from '@/lib/env';

export const metadata: Metadata = { title: 'Editor — Pullsheets' };

export default async function EditorPage({ searchParams }: { searchParams: Promise<{ pr?: string; d?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser(`/editor${sp.pr ? `?pr=${encodeURIComponent(sp.pr)}` : ''}`);
  return (
    <Editor
      user={{
        id: user.id,
        name: user.name,
        image: user.image ?? null,
        plan: user.plan === 'pro' ? 'pro' : 'free',
        githubLogin: user.githubLogin ?? null,
      }}
      features={features}
      initialDesign={decodeDesign(sp.d)}
      initialFacts={null}
      initialPrUrl={sp.pr}
    />
  );
}
