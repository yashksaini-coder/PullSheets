import { describe, expect, test } from 'vitest';
import { safeNextPath } from './safe-next';

const NUL = String.fromCharCode(0);
const UNIT_SEPARATOR = String.fromCharCode(0x1f);

describe('safeNextPath', () => {
  test.each(['/editor', '/account', '/editor?pr=https%3A%2F%2Fgithub.com%2Fa%2Fb%2Fpull%2F1', '/editor#panel'])('passes %s through', (next) => {
    expect(safeNextPath(next)).toBe(next);
  });

  test.each([
    { next: '//evil.com', why: 'protocol-relative' },
    { next: 'https://evil.com', why: 'absolute' },
    { next: '\\\\evil.com', why: 'backslash authority' },
    { next: '/\\evil.com', why: 'WHATWG folds the backslash into a slash - the bug this helper exists for' },
    { next: '/%5cevil.com', why: 'encoded backslash in the path' },
    { next: '/%2f%2fevil.com', why: 'encoded protocol-relative' },
    { next: 'javascript:alert(1)', why: 'script scheme' },
    { next: `/editor${NUL}`, why: 'control character' },
    { next: `/edi${UNIT_SEPARATOR}tor`, why: 'control character' },
    { next: '/login', why: 'self-redirect loop' },
    { next: '/login?next=%2Feditor', why: 'self-redirect loop with a query' },
    { next: '', why: 'empty' },
    { next: undefined, why: 'missing' },
  ])('falls back to /editor for $next ($why)', ({ next }) => {
    expect(safeNextPath(next)).toBe('/editor');
  });

  test('/\\evil.com really would have escaped a naive prefix check', () => {
    expect(new URL('/\\evil.com', 'http://localhost:3000').origin).toBe('http://evil.com');
  });
});
