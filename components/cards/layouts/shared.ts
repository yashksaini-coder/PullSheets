import type { PrFacts, PrPerson } from '../model';
import { relativeAge } from '../model';

export const firstName = (p: PrPerson) => (p.name?.trim().split(/\s+/)[0] || p.login);

/** "Mira Kato" → "Mira K." — given name in full, the rest as initials. */
export function shortName(p: PrPerson): string {
  const parts = p.name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return p.login;
  return [parts[0], ...parts.slice(1).map((s) => `${s[0]}.`)].join(' ');
}

export function ageLine(f: PrFacts): string {
  const now = new Date(f.snapshotAt);
  if (f.state === 'merged' && f.timestamps.merged) return `merged ${relativeAge(new Date(f.timestamps.merged), now)}`;
  if (f.state === 'closed' && f.timestamps.closed) return `closed ${relativeAge(new Date(f.timestamps.closed), now)}`;
  if (f.state === 'draft') return `updated ${relativeAge(new Date(f.timestamps.updated), now)}`;
  return `opened ${relativeAge(new Date(f.timestamps.opened), now)}`;
}

export function peopleOf(f: PrFacts): PrPerson[] {
  const seen = new Set<string>();
  return [f.author, ...f.reviews.items.map((r) => r.reviewer)].filter((p) => (seen.has(p.login) ? false : (seen.add(p.login), true)));
}

const checksText = (f: PrFacts) => `checks ${f.checks.passed}/${f.checks.total}`;

/** The Compact card's single "what now" line — design page 4b, one per lifecycle state. */
export function consequenceLine(f: PrFacts): string {
  const approvedOf = `${f.reviews.approved} of ${Math.max(f.reviews.requested, f.reviews.approved)} approved`;
  switch (f.state) {
    case 'draft': return `not ready for review · ${checksText(f)}`;
    case 'approved': return `ready to merge · ${checksText(f)}`;
    case 'changes': {
      const n = f.reviews.items.filter((r) => r.verdict === 'changes').length;
      return `${n} blocking review${n === 1 ? '' : 's'} · ${checksText(f)}`;
    }
    case 'checks-failed': {
      const failing = f.checks.items.filter((c) => c.status === 'fail').map((c) => c.name);
      return failing.length ? `${failing.join(' · ')} failing` : checksText(f);
    }
    case 'conflict': return 'rebase needed';
    case 'merged': return `merged · ${approvedOf}`;
    case 'closed': return 'closed without merging';
    default: return `${approvedOf} · ${checksText(f)}`;
  }
}

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const word = (n: number) => (n >= 0 && n < WORDS.length ? WORDS[n] : String(n));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The Editorial card's "Figures." paragraph — change size, verdict and conflict state in one newspaper-style sentence. */
export function figuresSentence(f: PrFacts): string {
  const parts: string[] = [];
  if (f.diff.additions + f.diff.deletions === 0) parts.push('No lines changed.');
  else {
    const files = `${word(f.diff.files)} file${f.diff.files === 1 ? '' : 's'}`;
    parts.push(f.state === 'merged' ? `${f.diff.additions} lines added, ${f.diff.deletions} removed, across ${files}.` : `${f.diff.additions} lines added, ${f.diff.deletions} removed, across ${files} on ${f.head}.`);
  }
  if (f.state === 'merged' && f.mergeCommit) parts.push(`Merged into ${f.base} as ${f.mergeCommit.slice(0, 7)}.`);
  if (f.checks.total === 0) parts.push('No checks reported.');
  else if (f.checks.passed === f.checks.total) parts.push(`${cap(word(f.checks.passed))} of ${word(f.checks.total)} checks pass.`);
  else parts.push(`${cap(word(f.checks.passed))} of ${word(f.checks.total)} checks pass; ${word(f.checks.items.filter((c) => c.status === 'fail').length)} failing.`);
  if (f.state === 'conflict') parts.push(`Conflicts with ${f.base}.`);
  else if (f.state !== 'merged' && f.state !== 'closed') parts.push(`No conflicts with ${f.base}.`);
  return parts.join(' ');
}

export function verdictSentence(f: PrFacts): string {
  const by = (v: 'approved' | 'changes' | 'pending' | 'commented') => f.reviews.items.filter((r) => r.verdict === v).map((r) => r.reviewer.name ?? r.reviewer.login);
  const parts: string[] = [];
  if (by('approved').length) parts.push(`Approved by ${by('approved').join(', ')}.`);
  if (by('changes').length) parts.push(`Changes requested by ${by('changes').join(', ')}.`);
  if (by('pending').length) parts.push(`Waiting on ${by('pending').join(', ')}.`);
  return parts.join(' ') || 'No reviews yet.';
}
