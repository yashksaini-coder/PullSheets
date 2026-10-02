// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card, SAMPLE_FACTS } from './index';

describe('Card', () => {
  it('renders Midnight Standard with the nine facts', () => {
    const { container, getByText } = render(<Card family="midnight" format="standard" facts={SAMPLE_FACTS} />);
    expect(container.firstElementChild?.className).toContain('pc-midnight');
    expect(getByText('Open')).toBeTruthy();
    expect(getByText('feat')).toBeTruthy();
    expect(getByText('#4821')).toBeTruthy();
    expect(getByText('Stream diff hunks lazily in the review pane')).toBeTruthy();
    expect(getByText('+183')).toBeTruthy();
    expect(getByText('−42')).toBeTruthy();
    expect(getByText('checks 7/7')).toBeTruthy();
    expect(getByText('SNAPSHOT · 15 SEP 2026')).toBeTruthy();
  });
  it('falls back to a visible placeholder for an unregistered format', () => {
    const { getByText } = render(<Card family="midnight" format="compact" facts={SAMPLE_FACTS} />);
    expect(getByText(/not available yet/)).toBeTruthy();
  });
  it('shows MERGED in the stamp and the sha for merged PRs', () => {
    const { getByText } = render(<Card family="midnight" format="standard" facts={{ ...SAMPLE_FACTS, state: 'merged', mergeCommit: 'a41f92c0ffee', timestamps: { ...SAMPLE_FACTS.timestamps, merged: '2026-09-14T14:32:00Z' } }} />);
    expect(getByText('MERGED · 15 SEP 2026')).toBeTruthy();
    expect(getByText('a41f92c')).toBeTruthy();
  });
});
