// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
  it('headline and body win the cascade over the base rules (base.css loads before tokens.css)', () => {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const base = readFileSync(path.join(dir, '..', '..', 'base.css'), 'utf8');
    const tokens = readFileSync(path.join(dir, 'tokens.css'), 'utf8');
    const doc = document;
    const style = doc.createElement('style');
    style.textContent = base + '\n' + tokens;
    doc.head.appendChild(style);
    const article = doc.createElement('article');
    article.className = 'pc pc-editorial pc-standard';
    article.innerHTML = '<h2 class="pc-title pc-ed-headline">x</h2><p class="pc-body pc-ed-body">y</p>';
    doc.body.appendChild(article);
    const h2 = article.querySelector('h2') as HTMLElement;
    const p = article.querySelector('p') as HTMLElement;
    expect(getComputedStyle(h2).fontSize).toBe('24px');
    expect(getComputedStyle(p).fontSize).toBe('13.5px');
    doc.body.removeChild(article);
    doc.head.removeChild(style);
  });
});
