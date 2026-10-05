// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { Card, SAMPLE_FACTS } from '../../index';

describe('futuristic', () => {
  it('standard uses the HUD grammar: SYS header, tracked labels, tick bar', () => {
    const { getByText, container } = render(<Card family="futuristic" format="standard" facts={SAMPLE_FACTS} />);
    expect(getByText('SYS // PR-4821')).toBeTruthy();
    expect(getByText('acme.review-pane')).toBeTruthy();
    expect(getByText('OPEN · FEAT')).toBeTruthy();
    expect(getByText('7/7 PASS')).toBeTruthy();
    expect(container.querySelectorAll('.pc-tick').length).toBe(24);
  });
  it('merged prints the merge sha and MERGED', () => {
    const { getByText } = render(<Card family="futuristic" format="standard" facts={{ ...SAMPLE_FACTS, state: 'merged', mergeCommit: 'a41f92c0ffee' }} />);
    expect(getByText('MERGED · FEAT')).toBeTruthy();
    expect(getByText(/a41f92c/)).toBeTruthy();
  });
  it('other formats fall back to the default layout with futuristic tokens', () => {
    const { container } = render(<Card family="futuristic" format="compact" facts={SAMPLE_FACTS} />);
    expect(container.firstElementChild?.className).toContain('pc-futuristic');
    expect(container.firstElementChild?.className).toContain('pc-compact');
  });
  it('the 24px grid background carries no var(--pc-bg) inside the gradient shorthand (an invalid layer drops the whole declaration)', () => {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const css = readFileSync(path.join(dir, 'tokens.css'), 'utf8');
    const rule = /\.pc-futuristic\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    const bg = /background:\s*([^;]+);/.exec(rule)?.[1] ?? '';
    expect(bg).toMatch(/^linear-gradient/);
    expect(bg).not.toContain('var(--pc-bg)');
  });
});
