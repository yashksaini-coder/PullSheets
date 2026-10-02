'use client';
import { Section, Slider, Switch, Tile } from '@/components/ui';
import { BACKGROUNDS } from '@/lib/data';
import { useEditor } from '../EditorProvider';

export function BackgroundPanel() {
  const { d, update } = useEditor();
  return (
    <>
      <Section title="Gradients">
        <div className="grid-4">
          {BACKGROUNDS.filter((b) => b.kind === 'gradient').map((b) => <Tile key={b.key} label={b.label} selected={d.bg === b.key} onClick={() => update({ bg: b.key })} background={b.css} />)}
        </div>
      </Section>
      <Section title="Images">
        <div className="grid-4">
          {BACKGROUNDS.filter((b) => b.kind === 'image').map((b) => <Tile key={b.key} label={b.label} selected={d.bg === b.key} onClick={() => update({ bg: b.key })} background={b.css} />)}
        </div>
      </Section>
      <Section title="Solid">
        <div className="row-between">
          <span className="label-sm">Custom color</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="color" value={d.customColor} onChange={(e) => update({ customColor: e.target.value, bg: 'custom' })} aria-label="Custom color" style={{ width: 32, height: 28, padding: 0, border: '1px solid var(--fg-a15)', borderRadius: 6, background: 'none', cursor: 'pointer' }} />
            <span className="mono" style={{ fontSize: 11 }}>{d.customColor.toUpperCase()}</span>
          </div>
        </div>
      </Section>
      <Section title="Adjust">
        <Slider label="Padding" value={d.bgPad} min={0} max={160} onChange={(v) => update({ bgPad: v })} display={`${d.bgPad}px`} />
        <div className="row-between"><span className="label-sm">Noise</span><Switch checked={d.noise} onChange={(v) => update({ noise: v })} label="Noise" /></div>
      </Section>
    </>
  );
}
