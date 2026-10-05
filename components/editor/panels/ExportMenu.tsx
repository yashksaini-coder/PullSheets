'use client';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState, type RefObject } from 'react';
import { toBlob, toJpeg, toPng } from 'html-to-image';
import { Copy, Download } from 'lucide-react';
import { Button, Slider, useClickOutside } from '@/components/ui';
import { LinkedInIcon, XIcon } from '@/components/brand-icons';
import { ASPECTS, saveExport } from '@/lib/data';
import { useEditor } from '../EditorProvider';
import { VIDEO_PENDING_TOAST, VIDEO_TITLE } from '../video-pending';

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
    // Phase 1 has no renderer, so a video export can only ever be a promise, never a file.
    if (fmt === 'mp4' || fmt === 'gif') {
      toast(VIDEO_PENDING_TOAST);
      onNeedMotion();
      setOpen(false);
      return;
    }
    if (!facts) return; // Save is disabled without facts; the sample card is never exportable.
    setOpen(false);
    const f = facts;
    const name = `${f.repo.name}-pr${f.number}-${d.aspect}`;
    if (stageRef.current) {
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
    // `when` is derived from `ts` at render time; writing a frozen "Just now" would age into a lie.
    saveExport({
      id: Date.now(), title: f.title, repo: `${f.repo.owner}/${f.repo.name}`, number: f.number, status: f.state,
      platform: a.label, w: a.w * exportScale, h: a.h * exportScale, format: fmt.toUpperCase(), scale: exportScale,
      bg: d.bg === 'custom' ? d.customColor : d.bg, kind: 'image', dur: 0, when: '', ts: Date.now(),
    });
    toast({ type: 'success', title: `Exported ${fmt.toUpperCase()} · ${a.w * exportScale}×${a.h * exportScale}`, description: 'Saved to Recent exports', actionLabel: 'Open', onAction: () => router.push('/account#exports') });
  };

  const copyImage = async () => {
    try {
      if (!stageRef.current || !facts) return;
      const blob = await toBlob(stageRef.current, { pixelRatio: pixelRatio() });
      if (blob && navigator.clipboard && 'ClipboardItem' in window) await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      toast({ type: 'success', title: 'Copied to clipboard', description: `${a.w * exportScale}×${a.h * exportScale} PNG` });
    } catch {
      toast({ type: 'error', title: 'Clipboard blocked', description: 'Allow clipboard access, or use Save.' });
    }
  };

  const canExport = facts !== null;
  const needsPr = canExport ? undefined : 'Import a pull request first';
  const socialTitle = features.social ? 'Posting lands in phase 5' : 'Set X_CLIENT_ID / LINKEDIN_CLIENT_ID in .env.local';

  return (
    <div className="ed-group" style={{ gap: 6 }}>
      {/* .btn:disabled sets pointer-events:none, so the tooltip has to sit on a wrapper that still gets hovered. */}
      <span title={needsPr} style={{ display: 'inline-flex' }}>
        <Button variant="ghost" size="sm" onClick={copyImage} disabled={!canExport}><Copy size={14} />Copy</Button>
      </span>
      <div ref={saveRef} style={{ position: 'relative' }}>
        <span title={needsPr} style={{ display: 'inline-flex' }}>
          <Button size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open} disabled={!canExport}><Download size={14} />Save</Button>
        </span>
        {open && (
          <div className="popover" style={{ right: 0, width: 300, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="row-between">
              <span style={{ fontSize: 13, fontWeight: 600 }}>Export</span>
              <span className="mono muted" style={{ fontSize: 11 }}>{a.w * exportScale} × {a.h * exportScale}</span>
            </div>
            {/* Inline segmented control: unlike <Segmented>, options here can be disabled per format. */}
            <div className="seg seg-sm" role="tablist">
              {FORMATS.map((f) => {
                const off = f === 'mp4' || f === 'gif'; // no renderer before phase 4, regardless of env
                return (
                  <button key={f} type="button" role="tab" aria-selected={format === f} disabled={off} title={off ? VIDEO_TITLE : undefined} style={off ? { opacity: 0.45, cursor: 'not-allowed' } : undefined} onClick={() => setFormat(f)}>
                    {f.toUpperCase()}
                  </button>
                );
              })}
            </div>
            <Slider label="Scale" value={exportScale} min={1} max={5} onChange={setExportScale} display={`${exportScale}×`} />
            <Button size="sm" fullWidth onClick={() => doExport()}><Download size={14} />Export {format.toUpperCase()}</Button>
            <div className="grid-2" style={{ gap: 6 }}>
              <span title={socialTitle} style={{ display: 'inline-flex' }}>
                <Button variant="outline" size="sm" fullWidth disabled><XIcon size={13} />Post to X</Button>
              </span>
              <span title={socialTitle} style={{ display: 'inline-flex' }}>
                <Button variant="outline" size="sm" fullWidth disabled><LinkedInIcon size={13} />LinkedIn</Button>
              </span>
            </div>
            <Button variant="ghost" size="sm" fullWidth onClick={copyImage}><Copy size={14} />Copy to clipboard</Button>
          </div>
        )}
      </div>
    </div>
  );
}
