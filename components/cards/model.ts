export const PR_STATES = ['open', 'draft', 'approved', 'changes', 'checks-failed', 'conflict', 'merged', 'closed'] as const;
export type PrState = (typeof PR_STATES)[number];

export const PR_TYPES = ['feat', 'fix', 'hotfix', 'chore', 'docs', 'deps', 'release', 'revert'] as const;
export type PrType = (typeof PR_TYPES)[number];

export const CARD_FAMILIES = ['midnight', 'industrial', 'modern', 'minimal', 'futuristic', 'terminal', 'editorial'] as const;
export type CardFamily = (typeof CARD_FAMILIES)[number];

export const CARD_FORMATS = ['queue-row', 'compact', 'standard', 'detail', 'digest', 'detail-wide'] as const;
export type CardFormat = (typeof CARD_FORMATS)[number];

/** Frame widths from the design library's asset index (heights hug content). */
export const FRAME_WIDTH: Record<CardFormat, number> = {
  'queue-row': 820, compact: 300, standard: 420, detail: 460, digest: 420, 'detail-wide': 720,
};

export interface PrPerson { login: string; name: string | null; avatarUrl: string | null; isBot: boolean }
export interface PrReview { reviewer: PrPerson; verdict: 'approved' | 'changes' | 'commented' | 'pending' }
export interface PrCheck { name: string; status: 'pass' | 'fail' | 'pending' | 'skipped'; durationSec: number | null }
export interface PrFile { path: string; additions: number; deletions: number }

/** The information model every card family renders. One source of truth; formats pick what they show. */
export interface PrFacts {
  repo: { owner: string; name: string };
  number: number;
  title: string;
  body: string;
  state: PrState;
  type: PrType | null;
  author: PrPerson;
  head: string;
  base: string;
  diff: { additions: number; deletions: number; files: number };
  checks: { passed: number; total: number; items: PrCheck[] };
  reviews: { approved: number; requested: number; items: PrReview[] };
  labels: string[];
  commits: number;
  mergeCommit: string | null;
  timestamps: { opened: string; updated: string; merged: string | null; closed: string | null }; // ISO
  snapshotAt: string; // ISO — the card's proof of time
  files: PrFile[]; // top changed files, for Detail formats
}

export const STATE_LABEL: Record<PrState, string> = {
  open: 'Open', draft: 'Draft', approved: 'Approved', changes: 'Changes requested', 'checks-failed': 'Checks failed',
  conflict: 'Conflict', merged: 'Merged', closed: 'Closed',
};

/** The one conventional-commit prefix pattern: classification here, title stripping in to-pr-facts. */
export const CONVENTIONAL_PREFIX = /^(feat|fix|hotfix|chore|build|ci|perf|refactor|style|test|docs|deps|release|revert)(\([^)]*\))?!?:/i;
const PREFIX_MAP: Record<string, PrType> = {
  feat: 'feat', fix: 'fix', hotfix: 'hotfix', chore: 'chore', build: 'chore', ci: 'chore', perf: 'fix', refactor: 'chore',
  style: 'chore', test: 'chore', docs: 'docs', deps: 'deps', release: 'release', revert: 'revert',
};
const LABEL_MAP: Record<string, PrType> = {
  enhancement: 'feat', feature: 'feat', bug: 'fix', p0: 'hotfix', hotfix: 'hotfix', dependencies: 'deps', deps: 'deps',
  documentation: 'docs', docs: 'docs', release: 'release', chore: 'chore',
};

export function inferPrType(i: { title: string; labels: string[]; headRef: string; authorLogin: string; isBot: boolean; filePaths: string[] }): PrType | null {
  if (/^revert\s+"/i.test(i.title)) return 'revert';
  const m = CONVENTIONAL_PREFIX.exec(i.title.trim());
  if (m) return PREFIX_MAP[m[1].toLowerCase()];
  for (const l of i.labels) {
    const t = LABEL_MAP[l.toLowerCase()];
    if (t) return t;
  }
  if (/^hotfix\//i.test(i.headRef)) return 'hotfix';
  if (/^release\//i.test(i.headRef)) return 'release';
  if (i.isBot || /^(dependabot|renovate)/i.test(i.authorLogin)) return 'deps';
  if (/^v?\d+\.\d+(\.\d+)?/.test(i.title.trim())) return 'release';
  if (i.filePaths.length > 0 && i.filePaths.every((p) => /^docs\//i.test(p) || /\.(md|mdx|rst)$/i.test(p))) return 'docs';
  return null;
}

export function relativeAge(from: Date, to: Date = new Date()): string {
  const s = Math.max(0, Math.round((to.getTime() - from.getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.round(d / 7);
  if (w < 9) return `${w}w ago`;
  return `${Math.round(d / 30)}mo ago`;
}

const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
export function formatSnapshot(d: Date): string {
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function initials(p: PrPerson): string {
  const src = p.name?.trim() || p.login;
  const parts = src.replace(/\[bot\]$/, '').split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? parts[0]?.[1] ?? '')).toUpperCase();
}
