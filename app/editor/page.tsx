'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { toBlob, toJpeg, toPng } from 'html-to-image';
import {
  Box, Clapperboard, Clock, Copy, Download, Eye, GitMerge, GitPullRequest, GitPullRequestClosed, GitPullRequestDraft, Globe, Grid2x2, Image as ImageIcon,
  Layers, Link2, Loader2, LogOut, MessageSquare, Moon, Palette, Pause, Play, Plus, Redo2, RefreshCw, RotateCcw, Ruler, Settings2, SlidersHorizontal,
  Smartphone, Sun, Trash2, Undo2, User, Video, WandSparkles,
} from 'lucide-react';
import { Avatar, Button, Dialog, Input, Kbd, Logo, Section, Segmented, Slider, Switch, Tile, Toaster, useClickOutside, useToasts } from '@/components/ui';
import { BrowserFrame, PrCard } from '@/components/pr-card';
import { LinkedInIcon, XIcon } from '@/components/brand-icons';
import { ASPECTS, BACKGROUNDS, CLIPS, LAYOUTS, OVERLAYS, RECENT_PRS, SHADOWS, bgCss, parsePrUrl, saveExport, type AspectKey, type PrStatus, type PullRequest, type ShadowKey } from '@/lib/data';

type Mode = 'image' | 'browser' | 'device';
type BrowserKind = 'safari' | 'chrome' | 'none';

interface Design {
  mode: Mode;
  browser: BrowserKind;
  chromeDark: boolean;
  cardTheme: 'light' | 'dark';
  device: 'macbook' | 'iphone';
  bg: string;
  customColor: string;
  bgPad: number;
  noise: boolean;
  shadow: ShadowKey;
  radius: number;
  scale: number;
  caption: boolean;
  captionText: string;
  captionSub: string;
  overlay: string | null;
  overlaySize: number;
  layout: string;
  persp: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  aspect: AspectKey;
  clips: string[];
  pr: PullRequest;
  hasPr: boolean;
}

const DEFAULT_DESIGN: Design = {
  mode: 'browser', browser: 'safari', chromeDark: true, cardTheme: 'light', device: 'macbook', bg: 'ember', customColor: '#E8452B', bgPad: 0, noise: false,
  shadow: 'soft', radius: 12, scale: 66, caption: true, captionText: 'Just merged.', captionSub: 'PullSheets · v0.1', overlay: null, overlaySize: 30,
  layout: 'flat', persp: 1200, rotX: 0, rotY: 0, rotZ: 0, aspect: 'twitter', clips: [], pr: RECENT_PRS[0], hasPr: true,
};

const STATUS_ICON = { open: GitPullRequest, merged: GitMerge, draft: GitPullRequestDraft, closed: GitPullRequestClosed };

