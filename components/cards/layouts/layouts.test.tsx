// @vitest-environment jsdom
import { render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card, CARD_FORMATS, FRAME_WIDTH, SAMPLE_FACTS, type PrFacts } from '../index';
import { consequenceLine } from './shared';

const SPARSE: PrFacts = {
  ...SAMPLE_FACTS, body: '', labels: [], type: null,
  checks: { passed: 0, total: 0, items: [] }, reviews: { approved: 0, requested: 0, items: [] }, files: [],
  diff: { additions: 0, deletions: 0, files: 0 },
};
const LONG: PrFacts = {
  ...SAMPLE_FACTS,
  title: 'A'.repeat(140), head: 'feature/' + 'x'.repeat(120), base: 'main',
  files: [{ path: 'src/' + 'deeply/'.repeat(20) + 'File.tsx', additions: 10, deletions: 1 }],
};

describe('every format renders', () => {
  for (const format of CARD_FORMATS) {
    it(`${format}: sample, sparse and long facts, at its frame width`, () => {
      for (const facts of [SAMPLE_FACTS, SPARSE, LONG]) {
        const { container, unmount } = render(<Card family="midnight" format={format} facts={facts} />);
        const root = container.firstElementChild as HTMLElement;
        expect(root.className).toContain(`pc-${format}`);
        expect(root.style.width).toBe(`${FRAME_WIDTH[format]}px`);
        expect(container.textContent).not.toMatch(/undefined|NaN/);
        unmount();
      }
    });
  }
  it('standard still shows the nine facts', () => {
    const { getByText } = render(<Card family="midnight" format="standard" facts={SAMPLE_FACTS} />);
    for (const t of ['Open', 'feat', '#4821', 'Stream diff hunks lazily in the review pane', '+183', '−42', 'checks 7/7', 'SNAPSHOT · 15 SEP 2026']) expect(getByText(t)).toBeTruthy();
  });
  it('compact carries the consequence line, detail lists checks and files, digest has no body', () => {
    expect(render(<Card family="midnight" format="compact" facts={SAMPLE_FACTS} />).getByText('1 of 2 approved · checks 7/7')).toBeTruthy();
    const d = render(<Card family="midnight" format="detail" facts={SAMPLE_FACTS} />);
    expect(d.getByText('build')).toBeTruthy();
    expect(d.getByText('src/review/HunkList.tsx')).toBeTruthy();
    const g = render(<Card family="midnight" format="digest" facts={SAMPLE_FACTS} />);
    expect(within(g.container).queryByText(SAMPLE_FACTS.body)).toBeNull(); // scoped: earlier renders in this test share document.body
  });
});

describe('consequenceLine', () => {
  const f = (p: Partial<PrFacts>) => ({ ...SAMPLE_FACTS, ...p });
  it.each([
    ['open', '1 of 2 approved · checks 7/7'],
    ['draft', 'not ready for review · checks 7/7'],
    ['approved', 'ready to merge · checks 7/7'],
    ['changes', '1 blocking review · checks 7/7'],
    ['checks-failed', 'checks 7/7'],
    ['conflict', 'rebase needed'],
    ['merged', 'merged · 1 of 2 approved'],
    ['closed', 'closed without merging'],
  ] as const)('%s', (state, text) => {
    const facts = state === 'changes' ? f({ state, reviews: { approved: 0, requested: 1, items: [{ reviewer: SAMPLE_FACTS.author, verdict: 'changes' }] } }) : f({ state });
    expect(consequenceLine(facts)).toBe(text);
  });
  it('names the failing checks when there are any', () => {
    const facts = f({ state: 'checks-failed', checks: { passed: 5, total: 7, items: [{ name: 'e2e', status: 'fail', durationSec: 1 }, { name: 'lint', status: 'fail', durationSec: 1 }, { name: 'build', status: 'pass', durationSec: 1 }] } });
    expect(consequenceLine(facts)).toBe('e2e · lint failing');
  });
});
