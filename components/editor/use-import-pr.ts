'use client';
import { useCallback } from 'react';
import type { PrFacts } from '@/components/cards/model';
import { parsePrUrl } from '@/lib/github/parse-url';
import { useEditor } from './EditorProvider';

export function useImportPr() {
  const { setFacts, toast, fetching, setFetching } = useEditor();

  const importRef = useCallback(async (ref: { owner: string; repo: string; number: number }, opts?: { refresh?: boolean }) => {
    if (fetching) return null; // an import is already in flight; the second click is a no-op, not a second request
    setFetching(true);
    try {
      const q = new URLSearchParams({ owner: ref.owner, repo: ref.repo, number: String(ref.number), ...(opts?.refresh ? { refresh: '1' } : {}) });
      let res: Response;
      // Only the request itself can fail with a network error; everything after it is our own bug.
      try {
        res = await fetch(`/api/pr?${q}`);
      } catch {
        toast({ type: 'error', title: 'Network error', description: 'Could not reach the server.' });
        return null;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string; resetAt?: string };
        const desc = body.code === 'rate_limited' && body.resetAt ? `GitHub rate limit resets ${new Date(body.resetAt).toLocaleTimeString()}` : body.error;
        toast({ type: 'error', title: body.code === 'pr_not_found' ? 'Pull request not found' : 'Import failed', description: desc });
        return null;
      }
      let facts: PrFacts;
      try {
        facts = (await res.json()) as PrFacts;
      } catch {
        toast({ type: 'error', title: 'Unexpected response', description: 'The server replied with something that is not a pull request.' });
        return null;
      }
      setFacts(facts);
      toast({ type: 'success', title: `Imported ${facts.repo.name} #${facts.number}`, description: res.headers.get('x-pr-cache') === 'hit' ? 'From cache' : undefined });
      return facts;
    } finally {
      setFetching(false);
    }
  }, [fetching, setFetching, setFacts, toast]);

  const importUrl = useCallback((raw: string) => {
    const ref = parsePrUrl(raw);
    if (!ref) { toast({ type: 'error', title: 'That is not a pull-request link', description: 'Use github.com/owner/repo/pull/123' }); return Promise.resolve(null); }
    return importRef(ref);
  }, [importRef, toast]);

  return { importUrl, importRef, fetching };
}
