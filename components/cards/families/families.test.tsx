// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { AVAILABLE_FAMILIES, Card, CARD_FAMILIES, CARD_FORMATS, FAMILY_META, SAMPLE_FACTS } from '../index';

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
    for (const f of CARD_FAMILIES) {
      const css = readFileSync(path.join(dir, f, 'tokens.css'), 'utf8');
      for (const v of must) expect(css, `${f} missing ${v}`).toContain(`${v}:`);
      // --pc-pad must stay single-valued: .pc-foot bleeds to the card edge with
      // `calc(var(--pc-pad) * -1)`, and calc() cannot negate a shorthand list.
      const pad = /--pc-pad:\s*([^;}]+)/.exec(css)?.[1].trim();
      expect(pad, `${f} --pc-pad`).toMatch(/^\d+px$/);
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
      const doc = document;
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
    const doc = document;
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
  // --- the 42-pair cascade invariant probe -------------------------------------------------
  // Families load AFTER base.css, so a single-class family rule (`.pc-<family> .pc-x`) beats a
  // per-format base rule (`.pc-compact .pc-x`) at equal specificity. Everything base.css sets
  // *per format* therefore has to survive all seven families, for all six formats.
  const FORMATS = CARD_FORMATS;

  /** The body of one flat rule in base.css, so the expected values come from base, not from here. */
  function ruleBody(css: string, selector: string): string {
    for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^}]*)\}/g)) if (m[1].trim() === selector) return m[2];
    throw new Error(`base.css has no rule for \`${selector}\``);
  }
  const declaration = (body: string, name: string) => {
    const v = new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`).exec(body)?.[1].trim();
    if (!v) throw new Error(`no \`${name}\` in \`${body.trim()}\``);
    return v;
  };

  it('every (family, format) pair keeps the per-format invariants base.css sets', () => {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const base = readFileSync(path.join(dir, '..', 'base.css'), 'utf8');
    // cards.css order: base first, then the families, so the <style> reproduces the real cascade.
    const cards = readFileSync(path.join(dir, '..', 'cards.css'), 'utf8');
    const families = [...cards.matchAll(/families\/([a-z]+)\/tokens\.css/g)].map((m) => m[1]);
    expect(families.sort()).toEqual([...CARD_FAMILIES].sort());
    const css = [base, ...[...cards.matchAll(/families\/([a-z]+)\/tokens\.css/g)].map((m) => readFileSync(path.join(dir, m[1], 'tokens.css'), 'utf8'))].join('\n');

    const baseGap = {
      'queue-row': declaration(ruleBody(base, '.pc-queue-row'), 'gap'),
      compact: declaration(ruleBody(base, '.pc-compact'), 'gap'),
      standard: declaration(ruleBody(base, '.pc'), 'gap'),
      detail: declaration(ruleBody(base, '.pc'), 'gap'),
      digest: declaration(ruleBody(base, '.pc'), 'gap'),
      'detail-wide': declaration(ruleBody(base, '.pc'), 'gap'),
    } as const;
    const compactTitle = declaration(ruleBody(base, '.pc-compact .pc-title'), 'font-size');
    // The only sanctioned per-format overrides: each is a format-scoped compound selector in the
    // family's tokens.css, which is exactly what the convention at the top of base.css allows.
    const gapOverrides: Record<string, string> = {
      'terminal:standard': '0px', // .pc-terminal.pc-standard — the Terminal layout rules its own lines
      // .pc-minimal.pc-{standard,detail,digest,detail-wide} — airier where the geometry is free
      ...Object.fromEntries((['standard', 'detail', 'digest', 'detail-wide'] as const).map((f) => [`minimal:${f}`, '12px'])),
    };
    const statsOverrides: Record<string, string> = {
      'industrial:standard': 'grid', // .pc-industrial.pc-standard .pc-stats — the ruled 4-cell spec grid
    };

    // expect.soft: 42 pairs x 5 invariants — a failure should name every bad cell, not just the first.
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    try {
      for (const family of CARD_FAMILIES) {
        for (const format of FORMATS) {
          const el = document.createElement('article');
          el.className = `pc pc-${family} pc-${format}`;
          el.innerHTML = '<h2 class="pc-title">t</h2><div class="pc-stats"><span class="pc-consequence">x</span></div>';
          document.body.appendChild(el);
          const title = el.querySelector('.pc-title') as HTMLElement;
          const stats = el.querySelector('.pc-stats') as HTMLElement;
          const consequence = el.querySelector('.pc-consequence') as HTMLElement;
          const at = `${family} / ${format}`;

          expect.soft(getComputedStyle(el).gap, `${at} gap`).toBe(gapOverrides[`${family}:${format}`] ?? baseGap[format]);
          expect.soft(getComputedStyle(el).flexDirection, `${at} flex-direction`).toBe(format === 'queue-row' ? 'row' : 'column');
          if (format === 'compact') expect.soft(getComputedStyle(title).fontSize, `${at} .pc-title font-size`).toBe(compactTitle);
          // Compact and QueueRow put the consequence inline on one line; a column flex child there
          // would stack the [data-k] label above it and blow the fixed row height.
          if (format === 'compact' || format === 'queue-row') expect.soft(getComputedStyle(consequence).display, `${at} .pc-consequence display`).not.toBe('flex');
          expect.soft(getComputedStyle(stats).display, `${at} .pc-stats display`).toBe(statsOverrides[`${family}:${format}`] ?? 'flex');

          document.body.removeChild(el);
        }
      }
    } finally {
      document.head.removeChild(style);
    }
  });
});
