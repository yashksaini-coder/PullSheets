'use client';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState, type RefObject } from 'react';
import { toBlob, toJpeg, toPng } from 'html-to-image';
import { Copy, Download } from 'lucide-react';
import { Button, Slider, useClickOutside } from '@/components/ui';
import { LinkedInIcon, XIcon } from '@/components/brand-icons';
import { SAMPLE_FACTS } from '@/components/cards';
import { ASPECTS, saveExport } from '@/lib/data';
import { clipsDuration } from '@/lib/editor/design';
import { useEditor } from '../EditorProvider';

type Fmt = 'png' | 'jpg' | 'mp4' | 'gif';
const FORMATS: Fmt[] = ['png', 'jpg', 'mp4', 'gif'];

export function ExportMenu({ stageRef, onNeedMotion }: { stageRef: RefObject<HTMLDivElement | null>; onNeedMotion: () => void }) {
  const { d, facts, features, toast } = useEditor();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<Fmt>('png');
  const [exportScale, setExportScale] = useState(2);
  const saveRef = useRef<HTMLDivElement>(null);
  useClickOutside(saveRef, useCallback(() => setOpen(false), []), open);

  const a = ASPECTS[d.aspect];
  // The stage is its own source of truth for width, so the exported pixels match what is on screen.
  const pixelRatio = () => (a.w / Math.max(1, stageRef.current?.clientWidth ?? a.w)) * exportScale;

  const doExport = async (fmt: Fmt = format) => {
    const isVideo = fmt === 'mp4' || fmt === 'gif';
    if (isVideo && !features.video) {
      toast({ type: 'info', title: 'Video rendering lands in phase 4' });
      return;
    }
    if (isVideo && !d.clips.length) {
      toast({ type: 'info', title: 'Add a clip first', description: 'Pick an entrance or camera move in Motion.' });
      onNeedMotion();
      setOpen(false);
      return;
    }
    setOpen(false);
    const f = facts ?? SAMPLE_FACTS;
    const name = `${f.repo.name}-pr${f.number}-${d.aspect}`;
    if (!isVideo && stageRef.current) {
      try {
        const ratio = pixelRatio();
        const url = fmt === 'jpg' ? await toJpeg(stageRef.current, { pixelRatio: ratio, quality: 0.95 }) : await toPng(stageRef.current, { pixelRatio: ratio });
        const link = document.createElement('a');
        link.download = `${name}.${fmt}`;
        link.href = url;
        link.click();
      } catch {
        toast({ type: 'error', title: 'Export failed', description: 'Try again, or switch to PNG.' });
        return;
      }
    }
    const dur = clipsDuration(d.clips);
    saveExport({
      id: Date.now(), title: f.title, repo: `${f.repo.owner}/${f.repo.name}`, number: f.number, status: f.state,
      platform: a.label, w: a.w * exportScale, h: a.h * exportScale, format: fmt.toUpperCase(), scale: exportScale,
      bg: d.bg === 'custom' ? d.customColor : d.bg, kind: isVideo ? 'video' : 'image', dur: isVideo ? dur : 0,
      when: 'Just now', ts: Date.now(),
    });
    toast({ type: 'success', title: `Exported ${fmt.toUpperCase()} · ${a.w * exportScale}×${a.h * exportScale}`, description: 'Saved to Recent exports', actionLabel: 'Open', onAction: () => router.push('/account#exports') });
  };

  const copyImage = async () => {
    try {
      if (!stageRef.current) return;
      const blob = await toBlob(stageRef.current, { pixelRatio: pixelRatio() });
      if (blob && navigator.clipboard && 'ClipboardItem' in window) await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      toast({ type: 'success', title: 'Copied to clipboard', description: `${a.w * exportScale}×${a.h * exportScale} PNG` });
    } catch {
      toast({ type: 'error', title: 'Clipboard blocked', description: 'Allow clipboard access, or use Save.' });
    }
  };

  const socialTitle = features.social ? 'Posting lands in phase 5' : 'Set X_CLIENT_ID / LINKEDIN_CLIENT_ID in .env.local';

  return (
    <div className="ed-group" style={{ gap: 6 }}>
      <Button variant="ghost" size="sm" onClick={copyImage}><Copy size={14} />Copy</Button>
      <div ref={saveRef} style={{ position: 'relative' }}>
        <Button size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}><Download size={14} />Save</Button>
        {open && (
          <div className="popover" style={{ right: 0, width: 300, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="row-between">
              <span style={{ fontSize: 13, fontWeight: 600 }}>Export</span>
              <span className="mono muted" style={{ fontSize: 11 }}>{a.w * exportScale} × {a.h * exportScale}</span>
            </div>
            {/* Inline segmented control: unlike <Segmented>, options here can be disabled per format. */}
            <div className="seg seg-sm" role="tablist">
              {FORMATS.map((f) => {
                const off = (f === 'mp4' || f === 'gif') && !features.video;
                return (
                  <button key={f} type="button" role="tab" aria-selected={format === f} disabled={off} title={off ? 'Video rendering lands in phase 4' : undefined} style={off ? { opacity: 0.45, cursor: 'not-allowed' } : undefined} onClick={() => setFormat(f)}>
                    {f.toUpperCase()}
                  </button>
                );
              })}
            </div>
            <Slider label="Scale" value={exportScale} min={1} max={5} onChange={setExportScale} display={`${exportScale}×`} />
            <Button size="sm" fullWidth onClick={() => doExport()}><Download size={14} />Export {format.toUpperCase()}</Button>
            <div className="grid-2" style={{ gap: 6 }}>
              <Button variant="outline" size="sm" disabled title={socialTitle}><XIcon size={13} />Post to X</Button>
              <Button variant="outline" size="sm" disabled title={socialTitle}><LinkedInIcon size={13} />LinkedIn</Button>
            </div>
            <Button variant="ghost" size="sm" fullWidth onClick={copyImage}><Copy size={14} />Copy to clipboard</Button>
          </div>
        )}
      </div>
    </div>
  );
}