export default function EditorPage() {
  const router = useRouter();
  const { toasts, toast, dismiss } = useToasts();

  const [d, setD] = useState<Design>(DEFAULT_DESIGN);
  const dRef = useRef(d);
  dRef.current = d;
  const past = useRef<Design[]>([]);
  const future = useRef<Design[]>([]);
  const update = useCallback((patch: Partial<Design>) => {
    past.current = [...past.current.slice(-49), dRef.current];
    future.current = [];
    const next = { ...dRef.current, ...patch };
    dRef.current = next;
    setD(next);
  }, []);
  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current = [dRef.current, ...future.current];
    dRef.current = prev;
    setD(prev);
  }, []);
  const redo = useCallback(() => {
    const [next, ...rest] = future.current;
    if (!next) return;
    future.current = rest;
    past.current.push(dRef.current);
    dRef.current = next;
    setD(next);
  }, []);

  const [tab, setTab] = useState<'edit' | 'bg' | 'layers'>('edit');
  const [rtab, setRtab] = useState<'3d' | 'motion'>('3d');
  const [prUrl, setPrUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [format, setFormat] = useState<'png' | 'jpg' | 'mp4' | 'gif'>('png');
  const [exportScale, setExportScale] = useState(2);
  const [startOver, setStartOver] = useState(false);
  const [rulers, setRulers] = useState(false);
  const [grid, setGrid] = useState(false);
  const [selected, setSelected] = useState(false);
  const [saving, setSaving] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);

  const canvasRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const saveRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 760, h: 428 });

  useClickOutside(saveRef, useCallback(() => setSaveOpen(false), []), saveOpen);
  useClickOutside(menuRef, useCallback(() => setMenuOpen(false), []), menuOpen);

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

  // ⌘Z / ⇧⌘Z
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [undo, redo]);

  const importUrl = useCallback((raw: string) => {
    const p = parsePrUrl(raw);
    if (!p) { toast({ type: 'error', title: 'That is not a pull-request link', description: 'Use github.com/owner/repo/pull/123' }); return; }
    setFetching(true);
    // TODO: replace with a server route that calls the GitHub API.
    setTimeout(() => {
      const known = RECENT_PRS.find((r) => r.repo.toLowerCase() === p.repo.toLowerCase() && r.number === p.number);
      const pr: PullRequest = known ?? { repo: p.repo, number: p.number, title: `Pull request #${p.number}`, status: 'open', author: p.repo.split('/')[0], base: 'main', branch: 'feature', when: 'just now', commits: 1, body: 'Fetched from the GitHub API. Title, description, diff stats and checks fill in from the pull request.', additions: 0, deletions: 0, files: 0, checks: '0 / 0' };
      update({ pr, hasPr: true });
      setFetching(false);
      setPrUrl('');
      toast({ type: 'success', title: `Imported ${pr.repo.split('/')[1]} #${pr.number}` });
    }, 900);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [update]);

  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    const q = new URLSearchParams(window.location.search).get('pr');
    if (q) importUrl(q);
  }, [importUrl]);

  const a = ASPECTS[d.aspect];
  const pixelRatio = (a.w / box.w) * exportScale;

  const doExport = async (fmt = format) => {
    const isVideo = fmt === 'mp4' || fmt === 'gif';
    if (isVideo && !d.clips.length) {
      toast({ type: 'info', title: 'Add a clip first', description: 'Pick an entrance or camera move in Motion.' });
      setRtab('motion');
      setSaveOpen(false);
      return;
    }
    setSaveOpen(false);
    const name = `${d.pr.repo.split('/')[1]}-pr${d.pr.number}-${d.aspect}`;
    if (!isVideo && stageRef.current) {
      try {
        const url = fmt === 'jpg' ? await toJpeg(stageRef.current, { pixelRatio, quality: 0.95 }) : await toPng(stageRef.current, { pixelRatio });
        const link = document.createElement('a');
        link.download = `${name}.${fmt}`;
        link.href = url;
        link.click();
      } catch {
        toast({ type: 'error', title: 'Export failed', description: 'Try again, or switch to PNG.' });
        return;
      }
    }
    const dur = d.clips.reduce((s, c) => s + (CLIPS.find((x) => x.key === c)?.dur ?? 0), 0);
    saveExport({ id: Date.now(), title: d.pr.title, repo: d.pr.repo, number: d.pr.number, status: d.pr.status, platform: a.label, w: a.w * exportScale, h: a.h * exportScale, format: fmt.toUpperCase(), scale: exportScale, bg: d.bg === 'custom' ? d.customColor : d.bg, kind: isVideo ? 'video' : 'image', dur: isVideo ? dur : 0, when: 'Just now', ts: Date.now() });
    toast({ type: 'success', title: `Exported ${fmt.toUpperCase()} · ${a.w * exportScale}×${a.h * exportScale}`, description: isVideo ? 'Video rendering runs server-side in production.' : 'Saved to Recent exports', actionLabel: 'Open', onAction: () => router.push('/account#exports') });
  };

  const copyImage = async () => {
    try {
      if (!stageRef.current) return;
      const blob = await toBlob(stageRef.current, { pixelRatio });
      if (blob && navigator.clipboard && 'ClipboardItem' in window) await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      toast({ type: 'success', title: 'Copied to clipboard', description: `${a.w * exportScale}×${a.h * exportScale} PNG` });
    } catch {
      toast({ type: 'error', title: 'Clipboard blocked', description: 'Allow clipboard access, or use Save.' });
    }
  };

  const post = (network: 'X' | 'LinkedIn') => {
    setSaveOpen(false);
    toast({ type: 'loading', title: `Posting to ${network}…` });
    setTimeout(() => toast({ type: 'success', title: `Posted to ${network}` }), 1400);
  };

  const totalDur = d.clips.reduce((s, c) => s + (CLIPS.find((x) => x.key === c)?.dur ?? 0), 0);
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
  const url = `github.com/${d.pr.repo}/pull/${d.pr.number}`;

  const modeOptions = [
    { id: 'image' as const, label: 'Image', icon: <ImageIcon size={14} /> },
    { id: 'browser' as const, label: 'Browser', icon: <Globe size={14} /> },
    { id: 'device' as const, label: 'Device', icon: <Smartphone size={14} /> },
  ];

  return (
    <div className="ed">
      <header className="ed-header">
        <div className="ed-group" style={{ gap: 10, minWidth: 0 }}>
          <Logo href="/" small />
          <span className="divider-v" />
          <Button variant="ghost" size="sm"><WandSparkles size={14} />Templates</Button>
        </div>

        <div className="ed-group" style={{ gap: 10 }}>
          <div className="ed-group">
            <Button variant="ghost" size="icon-sm" aria-label="Undo" disabled={!past.current.length} onClick={undo}><Undo2 size={15} /></Button>
            <Button variant="ghost" size="icon-sm" aria-label="Redo" disabled={!future.current.length} onClick={redo}><Redo2 size={15} /></Button>
          </div>
          <span className="divider-v" />
          <div className="ed-group">
            <Button variant="ghost" size="icon-sm" aria-label="Rulers" active={rulers} onClick={() => setRulers((r) => !r)}><Ruler size={15} /></Button>
            <Button variant="ghost" size="icon-sm" aria-label="Grid" active={grid} onClick={() => setGrid((g) => !g)}><Grid2x2 size={15} /></Button>
          </div>
          <span className="divider-v" />
          <select className="select" aria-label="Aspect ratio" value={d.aspect} onChange={(e) => update({ aspect: e.target.value as AspectKey })}>
            {(Object.keys(ASPECTS) as AspectKey[]).map((key) => (
              <option key={key} value={key}>{ASPECTS[key].label} · {ASPECTS[key].w}×{ASPECTS[key].h}</option>
            ))}
          </select>
          <span className="divider-v" />
          <div className="ed-group" style={{ gap: 6 }}>
            <Button variant="ghost" size="sm" onClick={copyImage}><Copy size={14} />Copy</Button>
            <div ref={saveRef} style={{ position: 'relative' }}>
              <Button size="sm" onClick={() => setSaveOpen((o) => !o)} aria-expanded={saveOpen}><Download size={14} />Save</Button>
              {saveOpen && (
                <div className="popover" style={{ right: 0, width: 300, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="row-between">
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Export</span>
                    <span className="mono muted" style={{ fontSize: 11 }}>{a.w * exportScale} × {a.h * exportScale}</span>
                  </div>
                  <Segmented size="sm" value={format} onChange={setFormat} options={[{ id: 'png', label: 'PNG' }, { id: 'jpg', label: 'JPG' }, { id: 'mp4', label: 'MP4' }, { id: 'gif', label: 'GIF' }]} />
                  <Slider label="Scale" value={exportScale} min={1} max={5} onChange={setExportScale} display={`${exportScale}×`} />
                  <Button size="sm" fullWidth onClick={() => doExport()}><Download size={14} />Export {format.toUpperCase()}</Button>
                  <div className="grid-2" style={{ gap: 6 }}>
                    <Button variant="outline" size="sm" onClick={() => post('X')}><XIcon size={13} />Post to X</Button>
                    <Button variant="outline" size="sm" onClick={() => post('LinkedIn')}><LinkedInIcon size={13} />LinkedIn</Button>
                  </div>
                  <Button variant="ghost" size="sm" fullWidth onClick={copyImage}><Copy size={14} />Copy to clipboard</Button>
                </div>
              )}
            </div>
          </div>
          <span className="divider-v" />
          <div className="ed-group">
            <Button variant="ghost" size="sm" onClick={() => setStartOver(true)}><RefreshCw size={14} />Start over</Button>
            <Button variant="ghost" size="sm" onClick={() => update({ hasPr: false })}><Trash2 size={14} />Remove</Button>
          </div>
        </div>

        <div className="ed-group" style={{ justifySelf: 'end' }}>
          <Button variant="ghost" size="sm"><MessageSquare size={14} />Feedback</Button>
          <Button variant="ghost" size="sm" href="/account#exports"><Clock size={14} />Exports</Button>
          <span className="divider-v" style={{ margin: '0 4px' }} />
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button type="button" onClick={() => setMenuOpen((o) => !o)} aria-label="Account menu" style={{ padding: 0, border: 0, background: 'none', cursor: 'pointer', display: 'inline-flex' }}><Avatar /></button>
            {menuOpen && (
              <div className="popover menu" style={{ right: 0 }}>
                <div className="menu-heading">yashksaini-coder · Pro</div>
                <Link href="/account#profile" className="menu-item"><User size={14} />Profile</Link>
                <Link href="/account#exports" className="menu-item"><ImageIcon size={14} />Recent exports</Link>
                <Link href="/account#editor-defaults" className="menu-item"><Settings2 size={14} />Settings</Link>
                <div className="menu-sep" />
                <Link href="/" className="menu-item"><LogOut size={14} />Sign out</Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="ed-body">
        {/* Left panel */}
        <aside className="ed-panel" style={{ borderRight: '1px solid var(--fg-a10)' }}>
          <div className="ed-panel-top">
            <Segmented value={d.mode} onChange={(m) => update({ mode: m })} options={modeOptions} />
            <Segmented value={tab} onChange={setTab} options={[{ id: 'edit', label: 'Design', icon: <SlidersHorizontal size={14} /> }, { id: 'bg', label: 'BG', icon: <Palette size={14} /> }, { id: 'layers', label: 'Layers', icon: <Layers size={14} /> }]} />
          </div>
          <div className="ed-panel-scroll">
            {tab === 'edit' && (
              <>
                <Section title="Pull request">
                  <form style={{ display: 'flex', gap: 6 }} onSubmit={(e) => { e.preventDefault(); importUrl(prUrl); }}>
                    <Input inputSize="sm" mono placeholder="Paste a GitHub PR link" value={prUrl} onChange={(e) => setPrUrl(e.target.value)} />
                    <Button size="sm" variant="secondary" type="submit" disabled={fetching}>{fetching ? <Loader2 size={14} className="spin" /> : <Link2 size={14} />}{fetching ? 'Fetching' : 'Import'}</Button>
                  </form>
                  <Segmented size="sm" value={d.pr.status} onChange={(s: PrStatus) => update({ pr: { ...d.pr, status: s } })} options={[{ id: 'open', label: 'Open' }, { id: 'merged', label: 'Merged' }, { id: 'draft', label: 'Draft' }, { id: 'closed', label: 'Closed' }]} />
                  <div className="label-sm" style={{ fontSize: 11 }}>Recent pull requests</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {RECENT_PRS.map((r) => {
                      const Icon = STATUS_ICON[r.status];
                      return (
                        <button key={r.repo + r.number} type="button" className="pr-row" onClick={() => update({ pr: r, hasPr: true })}>
                          <Icon size={14} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
                          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                            <span className="mono muted" style={{ fontSize: 10 }}>{r.repo.split('/')[1]} #{r.number}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Section>

                {d.mode === 'browser' && (
                  <Section title="Browser">
                    <Segmented size="sm" value={d.browser} onChange={(b) => update({ browser: b })} options={[{ id: 'safari', label: 'Safari' }, { id: 'chrome', label: 'Chrome' }, { id: 'none', label: 'Plain' }]} />
                    <Segmented size="sm" value={d.chromeDark ? 'dark' : 'light'} onChange={(v) => update({ chromeDark: v === 'dark' })} options={[{ id: 'light', label: 'Light', icon: <Sun size={12} /> }, { id: 'dark', label: 'Dark', icon: <Moon size={12} /> }]} />
                  </Section>
                )}

                {d.mode === 'device' && (
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
                  <Segmented size="sm" value={d.cardTheme} onChange={(t) => update({ cardTheme: t })} options={[{ id: 'light', label: 'Light', icon: <Sun size={12} /> }, { id: 'dark', label: 'Dark', icon: <Moon size={12} /> }]} />
                  <Slider label="Radius" value={d.radius} min={0} max={40} onChange={(v) => update({ radius: v })} display={`${d.radius}px`} />
                  <Slider label="Image Size" value={d.scale} min={30} max={100} onChange={(v) => update({ scale: v })} display={`${d.scale}%`} />
                  <p className="label-sm" style={{ margin: 0 }}>Adjust the size of the image (30% - 100%)</p>
                </Section>

                {!isDevice && (
                  <Section title="Shadow">
                    <div className="grid-4">
                      {(Object.keys(SHADOWS) as ShadowKey[]).map((s) => (
                        <Tile key={s} label={s[0].toUpperCase() + s.slice(1)} selected={d.shadow === s} onClick={() => update({ shadow: s })}>
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
            )}

            {tab === 'bg' && (
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
            )}

            {tab === 'layers' && (
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
            )}
          </div>
        </aside>

        {/* Canvas */}
        <div ref={canvasRef} className="ed-canvas dot-grid" onClick={() => setSelected(false)}>
          {rulers && (<><div className="ruler-x" /><div className="ruler-y" /></>)}
          <div ref={stageRef} className="ed-stage" style={{ width: box.w, height: box.h, background: bgCss(d.bg, d.customColor), padding: d.bgPad * k }}>
            {d.noise && <div className="noise" />}
            {grid && <div className="grid-overlay" />}
            {d.hasPr ? (
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
                        <PrCard pr={d.pr} theme={d.cardTheme} />
                      </BrowserFrame>
                    </div>
                  </div>
                  {isMac && <div className="mac-base" />}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center', color: '#fff', padding: 24, width: '100%', maxWidth: 420 }}>
                <button type="button" onClick={() => update({ pr: RECENT_PRS[0], hasPr: true })} aria-label="Load a recent pull request" style={{ width: 96, height: 96, borderRadius: 24, border: '1px dashed rgba(255,255,255,.55)', background: 'rgba(11,10,10,.25)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(6px)' }}><Plus size={44} strokeWidth={1.5} /></button>
                <div style={{ fontSize: 15, fontWeight: 500, textShadow: '0 1px 4px rgba(0,0,0,.35)' }}>Drag &amp; drop, click to browse, or paste a PR link</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,.8)' }}><Kbd>⌘ V</Kbd><span>to paste</span></div>
                <form className="url-pill" onSubmit={(e) => { e.preventDefault(); importUrl(prUrl); }}>
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
              <Button size="sm" onClick={() => { setFormat('mp4'); doExport('mp4'); }}><Video size={14} />Export Video</Button>
            </div>
          )}

          <button type="button" className="chip" style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)' }} onClick={(e) => { e.stopPropagation(); setRtab('motion'); }}>
            <Clapperboard size={15} />Animate
          </button>
        </div>

        {/* Right panel */}
        <aside className="ed-panel ed-panel-right" style={{ borderLeft: '1px solid var(--fg-a10)' }}>
          <div className="ed-panel-top">
            <Segmented value={rtab} onChange={setRtab} options={[{ id: '3d', label: '3D', icon: <Box size={14} /> }, { id: 'motion', label: 'Motion', icon: <Clapperboard size={14} /> }]} />
          </div>
          <div className="ed-panel-scroll" style={{ paddingTop: 12 }}>
            {rtab === '3d' && (
              <>
                <div style={{ position: 'relative', width: '100%', aspectRatio: `${a.w} / ${a.h}`, maxHeight: 220, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--fg-a8)', background: bgCss(d.bg, d.customColor), display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: 600 }}>
                  <div style={{ width: '62%', height: '52%', background: d.cardTheme === 'dark' ? '#0D1117' : '#fff', borderRadius: 4, boxShadow: 'var(--canvas-shadow-soft)', transition: 'transform .15s ease-out', transform: `rotateX(${d.rotX}deg) rotateY(${d.rotY}deg) rotateZ(${d.rotZ}deg) scale(${d.scale / 100 + 0.2})` }} />
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
            )}
            {rtab === 'motion' && (
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
            )}
          </div>
        </aside>
      </div>

      <Dialog open={startOver} onClose={() => setStartOver(false)} icon={<RefreshCw size={16} />} title="Start over?" description="This resets the current design, overlays, and animation. Your imported pull request stays, and you can undo this action.">
        <Button variant="outline" onClick={() => setStartOver(false)}>Cancel</Button>
        <Button variant="destructive" onClick={() => { update({ ...DEFAULT_DESIGN, pr: d.pr, hasPr: d.hasPr }); setStartOver(false); toast({ type: 'info', title: 'Design reset', description: 'Undo with ⌘Z.' }); }}>Start over</Button>
      </Dialog>
      <Toaster toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
