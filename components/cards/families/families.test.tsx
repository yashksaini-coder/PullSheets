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
});
