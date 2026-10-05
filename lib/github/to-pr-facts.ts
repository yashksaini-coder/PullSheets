import type { PrCheck, PrFacts, PrPerson, PrReview, PrState } from '@/components/cards/model';
import { CONVENTIONAL_PREFIX, inferPrType } from '@/components/cards/model';
import type { GhCheckRun, GhFile, GhPull, GhReview, GhUser } from './types';

// Same pattern that classifies the type, extended to eat the separator space when stripping a title.
const PREFIX_STRIP = new RegExp(CONVENTIONAL_PREFIX.source + '\\s*', 'i');

const person = (u: GhUser): PrPerson => ({ login: u.login, name: u.name ?? null, avatarUrl: u.avatar_url ?? null, isBot: u.type === 'Bot' || /\[bot\]$/.test(u.login) });

function latestReviews(reviews: GhReview[], requested: GhUser[]): PrReview[] {
  const byUser = new Map<string, GhReview>();
  for (const r of reviews) {
    if (r.state === 'PENDING' || r.state === 'DISMISSED') continue;
    const prev = byUser.get(r.user.login);
    // A later COMMENTED review does not cancel an earlier APPROVED/CHANGES_REQUESTED on GitHub either.
    if (!prev || r.state !== 'COMMENTED' || prev.state === 'COMMENTED') byUser.set(r.user.login, r);
  }
  const out: PrReview[] = [...byUser.values()].map((r) => ({
    reviewer: person(r.user),
    verdict: r.state === 'APPROVED' ? 'approved' : r.state === 'CHANGES_REQUESTED' ? 'changes' : 'commented',
  }));
  for (const u of requested) if (!byUser.has(u.login)) out.push({ reviewer: person(u), verdict: 'pending' });
  return out;
}

function checks(runs: GhCheckRun[]): PrFacts['checks'] {
  const items: PrCheck[] = runs.map((r) => ({
    name: r.name,
    status: r.status !== 'completed' ? 'pending' : r.conclusion === 'success' || r.conclusion === 'neutral' ? 'pass' : r.conclusion === 'skipped' ? 'skipped' : 'fail',
    durationSec: r.started_at && r.completed_at ? Math.round((new Date(r.completed_at).getTime() - new Date(r.started_at).getTime()) / 1000) : null,
  }));
  return { passed: items.filter((i) => i.status === 'pass').length, total: items.length, items };
}

function deriveState(p: GhPull, reviews: PrReview[], ck: PrFacts['checks']): PrState {
  if (p.merged) return 'merged';
  if (p.state === 'closed') return 'closed';
  if (p.draft) return 'draft';
  if (p.mergeable_state === 'dirty') return 'conflict';
  if (ck.items.some((i) => i.status === 'fail')) return 'checks-failed';
  if (reviews.some((r) => r.verdict === 'changes')) return 'changes';
  const approved = reviews.filter((r) => r.verdict === 'approved').length;
  if (approved > 0 && reviews.every((r) => r.verdict === 'approved' || r.verdict === 'commented')) return 'approved';
  return 'open';
}

export function toPrFacts(i: { pull: GhPull; reviews: GhReview[]; files: GhFile[]; checkRuns: GhCheckRun[]; snapshotAt?: Date }): PrFacts {
  const p = i.pull;
  const reviews = latestReviews(i.reviews, p.requested_reviewers ?? []);
  const ck = checks(i.checkRuns);
  const files = [...i.files].sort((a, b) => b.additions + b.deletions - (a.additions + a.deletions)).slice(0, 5).map((f) => ({ path: f.filename, additions: f.additions, deletions: f.deletions }));
  const labels = p.labels.map((l) => l.name);
  const author = person(p.user);
  return {
    repo: { owner: p.base.repo.owner.login, name: p.base.repo.name },
    number: p.number,
    title: p.title.replace(PREFIX_STRIP, '').trim(),
    body: (p.body ?? '').replace(/\s+/g, ' ').trim(),
    state: deriveState(p, reviews, ck),
    type: inferPrType({ title: p.title, labels, headRef: p.head.ref, authorLogin: author.login, isBot: author.isBot, filePaths: i.files.map((f) => f.filename) }),
    author,
    head: p.head.ref,
    base: p.base.ref,
    diff: { additions: p.additions, deletions: p.deletions, files: p.changed_files },
    checks: ck,
    reviews: { approved: reviews.filter((r) => r.verdict === 'approved').length, requested: reviews.filter((r) => r.verdict !== 'commented').length, items: reviews },
    labels,
    commits: p.commits,
    mergeCommit: p.merged ? p.merge_commit_sha : null,
    timestamps: { opened: p.created_at, updated: p.updated_at, merged: p.merged_at, closed: p.closed_at },
    snapshotAt: (i.snapshotAt ?? new Date()).toISOString(),
    files,
  };
}
