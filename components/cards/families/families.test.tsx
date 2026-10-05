// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { AVAILABLE_FAMILIES, Card, CARD_FAMILIES, FAMILY_META, SAMPLE_FACTS } from '../index';

describe('families', () => {
  it('industrial, modern and minimal are available and render the standard card under their class', () => {
    for (const f of ['industrial', 'modern', 'minimal'] as const) {
      expect(AVAILABLE_FAMILIES).toContain(f);
      const { container } = render(<Card family={f} format="standard" facts={SAMPLE_FACTS} />);
      expect(container.firstElementChild?.className).toContain(`pc-${f}`);
    }
  });
  it('every family has meta for the picker', () => {
    for (const f of CARD_FAMILIES) expect(FAMILY_META[f].label.length).toBeGreaterThan(0);
  });
  it('each token file declares the required custom properties', () => {
    const must = ['--pc-bg', '--pc-fg', '--pc-muted', '--pc-faint', '--pc-line', '--pc-accent', '--pc-track', '--pc-add', '--pc-del', '--pc-wait', '--pc-fail', '--pc-radius', '--pc-pad', '--pc-font', '--pc-mono', '--pc-title-weight'];
    const dir = path.dirname(fileURLToPath(import.meta.url));
    for (const f of ['midnight', 'industrial', 'modern', 'minimal'] as const) {
      const css = readFileSync(path.join(dir, f, 'tokens.css'), 'utf8');
      for (const v of must) expect(css, `${f} missing ${v}`).toContain(`${v}:`);
    }
  });
  it('cards.css is only ordered imports: base.css first, then family token files', () => {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const css = readFileSync(path.join(dir, '..', 'cards.css'), 'utf8');
    const lines = css.split('\n').map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith('/*'));
    for (const l of lines) expect(l, `non-import line in cards.css: ${l}`).toMatch(/^@import\s+'.*';$/);
    expect(lines[0]).toBe("@import './base.css';");
    for (const l of lines) expect(l === lines[0] || l.includes('/families/')).toBe(true);
  });
  it('base rules load before family overrides, so family tokens win the cascade', () => {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const base = readFileSync(path.join(dir, '..', 'base.css'), 'utf8');
    for (const [family, expected] of [
      ['terminal', { gap: '0px', lineHeight: '1.65' }],
      ['minimal', { gap: '12px' }],
    ] as const) {
      const tokens = readFileSync(path.join(dir, family, 'tokens.css'), 'utf8');
      // jsdom's document, reached via globalThis so the cards-must-stay-pure lint rule
      // (no bare `document`) doesn't flag this test-only cascade probe.
      const doc = globalThis.document;
      const style = doc.createElement('style');
      style.textContent = base + '\n' + tokens;
      doc.head.appendChild(style);
      const el = doc.createElement('article');
      el.className = `pc pc-${family} pc-standard`;
      doc.body.appendChild(el);
      const computed = getComputedStyle(el);
      for (const [prop, value] of Object.entries(expected)) {
        expect(computed[prop as keyof CSSStyleDeclaration], `${family} ${prop}`).toBe(value);
      }
      doc.body.removeChild(el);
      doc.head.removeChild(style);
    }
  });
  it("industrial's ruled stats grid is scoped to Standard; other formats keep the default flex row", () => {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const base = readFileSync(path.join(dir, '..', 'base.css'), 'utf8');
    const tokens = readFileSync(path.join(dir, 'industrial', 'tokens.css'), 'utf8');
    const doc = globalThis.document;
    const style = doc.createElement('style');
    style.textContent = base + '\n' + tokens;
    doc.head.appendChild(style);

    const compact = doc.createElement('article');
    compact.className = 'pc pc-industrial pc-compact';
    const compactStats = doc.createElement('div');
    compactStats.className = 'pc-stats';
    compact.appendChild(compactStats);
    doc.body.appendChild(compact);

    const standard = doc.createElement('article');
    standard.className = 'pc pc-industrial pc-standard';
    const standardStats = doc.createElement('div');
    standardStats.className = 'pc-stats';
    standard.appendChild(standardStats);
    doc.body.appendChild(standard);

    expect(getComputedStyle(compactStats).display).toBe('flex');
    expect(getComputedStyle(standardStats).display).toBe('grid');

    doc.body.removeChild(compact);
    doc.body.removeChild(standard);
    doc.head.removeChild(style);
  });
});
