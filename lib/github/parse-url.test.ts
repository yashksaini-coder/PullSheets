import { describe, expect, it } from 'vitest';
import { parsePrUrl } from './parse-url';
describe('parsePrUrl', () => {
  it.each([
    'https://github.com/acme/review-pane/pull/4821',
    'http://www.github.com/acme/review-pane/pull/4821/',
    'github.com/acme/review-pane/pull/4821/files?diff=split#diff-abc',
    '  https://github.com/acme/review-pane/pull/4821  ',
  ])('parses %s', (u) => expect(parsePrUrl(u)).toEqual({ owner: 'acme', repo: 'review-pane', number: 4821 }));
  it.each(['https://github.com/acme/review-pane', 'https://github.com/acme/review-pane/issues/12', 'https://gitlab.com/a/b/-/merge_requests/1', ''])('rejects %s', (u) => expect(parsePrUrl(u)).toBeNull());
});
