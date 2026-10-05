// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card, SAMPLE_FACTS } from '../../index';
import { figuresSentence } from '../../layouts/shared';

describe('editorial', () => {
  it('renders dateline, headline, figures sentence, byline', () => {
    const { getByText } = render(<Card family="editorial" format="standard" facts={SAMPLE_FACTS} />);
    expect(getByText('Open · Feature · acme / review-pane')).toBeTruthy();
    expect(getByText('No. 4821')).toBeTruthy();
    expect(getByText(/183 lines added, 42 removed, across twelve files on feat\/lazy-hunks\. Seven of seven checks pass\./)).toBeTruthy();
    expect(getByText(/By Mira Kato/)).toBeTruthy();
    expect(getByText(/Reviewed by A\. Shah \(approved\), J\. Thäle \(pending\)/)).toBeTruthy();
    expect(getByText('15 Sept 2026')).toBeTruthy();
  });
  it('merged changes tense', () => {
    const f = { ...SAMPLE_FACTS, state: 'merged' as const, mergeCommit: 'a41f92c0ffee', timestamps: { ...SAMPLE_FACTS.timestamps, merged: '2026-09-16T10:00:00Z' } };
    expect(figuresSentence(f)).toMatch(/^183 lines added, 42 removed, across twelve files\. Merged into main as a41f92c\./);
  });
  it('figuresSentence survives sparse facts', () => {
    expect(figuresSentence({ ...SAMPLE_FACTS, diff: { additions: 0, deletions: 0, files: 0 }, checks: { passed: 0, total: 0, items: [] } })).toBe('No lines changed. No checks reported. No conflicts with main.');
  });
});
