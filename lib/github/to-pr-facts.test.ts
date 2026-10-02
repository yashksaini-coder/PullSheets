import { describe, expect, it } from 'vitest';
import fixture from './fixtures/pull.json';
import { toPrFacts } from './to-pr-facts';
import type { GhCheckRun, GhFile, GhPull, GhReview } from './types';

const f = fixture as unknown as { pull: GhPull; reviews: GhReview[]; files: GhFile[]; checkRuns: GhCheckRun[] };
const snap = new Date('2026-09-15T14:32:00Z');

describe('toPrFacts', () => {
  const facts = toPrFacts({ ...f, snapshotAt: snap });
  it('maps identity and repo', () => {
    expect(facts.repo).toEqual({ owner: 'acme', name: 'review-pane' });
    expect(facts.number).toBe(4821);
    expect(facts.author).toEqual({ login: 'mkato', name: 'Mira Kato', avatarUrl: 'https://avatars.githubusercontent.com/u/1', isBot: false });
  });
  it('strips the conventional prefix from the title and infers the type', () => {
    expect(facts.title).toBe('Stream diff hunks lazily in the review pane');
    expect(facts.type).toBe('feat');
  });
  it('collapses CRLF body whitespace to single spaces', () => {
    expect(facts.body).toBe('Loads hunks on scroll instead of rendering the full diff up front. Cuts initial paint on 1k+ line diffs from 3.2s to 400ms.');
  });
  it('keeps only the latest review per reviewer and counts pending requests', () => {
    expect(facts.reviews.items).toEqual([
      { reviewer: { login: 'ashah', name: 'Aditi Shah', avatarUrl: null, isBot: false }, verdict: 'approved' },
      { reviewer: { login: 'jthale', name: 'Jonas Thäle', avatarUrl: null, isBot: false }, verdict: 'pending' },
    ]);
    expect(facts.reviews).toMatchObject({ approved: 1, requested: 2 });
  });
  it('counts checks with in-progress as not passed', () => {
    expect(facts.checks.passed).toBe(2);
    expect(facts.checks.total).toBe(3);
    expect(facts.checks.items[0]).toEqual({ name: 'build', status: 'pass', durationSec: 62 });
    expect(facts.checks.items[2].status).toBe('pending');
  });
  it('sorts files by churn and keeps the top 5', () => {
    expect(facts.files.map((x) => x.path)).toEqual(['src/review/HunkList.tsx', 'src/review/useVirtualHunks.ts', 'src/review/DiffPane.tsx', 'README.md']);
  });
  it('drops files beyond the top 5 when there are more than 5', () => {
    const sixFiles: GhFile[] = [
      ...f.files,
      { filename: 'src/review/extra-a.ts', additions: 200, deletions: 0 }, // highest churn — must sort to the front
      { filename: 'src/review/extra-b.ts', additions: 1, deletions: 0 }, // lowest churn — must be the one dropped
    ];
    const result = toPrFacts({ ...f, files: sixFiles, snapshotAt: snap });
    expect(result.files).toHaveLength(5);
    expect(result.files[0].path).toBe('src/review/extra-a.ts');
    expect(result.files.map((x) => x.path)).not.toContain('src/review/extra-b.ts');
  });
  it('state: open with one approval of two is still open', () => {
    expect(facts.state).toBe('open');
  });
  it('state precedence: merged > closed > draft > conflict > checks-failed > changes > approved', () => {
    const mk = (p: Partial<GhPull>, reviews = f.reviews, checks = f.checkRuns) => toPrFacts({ pull: { ...f.pull, ...p }, reviews, files: f.files, checkRuns: checks, snapshotAt: snap }).state;
    expect(mk({ merged: true, state: 'closed', merged_at: '2026-09-16T00:00:00Z' })).toBe('merged');
    expect(mk({ state: 'closed' })).toBe('closed');
    expect(mk({ draft: true })).toBe('draft');
    expect(mk({ mergeable_state: 'dirty' })).toBe('conflict');
    expect(mk({}, f.reviews, [{ ...f.checkRuns[0], conclusion: 'failure' }])).toBe('checks-failed');
    expect(mk({}, [{ ...f.reviews[1], state: 'CHANGES_REQUESTED' }])).toBe('changes');
    expect(mk({ requested_reviewers: [] }, f.reviews, [f.checkRuns[0]])).toBe('approved');
  });
  it('state precedence: overlapping conditions resolve to the higher-priority rung', () => {
    const mk = (p: Partial<GhPull>, reviews = f.reviews, checks = f.checkRuns) => toPrFacts({ pull: { ...f.pull, ...p }, reviews, files: f.files, checkRuns: checks, snapshotAt: snap }).state;
    const failingChecks: GhCheckRun[] = [{ ...f.checkRuns[0], conclusion: 'failure' }];
    // draft + conflict → draft wins
    expect(mk({ draft: true, mergeable_state: 'dirty' })).toBe('draft');
    // conflict + a failing check → conflict wins
    expect(mk({ mergeable_state: 'dirty' }, f.reviews, failingChecks)).toBe('conflict');
    // a failing check + changes requested → checks-failed wins
    expect(mk({}, [{ ...f.reviews[1], state: 'CHANGES_REQUESTED' }], failingChecks)).toBe('checks-failed');
    // changes requested from one reviewer + another reviewer's approval → changes wins
    const mixedReviews: GhReview[] = [
      { user: { login: 'bchen', name: 'Bo Chen', avatar_url: null, type: 'User' }, state: 'APPROVED', submitted_at: '2026-09-15T13:10:00Z' },
      { user: { login: 'ashah', name: 'Aditi Shah', avatar_url: null, type: 'User' }, state: 'CHANGES_REQUESTED', submitted_at: '2026-09-15T13:30:00Z' },
    ];
    expect(mk({}, mixedReviews)).toBe('changes');
  });
  it('stamps snapshotAt', () => {
    expect(facts.snapshotAt).toBe('2026-09-15T14:32:00.000Z');
  });
});
