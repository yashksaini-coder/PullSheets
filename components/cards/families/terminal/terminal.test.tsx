// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card, SAMPLE_FACTS } from '../../index';

describe('terminal', () => {
  it('prints the prompt, bracketed state, a glyph diffstat and the review lines', () => {
    const { getByText, container } = render(<Card family="terminal" format="standard" facts={SAMPLE_FACTS} />);
    expect(getByText('pullsheet show acme/review-pane#4821')).toBeTruthy();
    expect(getByText('[ OPEN ]')).toBeTruthy();
    expect(container.querySelector('.pc-term-diffstat')?.textContent).toMatch(/^\++-+$/);
    expect(getByText('@mkato (Mira Kato)')).toBeTruthy();
    expect(getByText('ashah ✓ approved')).toBeTruthy();
    expect(getByText('jthale … waiting')).toBeTruthy();
    expect(getByText('2026-09-15T14:32Z')).toBeTruthy();
  });
  it('merged shows [ MERGED ] and the sha', () => {
    const { getByText } = render(<Card family="terminal" format="standard" facts={{ ...SAMPLE_FACTS, state: 'merged', mergeCommit: 'a41f92c0ffee' }} />);
    expect(getByText('[ MERGED ]')).toBeTruthy();
    expect(getByText(/a41f92c/)).toBeTruthy();
  });
  it('zero-diff PR shows a dimmed "(no changes)" instead of a dash-only bar', () => {
    const { getByText, container } = render(<Card family="terminal" format="standard" facts={{ ...SAMPLE_FACTS, diff: { additions: 0, deletions: 0, files: 0 } }} />);
    expect(getByText('(no changes)')).toBeTruthy();
    expect(container.querySelector('.pc-term-diffstat')?.textContent).toBe('(no changes)');
  });
});
