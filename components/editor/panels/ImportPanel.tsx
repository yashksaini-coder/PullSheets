'use client';
import { useEffect, useState } from 'react';
import { GitMerge, GitPullRequest, GitPullRequestClosed, GitPullRequestDraft, Link2, Loader2, RefreshCw } from 'lucide-react';
import { Button, Input, Section } from '@/components/ui';
import type { PrState } from '@/components/cards/model';
import type { RecentPr } from '@/lib/github/recent';
import { useEditor } from '../EditorProvider';
import { useImportPr } from '../use-import-pr';

const STATE_ICON: Partial<Record<PrState, typeof GitPullRequest>> = {
  open: GitPullRequest, merged: GitMerge, draft: GitPullRequestDraft, closed: GitPullRequestClosed,
};

export function ImportPanel() {
  const { facts, toast } = useEditor();
  const { importUrl, importRef, fetching } = useImportPr();
  const [prUrl, setPrUrl] = useState('');
  const [recent, setRecent] = useState<RecentPr[]>([]);

  useEffect(() => {
    let live = true;
    (async () => {
      let res: Response;
      try {
        res = await fetch('/api/pr/recent');
      } catch {
        return; // offline: the editor still works, and the import field says so when it is used
      }
      if (!res.ok) {
        // 401 is the normal answer for a session without a GitHub token — nothing went wrong.
        if (res.status === 401) return;
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (live) toast({ type: 'error', title: 'Could not load recent pull requests', description: body.error });
        return;
      }
      const rows = (await res.json().catch(() => [])) as RecentPr[];
      if (live) setRecent(rows);
    })();
    return () => { live = false; };
  }, [toast]);

  return (
    <Section title="Pull request">
      <form style={{ display: 'flex', gap: 6 }} onSubmit={(e) => { e.preventDefault(); importUrl(prUrl).then((f) => { if (f) setPrUrl(''); }); }}>
        <Input inputSize="sm" mono placeholder="Paste a GitHub PR link" value={prUrl} onChange={(e) => setPrUrl(e.target.value)} />
        <Button size="sm" variant="secondary" type="submit" disabled={fetching}>{fetching ? <Loader2 size={14} className="spin" /> : <Link2 size={14} />}{fetching ? 'Fetching' : 'Import'}</Button>
      </form>

      {facts && (
        <div className="row-between">
          <span className="mono muted" style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {facts.repo.owner}/{facts.repo.name} #{facts.number}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Refresh pull request"
            title="Fetch the latest from GitHub"
            disabled={fetching}
            onClick={() => importRef({ owner: facts.repo.owner, repo: facts.repo.name, number: facts.number }, { refresh: true })}
          >
            <RefreshCw size={14} />
          </Button>
        </div>
      )}

      {recent.length > 0 && (
        <>
          <div className="label-sm" style={{ fontSize: 11 }}>Recent pull requests</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {recent.map((r) => {
              const Icon = STATE_ICON[r.state] ?? GitPullRequest;
              return (
                <button key={`${r.owner}/${r.repo}#${r.number}`} type="button" className="pr-row" disabled={fetching} onClick={() => importRef({ owner: r.owner, repo: r.repo, number: r.number })}>
                  <Icon size={14} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                    <span className="mono muted" style={{ fontSize: 10 }}>{r.repo} #{r.number}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </Section>
  );
}
