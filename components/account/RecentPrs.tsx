'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { StatusPill } from '@/components/ui';
import type { RecentPr } from '@/lib/github/recent';

export function RecentPrs() {
  const [state, setState] = useState<{ status: 'loading' } | { status: 'error'; message: string } | { status: 'ok'; items: RecentPr[] }>({ status: 'loading' });
  useEffect(() => {
    fetch('/api/pr/recent', { cache: 'no-store' }).then(async (r) => {
      if (!r.ok) { const b = await r.json().catch(() => ({})); setState({ status: 'error', message: b.error ?? `HTTP ${r.status}` }); return; }
      setState({ status: 'ok', items: await r.json() });
    }).catch(() => setState({ status: 'error', message: 'Network error' }));
  }, []);
  if (state.status === 'loading') return <div className="muted" style={{ fontSize: 13 }}>Loading your pull requests…</div>;
  if (state.status === 'error') return <div className="muted" style={{ fontSize: 13 }}>Couldn&apos;t load recent pull requests: {state.message}</div>;
  if (state.items.length === 0) return <div className="muted" style={{ fontSize: 13 }}>No pull requests authored by you yet.</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {state.items.map((p) => (
        <Link key={`${p.owner}/${p.repo}#${p.number}`} href={`/editor?pr=${encodeURIComponent(`https://github.com/${p.owner}/${p.repo}/pull/${p.number}`)}`} className="pr-row">
          <StatusPill status={p.state} />
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
          <span className="mono muted" style={{ fontSize: 12 }}>{p.repo} #{p.number}</span>
        </Link>
      ))}
    </div>
  );
}
