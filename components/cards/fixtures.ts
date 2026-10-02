import type { PrFacts } from './model';

export const SAMPLE_FACTS: PrFacts = {
  repo: { owner: 'acme', name: 'review-pane' },
  number: 4821,
  title: 'Stream diff hunks lazily in the review pane',
  body: 'Loads hunks on scroll instead of rendering the full diff up front. Cuts initial paint on 1k+ line diffs from 3.2s to 400ms.',
  state: 'open',
  type: 'feat',
  author: { login: 'mkato', name: 'Mira Kato', avatarUrl: null, isBot: false },
  head: 'feat/lazy-hunks',
  base: 'main',
  diff: { additions: 183, deletions: 42, files: 12 },
  checks: {
    passed: 7, total: 7,
    items: ['build', 'lint', 'unit', 'e2e', 'types', 'a11y', 'pkg'].map((name) => ({ name, status: 'pass' as const, durationSec: 42 })),
  },
  reviews: {
    approved: 1, requested: 2,
    items: [
      { reviewer: { login: 'ashah', name: 'Aditi Shah', avatarUrl: null, isBot: false }, verdict: 'approved' },
      { reviewer: { login: 'jthale', name: 'Jonas Thäle', avatarUrl: null, isBot: false }, verdict: 'pending' },
    ],
  },
  labels: ['enhancement', 'review-pane'],
  commits: 9,
  mergeCommit: null,
  timestamps: { opened: '2026-09-15T12:32:00Z', updated: '2026-09-15T14:20:00Z', merged: null, closed: null },
  snapshotAt: '2026-09-15T14:32:00Z',
  files: [
    { path: 'src/review/HunkList.tsx', additions: 96, deletions: 12 },
    { path: 'src/review/useVirtualHunks.ts', additions: 61, deletions: 0 },
    { path: 'src/review/DiffPane.tsx', additions: 18, deletions: 27 },
  ],
};
