'use client';
import { Eye, GitPullRequest } from 'lucide-react';
import { Section, Slider, Switch, Tile } from '@/components/ui';
import { OVERLAYS } from '@/lib/data';
import { useEditor } from '../EditorProvider';

export function LayersPanel() {
  const { d, update } = useEditor();
  return (
    <>
      <Section title="Layers">
        <div className="row-between"><span style={{ fontSize: 12, display: 'inline-flex', gap: 8, alignItems: 'center' }}><GitPullRequest size={14} className="muted" />Pull request</span><Eye size={14} className="muted" /></div>
        <div className="row-between"><span style={{ fontSize: 12 }}>Caption</span><Switch checked={d.caption} onChange={(v) => update({ caption: v })} label="Caption" /></div>
        <div className="row-between"><span style={{ fontSize: 12 }}>3D overlay</span><Switch checked={!!d.overlay} onChange={(v) => update({ overlay: v ? d.overlay ?? 'torus' : null })} label="3D overlay" /></div>
      </Section>
      <Section title="Overlay shapes">
        <div className="grid-4">
          {OVERLAYS.map((o) => (
            <Tile key={o} label={o[0].toUpperCase() + o.slice(1)} selected={d.overlay === o} onClick={() => update({ overlay: o })} background="var(--gradient-ember)">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/assets/overlays/${o}-black.webp`} alt="" style={{ position: 'absolute', inset: '14%', width: '72%', height: '72%', objectFit: 'contain' }} />
            </Tile>
          ))}
        </div>
        <Slider label="Size" value={d.overlaySize} min={16} max={48} onChange={(v) => update({ overlaySize: v })} display={`${d.overlaySize}%`} />
      </Section>
    </>
  );
}
