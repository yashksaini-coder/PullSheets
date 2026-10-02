'use client';
import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { Clapperboard, Link2, Pause, Play, Plus, Video } from 'lucide-react';
import { Button, Kbd } from '@/components/ui';
import { Card, FRAME_WIDTH, SAMPLE_FACTS } from '@/components/cards';
import { ASPECTS, CLIPS, SHADOWS, bgCss } from '@/lib/data';
import { clipsDuration } from '@/lib/editor/design';
import { useEditor } from './EditorProvider';
import { CardScaler } from './CardScaler';
import { BrowserFrame } from './frames/BrowserFrame';
import { useImportPr } from './use-import-pr';

export function Canvas({ stageRef, rulers, grid, onOpenImport, onAnimate }: {
  stageRef: RefObject<HTMLDivElement | null>;
  rulers: boolean; grid: boolean;
  onOpenImport: () => void; onAnimate: () => void;
}) {
  const { d, facts, features, toast } = useEditor();
  const { importUrl } = useImportPr();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 760, h: 428 });
  const [selected, setSelected] = useState(false);
  const [saving, setSaving] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [prUrl, setPrUrl] = useState('');

  // Fit the export-ratio stage into the canvas.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const fit = () => {
      const a = ASPECTS[d.aspect];
      const availW = Math.max(200, el.clientWidth - 96);
      const availH = Math.max(160, el.clientHeight - (d.clips.length ? 210 : 152));
      let w = Math.min(availW, 860);
      let h = (w * a.h) / a.w;
      if (h > availH) { h = availH; w = (h * a.w) / a.h; }
      setBox({ w: Math.round(w), h: Math.round(h) });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [d.aspect, d.clips.length]);

  // Draft indicator.
  useEffect(() => {
    setSaving(true);
    const t = setTimeout(() => setSaving(false), 800);
    return () => clearTimeout(t);
  }, [d]);

  const totalDur = clipsDuration(d.clips);
  useEffect(() => {
    if (!playing) return;
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      setPlayhead(Math.min(1, t / totalDur));
      if (t < totalDur) raf = requestAnimationFrame(tick);
      else { setPlaying(false); setPlayhead(0); }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, totalDur]);

  const a = ASPECTS[d.aspect];
  const k = box.w / 1200;
  const isDevice = d.mode === 'device';
  const isIphone = isDevice && d.device === 'iphone';
  const isMac = isDevice && d.device === 'macbook';
  const wrapW = isIphone ? Math.round(d.scale * 0.42) : d.scale;
  const transform = `perspective(${d.persp}px) rotateX(${d.rotX}deg) rotateY(${d.rotY}deg) rotateZ(${d.rotZ}deg)`;
  const frameOuter: CSSProperties = isIphone
    ? { background: '#131315', padding: '2.4cqw 1.8cqw', borderRadius: '9cqw', boxShadow: SHADOWS.strong }
    : isMac
      ? { background: '#131315', padding: '1.4cqw 1.4cqw 0', borderRadius: '2.4cqw 2.4cqw 0 0', boxShadow: SHADOWS.strong }
      : { borderRadius: d.radius, boxShadow: SHADOWS[d.shadow] };
  const frameInner: CSSProperties = { overflow: 'hidden', borderRadius: isIphone ? '6.5cqw' : isMac ? '.8cqw' : d.radius };
  const shown = facts ?? SAMPLE_FACTS;
  const url = `github.com/${shown.repo.owner}/${shown.repo.name}/pull/${shown.number}`;

  return (
    <div ref={canvasRef} className="ed-canvas dot-grid" onClick={() => setSelected(false)}>
      {rulers && (<><div className="ruler-x" /><div className="ruler-y" /></>)}
      <div ref={stageRef} className="ed-stage" style={{ width: box.w, height: box.h, background: bgCss(d.bg, d.customColor), padding: d.bgPad * k }}>
        {d.noise && <div className="noise" />}
        {grid && <div className="grid-overlay" />}
        {facts ? (
          <>
            {d.caption && (
              <div style={{ position: 'absolute', top: '5.5%', left: '4.5%', right: '4.5%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,.35)', pointerEvents: 'none' }}>
                <span style={{ fontSize: Math.round(34 * k), fontWeight: 600, letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}>{d.captionText}</span>
                <span style={{ fontSize: Math.round(19 * k), fontWeight: 500, opacity: 0.85, whiteSpace: 'nowrap' }}>{d.captionSub}</span>
              </div>
            )}
            {d.overlay && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/assets/overlays/${d.overlay}-black.webp`} alt="" style={{ position: 'absolute', left: '-4%', bottom: '-10%', width: `${d.overlaySize}%`, filter: 'drop-shadow(0 20px 30px rgba(0,0,0,.35))', pointerEvents: 'none' }} />
            )}
            <div className="card-wrap" data-selected={selected || undefined} style={{ width: `${wrapW}%`, transform, containerType: 'inline-size' }} onClick={(e) => { e.stopPropagation(); setSelected(true); }}>
              <div style={frameOuter}>
                <div style={frameInner}>
                  <BrowserFrame browser={d.mode === 'browser' ? d.browser : 'none'} dark={d.chromeDark} url={url}>
                    <CardScaler nativeWidth={FRAME_WIDTH[d.cardFormat]}>
                      <Card family={d.cardFamily} format={d.cardFormat} facts={shown} />
                    </CardScaler>
                  </BrowserFrame>
                </div>
              </div>
              {isMac && <div className="mac-base" />}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center', color: '#fff', padding: 24, width: '100%', maxWidth: 420 }}>
            <button type="button" onClick={onOpenImport} aria-label="Import a pull request" style={{ width: 96, height: 96, borderRadius: 24, border: '1px dashed rgba(255,255,255,.55)', background: 'rgba(11,10,10,.25)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(6px)' }}><Plus size={44} strokeWidth={1.5} /></button>
            <div style={{ fontSize: 15, fontWeight: 500, textShadow: '0 1px 4px rgba(0,0,0,.35)' }}>Drag &amp; drop, click to browse, or paste a PR link</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,.8)' }}><Kbd>⌘ V</Kbd><span>to paste</span></div>
            <form className="url-pill" onSubmit={(e) => { e.preventDefault(); importUrl(prUrl).then((f) => { if (f) setPrUrl(''); }); }}>
              <Link2 size={14} style={{ color: 'rgba(255,255,255,.7)', flexShrink: 0 }} />
              <input value={prUrl} onChange={(e) => setPrUrl(e.target.value)} placeholder="github.com/owner/repo/pull/482" aria-label="Pull request URL" />
              <button type="submit" className="round-go" aria-label="Import"><Link2 size={14} /></button>
            </form>
          </div>
        )}
      </div>

      <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted-foreground)' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: saving ? 'var(--warning)' : 'var(--success)' }} />{saving ? 'Saving…' : 'Draft saved'}
      </div>
      <div className="mono" style={{ position: 'absolute', bottom: 12, left: 12, fontSize: 11, color: 'var(--muted-foreground)' }}>{a.w} × {a.h} · {a.label}</div>

      {d.clips.length > 0 && (
        <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', bottom: 60, left: '50%', transform: 'translateX(-50%)', width: 'min(560px,80%)', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--card)', border: '1px solid var(--fg-a10)', boxShadow: 'var(--shadow-lg)' }}>
          <Button variant="ghost" size="icon-sm" aria-label={playing ? 'Pause' : 'Play'} onClick={() => setPlaying((p) => !p)}>{playing ? <Pause size={15} /> : <Play size={15} />}</Button>
          <div style={{ position: 'relative', flex: 1, height: 32, borderRadius: 6, background: 'var(--fg-a4)', border: '1px solid var(--fg-a10)', overflow: 'hidden' }}>
            {(() => {
              let acc = 0;
              return d.clips.map((c) => {
                const clip = CLIPS.find((x) => x.key === c)!;
                const left = (acc / totalDur) * 100;
                acc += clip.dur;
                return <div key={c} style={{ position: 'absolute', top: 4, bottom: 4, left: `${left}%`, width: `${(clip.dur / totalDur) * 100 - 0.6}%`, borderRadius: 4, background: 'var(--primary-a20)', border: '1px solid var(--primary)', fontSize: 10, display: 'flex', alignItems: 'center', padding: '0 8px', whiteSpace: 'nowrap', overflow: 'hidden' }}>{clip.label}</div>;
              });
            })()}
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${playhead * 100}%`, width: 1, background: 'var(--foreground)' }} />
          </div>
          <span className="mono muted" style={{ fontSize: 11 }}>{totalDur.toFixed(1)}s</span>
          <Button size="sm" disabled={!features.video} title={features.video ? undefined : 'Video rendering lands in phase 4'} onClick={() => toast({ type: 'info', title: 'Export video from Save → MP4' })}><Video size={14} />Export Video</Button>
        </div>
      )}

      <button type="button" className="chip" style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)' }} onClick={(e) => { e.stopPropagation(); onAnimate(); }}>
        <Clapperboard size={15} />Animate
      </button>
    </div>
  );
}
