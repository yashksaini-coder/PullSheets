'use client';
import { Moon, Sun } from 'lucide-react';
import { Input, Section, Segmented, Slider, Switch, Tile } from '@/components/ui';
import { AVAILABLE_FAMILIES, CARD_FORMATS, type CardFamily, type CardFormat } from '@/components/cards';
import { SHADOWS, type ShadowKey } from '@/lib/data';
import { useEditor } from '../EditorProvider';

const title = (s: string) => s[0].toUpperCase() + s.slice(1).replace(/-/g, ' ');

export function CardPanel() {
  const { d, update } = useEditor();
  const isDevice = d.mode === 'device';

  return (
    <>
      {d.mode === 'browser' && (
        <Section title="Browser">
          <Segmented size="sm" value={d.browser} onChange={(b) => update({ browser: b })} options={[{ id: 'safari', label: 'Safari' }, { id: 'chrome', label: 'Chrome' }, { id: 'none', label: 'Plain' }]} />
          <Segmented size="sm" value={d.chromeDark ? 'dark' : 'light'} onChange={(v) => update({ chromeDark: v === 'dark' })} options={[{ id: 'light', label: 'Light', icon: <Sun size={12} /> }, { id: 'dark', label: 'Dark', icon: <Moon size={12} /> }]} />
        </Section>
      )}

      {isDevice && (
        <Section title="Device frames">
          <div className="grid-2">
            <Tile label="MacBook Pro 14" selected={d.device === 'macbook'} onClick={() => update({ device: 'macbook' })} background="var(--fg-a4)" aspect="4 / 3">
              <span style={{ position: 'absolute', left: '14%', right: '14%', top: '24%', height: '44%', background: '#1c1c1e', borderRadius: '5px 5px 2px 2px', border: '1px solid var(--fg-a25)' }}><span style={{ position: 'absolute', inset: '8%', background: 'var(--primary)', borderRadius: 2 }} /></span>
            </Tile>
            <Tile label="iPhone 17 Pro" selected={d.device === 'iphone'} onClick={() => update({ device: 'iphone' })} background="var(--fg-a4)" aspect="4 / 3">
              <span style={{ position: 'absolute', left: '36%', right: '36%', top: '12%', bottom: '12%', background: '#1c1c1e', borderRadius: 8, border: '1px solid var(--fg-a25)' }}><span style={{ position: 'absolute', inset: '7% 8%', background: 'var(--primary)', borderRadius: 5 }} /></span>
            </Tile>
          </div>
        </Section>
      )}

      <Section title="Card">
        <Segmented size="sm" value={d.cardFamily} onChange={(f: CardFamily) => update({ cardFamily: f })} options={AVAILABLE_FAMILIES.map((f) => ({ id: f, label: title(f) }))} />
        <label className="label-sm" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          Format
          <select className="select" value={d.cardFormat} onChange={(e) => update({ cardFormat: e.target.value as CardFormat })}>
            {CARD_FORMATS.map((f) => <option key={f} value={f}>{title(f)}</option>)}
          </select>
        </label>
        <Slider label="Radius" value={d.radius} min={0} max={40} onChange={(v) => update({ radius: v })} display={`${d.radius}px`} />
        <Slider label="Image Size" value={d.scale} min={30} max={100} onChange={(v) => update({ scale: v })} display={`${d.scale}%`} />
        <p className="label-sm" style={{ margin: 0 }}>Adjust the size of the image (30% - 100%)</p>
      </Section>

      {!isDevice && (
        <Section title="Shadow">
          <div className="grid-4">
            {(Object.keys(SHADOWS) as ShadowKey[]).map((s) => (
              <Tile key={s} label={title(s)} selected={d.shadow === s} onClick={() => update({ shadow: s })}>
                <span style={{ position: 'absolute', top: '26%', left: '26%', width: '95%', height: '95%', background: 'var(--primary)', borderRadius: 10, boxShadow: SHADOWS[s] }} />
              </Tile>
            ))}
          </div>
        </Section>
      )}

      <Section title="Text" defaultOpen={false}>
        <div className="row-between"><span className="label-sm">Show caption</span><Switch checked={d.caption} onChange={(v) => update({ caption: v })} label="Show caption" /></div>
        <Input inputSize="xs" value={d.captionText} onChange={(e) => update({ captionText: e.target.value })} aria-label="Caption title" />
        <Input inputSize="xs" value={d.captionSub} onChange={(e) => update({ captionSub: e.target.value })} aria-label="Caption tag" />
      </Section>
    </>
  );
}
