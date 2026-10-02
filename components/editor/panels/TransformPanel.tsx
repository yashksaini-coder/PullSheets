'use client';
import { RotateCcw } from 'lucide-react';
import { Button, Section, Slider, Tile } from '@/components/ui';
import { ASPECTS, LAYOUTS, bgCss } from '@/lib/data';
import { useEditor } from '../EditorProvider';

export function TransformPanel() {
  const { d, update } = useEditor();
  const a = ASPECTS[d.aspect];
  return (
    <>
      <div style={{ position: 'relative', width: '100%', aspectRatio: `${a.w} / ${a.h}`, maxHeight: 220, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--fg-a8)', background: bgCss(d.bg, d.customColor), display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: 600 }}>
        <div style={{ width: '62%', height: '52%', background: '#0D1117', borderRadius: 4, boxShadow: 'var(--canvas-shadow-soft)', transition: 'transform .15s ease-out', transform: `rotateX(${d.rotX}deg) rotateY(${d.rotY}deg) rotateZ(${d.rotZ}deg) scale(${d.scale / 100 + 0.2})` }} />
      </div>
      <Section title="Layout presets">
        <div className="grid-3">
          {LAYOUTS.map((l) => (
            <Tile key={l.key} label={l.label} selected={d.layout === l.key} onClick={() => update({ layout: l.key, rotX: l.rot[0], rotY: l.rot[1], rotZ: l.rot[2] })} background="var(--fg-a4)">
              <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: 300 }}>
                <span style={{ width: '58%', height: '46%', background: 'var(--fg-a30)', borderRadius: 3, transform: `rotateX(${l.rot[0]}deg) rotateY(${l.rot[1]}deg) rotateZ(${l.rot[2]}deg)` }} />
              </span>
            </Tile>
          ))}
        </div>
      </Section>
      <Section title="Fine tune">
        <Slider label="Depth" value={d.persp} min={500} max={3000} step={50} onChange={(v) => update({ persp: v })} display={`${d.persp}px`} />
        <Slider label="Rotate X" value={d.rotX} min={-60} max={60} onChange={(v) => update({ rotX: v, layout: 'custom' })} display={`${d.rotX}°`} />
        <Slider label="Rotate Y" value={d.rotY} min={-60} max={60} onChange={(v) => update({ rotY: v, layout: 'custom' })} display={`${d.rotY}°`} />
        <Slider label="Rotate Z" value={d.rotZ} min={-45} max={45} onChange={(v) => update({ rotZ: v, layout: 'custom' })} display={`${d.rotZ}°`} />
        <Button variant="outline" size="sm" fullWidth onClick={() => update({ persp: 1200, rotX: 0, rotY: 0, rotZ: 0, layout: 'flat' })}><RotateCcw size={14} />Reset to defaults</Button>
      </Section>
    </>
  );
}
