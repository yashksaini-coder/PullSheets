'use client';
import { Trash2 } from 'lucide-react';
import { Button, Section, Tile } from '@/components/ui';
import { CLIPS } from '@/lib/data';
import { clipsDuration } from '@/lib/editor/design';
import { useEditor } from '../EditorProvider';

export function MotionPanel() {
  const { d, update } = useEditor();
  const totalDur = clipsDuration(d.clips);
  return (
    <>
      {d.clips.length > 0 && (
        <div className="row-between" style={{ padding: '6px 8px', marginBottom: 8, borderRadius: 6, background: 'var(--fg-a5)', border: '1px solid var(--fg-a10)' }}>
          <span style={{ fontSize: 12, fontWeight: 500 }}>{d.clips.length} clip{d.clips.length === 1 ? '' : 's'} · {totalDur.toFixed(1)}s</span>
          <Button variant="ghost" size="xs" onClick={() => update({ clips: [] })} style={{ color: 'var(--destructive)' }}><Trash2 size={12} />Clear</Button>
        </div>
      )}
      {(['Entrances', 'Camera', 'Emphasis'] as const).map((g) => (
        <Section key={g} title={g} defaultOpen={g === 'Entrances'}>
          <div className="grid-2">
            {CLIPS.filter((c) => c.group === g).map((c) => (
              <Tile key={c.key} label={c.label} aspect="16 / 10" badge={`${c.dur.toFixed(1)}s`} selected={d.clips.includes(c.key)} background="var(--gradient-ember)" onClick={() => update({ clips: d.clips.includes(c.key) ? d.clips.filter((x) => x !== c.key) : [...d.clips, c.key] })}>
                <span style={{ position: 'absolute', inset: '18%', background: '#fff', borderRadius: 4, boxShadow: 'var(--shadow-lg)' }} />
              </Tile>
            ))}
          </div>
        </Section>
      ))}
      <p className="label-sm" style={{ margin: '8px 0 0', lineHeight: 1.5 }}>Clips play in order. Export up to 10 seconds as MP4 or GIF.</p>
    </>
  );
}
