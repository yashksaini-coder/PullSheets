'use client';
import { useCallback, useState } from 'react';
import type { PrFacts } from '@/components/cards/model';
import { parsePrUrl } from '@/lib/github/parse-url';
import { useEditor } from './EditorProvider';

export function useImportPr() {
  const { setFacts, toast } = useEditor();
  const [fetching, setFetching] = useState(false);

  const importRef = useCallback(async (ref: { owner: string; repo: string; number: number }, opts?: { refresh?: boolean }) => {
    setFetching(true);
    try {
      const q = new URLSearchParams({ owner: ref.owner, repo: ref.repo, number: String(ref.number), ...(opts?.refresh ? { refresh: '1' } : {}) });
      const res = await fetch(`/api/pr?${q}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string; resetAt?: string };
        const desc = body.code === 'rate_limited' && body.resetAt ? `GitHub rate limit resets ${new Date(body.resetAt).toLocaleTimeString()}` : body.error;
        toast({ type: 'error', title: body.code === 'pr_not_found' ? 'Pull request not found' : 'Import failed', description: desc });
        return null;
      }
      const facts = (await res.json()) as PrFacts;
      setFacts(facts);
      toast({ type: 'success', title: `Imported ${facts.repo.name} #${facts.number}`, description: res.headers.get('x-pr-cache') === 'hit' ? 'From cache' : undefined });
      return facts;
    } catch {
      toast({ type: 'error', title: 'Network error', description: 'Could not reach the server.' });
      return null;
    } finally {
      setFetching(false);
    }
  }, [setFacts, toast]);

  const importUrl = useCallback((raw: string) => {
    const ref = parsePrUrl(raw);
    if (!ref) { toast({ type: 'error', title: 'That is not a pull-request link', description: 'Use github.com/owner/repo/pull/123' }); return Promise.resolve(null); }
    return importRef(ref);
  }, [importRef, toast]);

  return { importUrl, importRef, fetching };
}
