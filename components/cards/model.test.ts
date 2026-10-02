import { describe, expect, it } from 'vitest';
import { FRAME_WIDTH, formatSnapshot, inferPrType, relativeAge } from './model';

const base = { labels: [] as string[], headRef: 'feat/x', authorLogin: 'mira', isBot: false, filePaths: ['src/a.ts'] };

describe('inferPrType', () => {
  it('reads a conventional-commit prefix, with scope and bang', () => {
    expect(inferPrType({ ...base, title: 'feat(editor)!: lazy hunks' })).toBe('feat');
    expect(inferPrType({ ...base, title: 'fix: null deref' })).toBe('fix');
    expect(inferPrType({ ...base, title: 'build: bump node' })).toBe('chore');
  });
  it('detects a revert by title', () => {
    expect(inferPrType({ ...base, title: 'Revert "feat: thing"' })).toBe('revert');
  });
  it('falls back to labels', () => {
    expect(inferPrType({ ...base, title: 'Add thing', labels: ['enhancement'] })).toBe('feat');
    expect(inferPrType({ ...base, title: 'Thing', labels: ['bug'] })).toBe('fix');
    expect(inferPrType({ ...base, title: 'Thing', labels: ['P0'] })).toBe('hotfix');
    expect(inferPrType({ ...base, title: 'Thing', labels: ['dependencies'] })).toBe('deps');
  });
  it('falls back to branch prefixes', () => {
    expect(inferPrType({ ...base, title: 'Thing', headRef: 'hotfix/login' })).toBe('hotfix');
    expect(inferPrType({ ...base, title: 'Thing', headRef: 'release/1.4' })).toBe('release');
  });
  it('bot authors are deps', () => {
    expect(inferPrType({ ...base, title: 'Bump esbuild', authorLogin: 'dependabot[bot]', isBot: true })).toBe('deps');
  });
  it('docs when every file is under docs/ or is markdown', () => {
    expect(inferPrType({ ...base, title: 'Typos', filePaths: ['docs/a.md', 'README.md'] })).toBe('docs');
  });
  it('version titles are releases', () => {
    expect(inferPrType({ ...base, title: 'v1.4.0' })).toBe('release');
  });
  it('returns null when nothing matches', () => {
    expect(inferPrType({ ...base, title: 'Make it better' })).toBeNull();
  });
});

describe('relativeAge', () => {
  const now = new Date('2026-09-15T14:32:00Z');
  it('formats minutes, hours, days, weeks', () => {
    expect(relativeAge(new Date('2026-09-15T13:52:00Z'), now)).toBe('40m ago');
    expect(relativeAge(new Date('2026-09-15T12:32:00Z'), now)).toBe('2h ago');
    expect(relativeAge(new Date('2026-09-11T14:32:00Z'), now)).toBe('4d ago');
    expect(relativeAge(new Date('2026-08-25T14:32:00Z'), now)).toBe('3w ago');
  });
  it('never goes negative', () => {
    expect(relativeAge(new Date('2026-09-15T15:00:00Z'), now)).toBe('just now');
  });
});

describe('formatSnapshot', () => {
  it('is DD MON YYYY uppercase', () => {
    expect(formatSnapshot(new Date('2026-09-15T14:32:00Z'))).toBe('15 SEP 2026');
  });
});

describe('FRAME_WIDTH', () => {
  it('matches the asset index', () => {
    expect(FRAME_WIDTH).toEqual({ 'queue-row': 820, compact: 300, standard: 420, detail: 460, digest: 420, 'detail-wide': 720 });
  });
});
