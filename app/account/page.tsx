'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowRight, Command, Copy, Download, GitBranch, Image as ImageIcon, LayoutGrid, MessageCircle, MessageSquare, Palette, Play, Plus,
  RefreshCw, Settings2, Share, SlidersHorizontal, Star, Trash2, TriangleAlert, Upload, WandSparkles, ChevronRight,
} from 'lucide-react';
import { Avatar, Button, Dialog, Input, LogoMark, Segmented, Slider, StatusPill, Switch, Tile, Toaster, useToasts } from '@/components/ui';
import { GitHubIcon, LinkedInIcon, XIcon } from '@/components/brand-icons';
import { BACKGROUNDS, DEMO_EXPORTS, EXPORTS_KEY, RECENT_PRS, bgCss, loadExports, type ExportItem } from '@/lib/data';

type PageId = 'overview' | 'exports' | 'export-defaults' | 'editor-defaults' | 'branding' | 'api' | 'profile' | 'github' | 'notifications' | 'billing' | 'danger';

const NAV: { group: string; items: { id: PageId; label: string; icon: ReactNode; badge?: string }[] }[] = [
  { group: 'Workspace', items: [{ id: 'overview', label: 'Overview', icon: <LayoutGrid size={15} /> }, { id: 'exports', label: 'Recent exports', icon: <ImageIcon size={15} /> }] },
  { group: 'Configure', items: [{ id: 'export-defaults', label: 'Export defaults', icon: <Download size={15} /> }, { id: 'editor-defaults', label: 'Editor defaults', icon: <SlidersHorizontal size={15} /> }, { id: 'branding', label: 'Branding', icon: <Palette size={15} /> }, { id: 'api', label: 'API & integrations', icon: <Command size={15} /> }] },
  { group: 'Account', items: [{ id: 'profile', label: 'Profile', icon: <Settings2 size={15} /> }, { id: 'github', label: 'Connected GitHub', icon: <GitHubIcon size={14} /> }, { id: 'notifications', label: 'Notifications', icon: <MessageCircle size={15} /> }, { id: 'billing', label: 'Billing', icon: <Star size={15} />, badge: 'Pro' }, { id: 'danger', label: 'Danger zone', icon: <TriangleAlert size={15} /> }] },
];
const ALL_PAGES = NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.group })));

type Confirm = { icon: ReactNode; title: string; desc: string; ok: string; run: () => void } | null;
type ToastFn = ReturnType<typeof useToasts>['toast'];

function Row({ title, desc, children }: { title: string; desc?: ReactNode; children?: ReactNode }) {
  return (
    <div className="set-row">
      <div style={{ minWidth: 0 }}>
        <div className="set-title">{title}</div>
        {desc && <div className="set-desc">{desc}</div>}
      </div>
      {children}
    </div>
  );
}

function Head({ eyebrow, title, desc, action }: { eyebrow: string; title: string; desc: string; action?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1 style={{ margin: '6px 0 0', fontFamily: 'var(--font-display)', fontSize: 28, lineHeight: '34px', fontWeight: 600, letterSpacing: '-0.03em' }}>{title}</h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--muted-foreground)' }}>{desc}</p>
      </div>
      {action}
    </div>
  );
}

function Thumb({ x, ratio = '16 / 9' }: { x: ExportItem; ratio?: string }) {
  return (
    <div style={{ position: 'relative', aspectRatio: ratio, borderRadius: 6, overflow: 'hidden', background: bgCss(x.bg), boxShadow: '0 8px 24px rgba(0,0,0,.35)', height: '100%', maxWidth: '100%' }}>
      <div style={{ position: 'absolute', left: '14%', right: '14%', top: '24%', bottom: 0, background: '#fff', borderRadius: '5px 5px 0 0', padding: '7px 8px', display: 'grid', gap: 4, alignContent: 'start' }}>
        <div style={{ height: 4, width: '50%', background: 'var(--primary)', borderRadius: 3 }} />
        <div style={{ height: 3, width: '90%', background: 'rgba(127,119,115,.25)', borderRadius: 3 }} />
        <div style={{ height: 3, width: '65%', background: 'rgba(127,119,115,.25)', borderRadius: 3 }} />
      </div>
    </div>
  );
}

export default function AccountPage() {
  const [page, setPage] = useState<PageId>('overview');
  const [local, setLocal] = useState<ExportItem[]>([]);
  const [removed, setRemoved] = useState<number[]>([]);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const { toasts, toast, dismiss } = useToasts();

  useEffect(() => {
    const sync = () => {
      const h = window.location.hash.slice(1) as PageId;
      if (ALL_PAGES.some((p) => p.id === h)) setPage(h);
    };
    sync();
    setLocal(loadExports());
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const go = (id: PageId) => {
    setPage(id);
    history.replaceState(null, '', `#${id}`);
  };

  const all = useMemo(() => [...local.map((x) => ({ ...x, ts: 1000 + x.ts })), ...DEMO_EXPORTS].filter((x) => !removed.includes(x.id)), [local, removed]);

  const removeExport = useCallback((x: ExportItem) => {
    setRemoved((r) => [...r, x.id]);
    try { localStorage.setItem(EXPORTS_KEY, JSON.stringify(loadExports().filter((y) => y.id !== x.id))); } catch { /* ignore */ }
    setConfirm(null);
    toast({ type: 'success', title: 'Export deleted', actionLabel: 'Undo', onAction: () => setRemoved((r) => r.filter((id) => id !== x.id)) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = ALL_PAGES.find((p) => p.id === page)!;
  const ctx = { toast, setConfirm, all, removeExport, go, clearAll: () => { setRemoved(all.map((x) => x.id)); try { localStorage.setItem(EXPORTS_KEY, '[]'); } catch { /* ignore */ } } };

  return (
    <div className="acct">
      <nav className="acct-rail">
        <Link href="/" aria-label="Pullsheets" style={{ marginBottom: 8 }}><LogoMark size={32} /></Link>
        <Button variant="ghost" size="icon" href="/editor" aria-label="Editor"><SlidersHorizontal size={16} /></Button>
        <Button variant="ghost" size="icon" active aria-label="Account"><LayoutGrid size={16} /></Button>
        <Button variant="ghost" size="icon" aria-label="Feedback"><MessageSquare size={16} /></Button>
        <span style={{ flex: 1 }} />
        <Avatar size={28} />
      </nav>

      <aside className="acct-side">
        <div style={{ padding: '14px 10px 6px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.02em' }}>Yash Saini</span>
          <span className="mono muted" style={{ fontSize: 12 }}>@yashksaini-coder</span>
        </div>
        {NAV.map((g) => (
          <div key={g.group}>
            <div className="side-label">{g.group}</div>
            {g.items.map((i) => (
              <button key={i.id} type="button" className="side-item" aria-current={page === i.id ? 'page' : undefined} onClick={() => go(i.id)}>
                {i.icon}
                <span>{i.label}</span>
                {(i.badge || i.id === 'exports') && <span className="side-badge">{i.id === 'exports' ? all.length : i.badge}</span>}
              </button>
            ))}
          </div>
        ))}
      </aside>

      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '0 20px', borderBottom: '1px solid var(--fg-a10)' }}>
          <span className="muted" style={{ marginRight: 'auto', fontSize: 12 }}>{current.group} / {current.label}</span>
          <Button size="sm" href="/editor"><WandSparkles size={14} />Open Editor</Button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '40px 32px 64px' }}>
          <div style={{ maxWidth: 880, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
            {page === 'overview' && <Overview {...ctx} />}
            {page === 'exports' && <Exports {...ctx} />}
            {page === 'export-defaults' && <ExportDefaults />}
            {page === 'editor-defaults' && <EditorDefaults />}
            {page === 'branding' && <Branding toast={toast} />}
            {page === 'api' && <Api toast={toast} setConfirm={setConfirm} />}
            {page === 'profile' && <Profile toast={toast} />}
            {page === 'github' && <GitHub toast={toast} setConfirm={setConfirm} />}
            {page === 'notifications' && <Notifications />}
            {page === 'billing' && <Billing toast={toast} setConfirm={setConfirm} />}
            {page === 'danger' && <Danger {...ctx} />}
          </div>
        </div>
      </main>

      <Dialog open={!!confirm} onClose={() => setConfirm(null)} icon={confirm?.icon} title={confirm?.title ?? ''} description={confirm?.desc ?? ''}>
        <Button variant="outline" onClick={() => setConfirm(null)}>Cancel</Button>
        <Button variant="destructive" onClick={() => confirm?.run()}>{confirm?.ok}</Button>
      </Dialog>
      <Toaster toasts={toasts} dismiss={dismiss} />
    </div>
  );
}

type Ctx = { toast: ToastFn; setConfirm: (c: Confirm) => void; all: ExportItem[]; removeExport: (x: ExportItem) => void; go: (id: PageId) => void; clearAll: () => void };

function Overview({ all, go, toast }: Ctx) {
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const flowTile = { width: 52, height: 52, borderRadius: 14, background: 'var(--fg-a6)', boxShadow: '0 0 0 1px var(--fg-a10)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } as const;
  return (
    <>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px 0 8px' }}>
        <span className="eyebrow">Account overview</span>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 36, lineHeight: '42px', fontWeight: 600, letterSpacing: '-0.03em' }}>{greet}, Yash.</h1>
        <p style={{ margin: 0, maxWidth: 520, fontSize: 15, lineHeight: 1.5, color: 'var(--muted-foreground)' }}>Your pull requests, exports and defaults in one place. Pick a PR below and it opens in the editor, styled with your defaults.</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
        <span style={flowTile}><GitHubIcon size={22} /></span><ArrowRight size={14} className="muted" />
        <span style={{ borderRadius: 16, boxShadow: '0 8px 24px rgba(232,69,43,.35)' }}><LogoMark size={56} /></span><ArrowRight size={14} className="muted" />
        <span style={flowTile}><XIcon size={20} /></span><ArrowRight size={14} className="muted" />
        <span style={flowTile}><LinkedInIcon size={20} /></span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
        {[
          { l: 'Exports', v: String(all.length), s: `${all.filter((x) => x.kind === 'video').length} clips · ${all.filter((x) => x.kind === 'image').length} images` },
          { l: 'Pull requests shared', v: '31', s: 'across 9 repositories' },
          { l: 'Plan', v: 'Pro', s: 'Unlimited exports · renews Oct 3' },
        ].map((c) => (
          <div key={c.l} className="card" style={{ padding: '16px 20px' }}>
            <div className="muted" style={{ fontSize: 12 }}>{c.l}</div>
            <div style={{ marginTop: 6, fontSize: 26, fontWeight: 600, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{c.v}</div>
            <div className="muted" style={{ marginTop: 2, fontSize: 12 }}>{c.s}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="row-between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--fg-a10)' }}>
          <div><div style={{ fontSize: 14, fontWeight: 600 }}>Recent pull requests</div><div className="muted" style={{ fontSize: 12 }}>From your connected GitHub account</div></div>
          <Button variant="ghost" size="sm" onClick={() => toast({ type: 'success', title: 'Pull requests up to date' })}><RefreshCw size={14} />Refresh</Button>
        </div>
        {RECENT_PRS.map((r) => (
          <div key={r.repo + r.number} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--fg-a6)' }}>
            <StatusPill status={r.status} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
              <div className="mono muted" style={{ fontSize: 12 }}>{r.repo.split('/')[1]} #{r.number} · {r.when}</div>
            </div>
            <Button variant="outline" size="sm" href={`/editor?pr=${encodeURIComponent(`https://github.com/${r.repo}/pull/${r.number}`)}`}>Create image<ArrowRight size={14} /></Button>
          </div>
        ))}
      </div>
      <div className="row-between">
        <div style={{ fontSize: 14, fontWeight: 600 }}>Latest exports</div>
        <Button variant="ghost" size="sm" onClick={() => go('exports')}>See all<ChevronRight size={14} /></Button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
        {all.slice(0, 4).map((x) => (
          <Link key={x.id} href="/editor" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ aspectRatio: '16 / 9' }}><Thumb x={x} /></div>
            <div style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.title}</div>
          </Link>
        ))}
      </div>
    </>
  );
}

function Exports({ all, toast, setConfirm, removeExport }: Ctx) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'all' | 'image' | 'video'>('all');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'title'>('newest');
  const q = query.trim().toLowerCase();
  const list = all
    .filter((x) => (kind === 'all' || x.kind === kind) && (!q || x.title.toLowerCase().includes(q) || x.repo.toLowerCase().includes(q)))
    .sort((a, b) => (sort === 'oldest' ? a.ts - b.ts : sort === 'title' ? a.title.localeCompare(b.title) : b.ts - a.ts));
  return (
    <>
      <Head eyebrow="Workspace" title="Recent exports." desc={`${all.length} exports · ${all.filter((x) => x.kind === 'video').length} clips · unlimited on Pro`} action={<Button size="sm" href="/editor"><Plus size={14} />New export</Button>} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}><Input inputSize="sm" placeholder="Search by title or repo" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        <div style={{ width: 220 }}><Segmented size="sm" value={kind} onChange={setKind} options={[{ id: 'all', label: 'All' }, { id: 'image', label: 'Images' }, { id: 'video', label: 'Clips' }]} /></div>
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort">
          <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option>
        </select>
      </div>
      {list.length === 0 && <div className="card muted" style={{ padding: 48, textAlign: 'center', fontSize: 14 }}>Nothing matches. Try another search or filter.</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 14 }}>
        {list.map((x) => (
          <div key={x.id} className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ position: 'relative', aspectRatio: '16 / 9', background: 'var(--fg-a4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
              <Thumb x={x} ratio={`${x.w} / ${x.h}`} />
              {x.kind === 'video' && <span style={{ position: 'absolute', top: 8, left: 8, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 9999, background: 'rgba(11,10,10,.7)', color: '#fff', fontSize: 10, fontWeight: 500 }}><Play size={10} />{x.dur.toFixed(1)}s</span>}
              <span className="mono" style={{ position: 'absolute', top: 8, right: 8, padding: '2px 7px', borderRadius: 9999, background: 'rgba(11,10,10,.7)', color: '#fff', fontSize: 10 }}>{x.format} · {x.scale}×</span>
            </div>
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><StatusPill status={x.status} /><span className="mono muted" style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.repo.split('/')[1]} #{x.number}</span></div>
              <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.35 }}>{x.title}</div>
              <span className="muted" style={{ fontSize: 11 }}>{x.platform} · {x.w}×{x.h} · {x.when}</span>
              <div style={{ display: 'flex', gap: 4, borderTop: '1px solid var(--fg-a8)', paddingTop: 8 }}>
                <Button variant="ghost" size="xs" href="/editor"><SlidersHorizontal size={12} />Open</Button>
                <Button variant="ghost" size="icon-xs" aria-label="Download" onClick={() => toast({ type: 'success', title: `Downloading ${x.format}`, description: `${x.w}×${x.h}` })}><Download size={13} /></Button>
                <Button variant="ghost" size="icon-xs" aria-label="Copy" onClick={() => toast({ type: 'success', title: 'Copied to clipboard' })}><Copy size={13} /></Button>
                <Button variant="ghost" size="icon-xs" aria-label="Share" onClick={() => toast({ type: 'info', title: 'Share link copied', description: `pullsheets.app/s/${(x.id % 99999).toString(36)}` })}><Share size={13} /></Button>
                <span style={{ flex: 1 }} />
                <Button variant="ghost" size="icon-xs" aria-label="Delete" style={{ color: 'var(--destructive)' }} onClick={() => setConfirm({ icon: <Trash2 size={16} />, title: 'Delete this export?', desc: `“${x.title}” is removed from your history. The posted image stays wherever you shared it.`, ok: 'Delete', run: () => removeExport(x) })}><Trash2 size={13} /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function ExportDefaults() {
  const [format, setFormat] = useState<'png' | 'jpg' | 'mp4' | 'gif'>('png');
  const [scale, setScale] = useState(2);
  const [platform, setPlatform] = useState('twitter');
  const [filename, setFilename] = useState('{repo}-pr{number}-{platform}');
  const [copy, setCopy] = useState(true);
  const [share, setShare] = useState(false);
  return (
    <>
      <Head eyebrow="Configure" title="Export defaults." desc="What the Save popover starts with. You can still change everything per export." />
      <div className="card">
        <Row title="Format" desc="Video formats need at least one clip."><div style={{ width: 260 }}><Segmented size="sm" value={format} onChange={setFormat} options={[{ id: 'png', label: 'PNG' }, { id: 'jpg', label: 'JPG' }, { id: 'mp4', label: 'MP4' }, { id: 'gif', label: 'GIF' }]} /></div></Row>
        <Row title="Scale" desc="Pro exports up to 5×."><div style={{ width: 260 }}><Slider label="Resolution" value={scale} min={1} max={5} onChange={setScale} display={`${scale}×`} /></div></Row>
        <Row title="Platform preset" desc="Sets the canvas size when the editor opens.">
          <select className="select" value={platform} onChange={(e) => setPlatform(e.target.value)} aria-label="Platform">
            <option value="twitter">X post · 1200×675</option><option value="linkedin">LinkedIn · 1200×627</option><option value="square">Instagram square</option><option value="portrait">Instagram portrait</option><option value="story">Story / Reel</option>
          </select>
        </Row>
        <Row title="File name" desc="Tokens: {repo} {number} {platform} {date}"><div style={{ width: 300 }}><Input inputSize="sm" mono value={filename} onChange={(e) => setFilename(e.target.value)} /></div></Row>
        <Row title="Copy to clipboard after export" desc="Handy for pasting straight into a post."><Switch checked={copy} onChange={setCopy} label="Copy after export" /></Row>
        <Row title="Open share sheet after export" desc="Offers X and LinkedIn right after saving."><Switch checked={share} onChange={setShare} label="Share after export" /></Row>
      </div>
    </>
  );
}

function EditorDefaults() {
  const [frame, setFrame] = useState<'safari' | 'chrome' | 'none'>('safari');
  const [chrome, setChrome] = useState<'light' | 'dark'>('dark');
  const [card, setCard] = useState<'light' | 'dark'>('light');
  const [bg, setBg] = useState('ember');
  const [shadow, setShadow] = useState<'none' | 'hug' | 'soft' | 'strong'>('soft');
  const [autosave, setAutosave] = useState(true);
  const [rulers, setRulers] = useState(false);
  const theme = [{ id: 'light' as const, label: 'Light' }, { id: 'dark' as const, label: 'Dark' }];
  return (
    <>
      <Head eyebrow="Configure" title="Editor defaults." desc="How a freshly imported pull request looks before you touch anything." />
      <div className="card">
        <Row title="Frame" desc="Browser chrome around the card."><div style={{ width: 240 }}><Segmented size="sm" value={frame} onChange={setFrame} options={[{ id: 'safari', label: 'Safari' }, { id: 'chrome', label: 'Chrome' }, { id: 'none', label: 'Plain' }]} /></div></Row>
        <Row title="Chrome theme"><div style={{ width: 180 }}><Segmented size="sm" value={chrome} onChange={setChrome} options={theme} /></div></Row>
        <Row title="Card theme" desc="The pull-request card itself."><div style={{ width: 180 }}><Segmented size="sm" value={card} onChange={setCard} options={theme} /></div></Row>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--fg-a8)' }}>
          <div className="set-title">Background</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,minmax(0,1fr))', gap: 8 }}>
            {BACKGROUNDS.filter((b) => ['ember', 'crimson', 'sunset', 'graphite', 'distortion', 'peach', 'mono', 'paper'].includes(b.key)).map((b) => <Tile key={b.key} label={b.label} selected={bg === b.key} onClick={() => setBg(b.key)} background={b.css} />)}
          </div>
        </div>
        <Row title="Shadow"><div style={{ width: 260 }}><Segmented size="sm" value={shadow} onChange={setShadow} options={[{ id: 'none', label: 'None' }, { id: 'hug', label: 'Hug' }, { id: 'soft', label: 'Soft' }, { id: 'strong', label: 'Strong' }]} /></div></Row>
        <Row title="Autosave drafts" desc="Keeps your last design in this browser."><Switch checked={autosave} onChange={setAutosave} label="Autosave" /></Row>
        <Row title="Show rulers"><Switch checked={rulers} onChange={setRulers} label="Rulers" /></Row>
      </div>
    </>
  );
}

function Branding({ toast }: { toast: ToastFn }) {
  const [badge, setBadge] = useState(true);
  const [text, setText] = useState('Made with Pullsheets');
  const [color, setColor] = useState('#E8452B');
  const [pos, setPos] = useState<'bl' | 'br' | 'tl' | 'tr'>('br');
  return (
    <>
      <Head eyebrow="Configure" title="Branding." desc="The corner badge on every export. Pro lets you make it yours or remove it." />
      <div className="card">
        <Row title="Show badge" desc="Always on for the Free plan."><Switch checked={badge} onChange={setBadge} label="Show badge" /></Row>
        <Row title="Badge text"><div style={{ width: 300 }}><Input inputSize="sm" value={text} onChange={(e) => setText(e.target.value)} /></div></Row>
        <Row title="Brand color" desc="Used for the badge dot and caption accents.">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Brand color" style={{ width: 32, height: 28, padding: 0, border: '1px solid var(--fg-a15)', borderRadius: 6, background: 'none' }} />
            <span className="mono" style={{ fontSize: 12 }}>{color.toUpperCase()}</span>
          </div>
        </Row>
        <Row title="Position"><div style={{ width: 320 }}><Segmented size="sm" value={pos} onChange={setPos} options={[{ id: 'bl', label: 'Bottom left' }, { id: 'br', label: 'Bottom right' }, { id: 'tl', label: 'Top left' }, { id: 'tr', label: 'Top right' }]} /></div></Row>
        <Row title="Logo" desc="SVG or PNG, replaces the dot. 512 px or larger.">
          <Button variant="outline" size="sm" onClick={() => toast({ type: 'info', title: 'Logo upload', description: 'Wire this to your storage bucket.' })}><Upload size={14} />Upload</Button>
        </Row>
      </div>
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}>
        <div style={{ width: 220, aspectRatio: '16 / 9', borderRadius: 8, background: 'var(--gradient-ember)', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ position: 'absolute', left: '20%', right: '20%', top: '28%', bottom: 0, background: '#fff', borderRadius: '5px 5px 0 0', boxShadow: 'var(--canvas-shadow-soft)' }} />
          {badge && (
            <div style={{ position: 'absolute', top: pos.startsWith('t') ? 5 : undefined, bottom: pos.startsWith('b') ? 5 : undefined, left: pos.endsWith('l') ? 6 : undefined, right: pos.endsWith('r') ? 6 : undefined, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px', borderRadius: 9999, background: 'rgba(11,10,10,.55)', color: 'rgba(255,255,255,.85)', fontSize: 7, fontWeight: 500 }}>
              <span style={{ width: 6, height: 6, borderRadius: 2, background: color }} />{text}
            </div>
          )}
        </div>
        <div><div className="set-title">Preview</div><div className="set-desc" style={{ lineHeight: 1.5 }}>How the badge sits on an X post. Position and color update live.</div></div>
      </div>
    </>
  );
}

function Api({ toast, setConfirm }: { toast: ToastFn; setConfirm: (c: Confirm) => void }) {
  const [keys, setKeys] = useState([
    { id: 1, name: 'CI renderer', prefix: 'pls_live_7f3a…c9e1', created: 'Aug 14', used: '3 hours ago' },
    { id: 2, name: 'Local dev', prefix: 'pls_test_0b2d…44aa', created: 'Sep 1', used: 'never' },
  ]);
  const [xOn, setXOn] = useState(true);
  const [liOn, setLiOn] = useState(false);
  const [webhook, setWebhook] = useState('');
  const create = () => {
    const id = Date.now();
    setKeys((k) => [...k, { id, name: `New key ${k.length + 1}`, prefix: `pls_live_${id.toString(36).slice(-4)}…${id.toString(36).slice(0, 4)}`, created: 'today', used: 'never' }]);
    toast({ type: 'success', title: 'Key created', description: 'Copy it now; it is shown once.' });
  };
  const integration = (icon: ReactNode, name: string, desc: string, right: ReactNode) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: '1px solid var(--fg-a6)' }}>
      <span style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--fg-a6)', boxShadow: '0 0 0 1px var(--fg-a10)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
      <div style={{ flex: 1 }}><div className="set-title">{name}</div><div className="set-desc">{desc}</div></div>
      {right}
    </div>
  );
  return (
    <>
      <Head eyebrow="Configure" title="API & integrations." desc="Render share cards from CI, or post straight from Pullsheets." />
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="row-between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--fg-a10)' }}>
          <div><div style={{ fontSize: 14, fontWeight: 600 }}>API keys</div><div className="set-desc">POST /v1/render with a PR URL, get a PNG back.</div></div>
          <Button size="sm" onClick={create}><Plus size={14} />Create key</Button>
        </div>
        {keys.map((k) => (
          <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: '1px solid var(--fg-a6)' }}>
            <Command size={14} className="muted" />
            <div style={{ flex: 1, minWidth: 0 }}><div className="set-title">{k.name}</div><div className="mono set-desc">{k.prefix} · created {k.created} · last used {k.used}</div></div>
            <Button variant="ghost" size="xs" onClick={() => toast({ type: 'success', title: 'Key copied' })}><Copy size={12} />Copy</Button>
            <Button variant="destructive" size="xs" onClick={() => setConfirm({ icon: <Trash2 size={16} />, title: `Revoke “${k.name}”?`, desc: 'Anything using this key stops working immediately.', ok: 'Revoke', run: () => { setKeys((l) => l.filter((x) => x.id !== k.id)); setConfirm(null); toast({ type: 'success', title: 'Key revoked' }); } })}>Revoke</Button>
          </div>
        ))}
      </div>
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--fg-a10)' }}><div style={{ fontSize: 14, fontWeight: 600 }}>Integrations</div><div className="set-desc">Connect once, post from the Save popover.</div></div>
        {integration(<GitHubIcon />, 'GitHub App', 'Reads pull requests · 9 repositories', <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--success)' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} />Connected</span>)}
        {integration(<XIcon size={15} />, 'X', 'Post images and clips as @yashksaini', <Button variant={xOn ? 'outline' : 'default'} size="sm" onClick={() => { setXOn(!xOn); toast({ type: 'success', title: xOn ? 'X disconnected' : 'X connected' }); }}>{xOn ? 'Disconnect' : 'Connect'}</Button>)}
        {integration(<LinkedInIcon size={15} />, 'LinkedIn', 'Post to your profile or a company page', <Button variant={liOn ? 'outline' : 'default'} size="sm" onClick={() => { setLiOn(!liOn); toast({ type: 'success', title: liOn ? 'LinkedIn disconnected' : 'LinkedIn connected' }); }}>{liOn ? 'Disconnect' : 'Connect'}</Button>)}
        {integration(<MessageSquare size={15} />, 'Slack', 'Drop every export into a channel', <Button variant="outline" size="sm" onClick={() => toast({ type: 'info', title: 'Slack is coming soon' })}>Connect</Button>)}
      </div>
      <div className="card"><Row title="Webhook" desc="We POST export events here as JSON."><div style={{ width: 340 }}><Input inputSize="sm" mono placeholder="https://" value={webhook} onChange={(e) => setWebhook(e.target.value)} /></div></Row></div>
    </>
  );
}

function Profile({ toast }: { toast: ToastFn }) {
  const [name, setName] = useState('Yash Saini');
  const [bio, setBio] = useState('Building Pullsheets. libp2p contributor, Rust and Python.');
  const [ghAvatar, setGhAvatar] = useState(true);
  const [pub, setPub] = useState(true);
  return (
    <>
      <Head eyebrow="Account" title="Profile." desc="Shown on your public gallery and in team workspaces." />
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20, borderBottom: '1px solid var(--fg-a8)' }}>
          <Avatar size={64} />
          <div style={{ flex: 1 }}><div className="set-title">Avatar</div><div className="set-desc">Synced from GitHub. Turn off to upload your own.</div></div>
          <span className="label-sm">Use GitHub avatar</span><Switch checked={ghAvatar} onChange={setGhAvatar} label="Use GitHub avatar" />
        </div>
        <div className="grid-2" style={{ gap: 16, padding: '16px 20px', borderBottom: '1px solid var(--fg-a8)' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span className="label">Display name</span><Input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span className="label">Handle</span><Input mono value="@yashksaini-coder" disabled /><span className="label-sm" style={{ fontSize: 11 }}>Follows your GitHub login.</span></label>
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '16px 20px', borderBottom: '1px solid var(--fg-a8)' }}>
          <span className="label">Bio</span>
          <textarea className="input" rows={3} maxLength={160} value={bio} onChange={(e) => setBio(e.target.value)} />
          <span className="label-sm" style={{ fontSize: 11 }}>{bio.length} / 160</span>
        </label>
        <Row title="Public gallery" desc="pullsheets.app/@yashksaini-coder lists your exports."><Switch checked={pub} onChange={setPub} label="Public gallery" /></Row>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 20px' }}>
          <Button variant="ghost" size="sm" onClick={() => { setName('Yash Saini'); setBio('Building Pullsheets. libp2p contributor, Rust and Python.'); }}>Discard</Button>
          <Button size="sm" onClick={() => toast({ type: 'success', title: 'Profile saved' })}>Save changes</Button>
        </div>
      </div>
    </>
  );
}

function GitHub({ toast, setConfirm }: { toast: ToastFn; setConfirm: (c: Confirm) => void }) {
  const [access, setAccess] = useState<'all' | 'selected'>('selected');
  const [repos, setRepos] = useState([
    { name: 'PullSheets', prs: 12, on: true }, { name: 'git-graph', prs: 48, on: true }, { name: 'gitwatch-v2', prs: 7, on: true }, { name: 'Rustlens', prs: 31, on: false }, { name: 'opportunity-radar', prs: 23, on: true },
  ]);
  return (
    <>
      <Head eyebrow="Account" title="Connected GitHub." desc="Pullsheets reads pull-request metadata only. It never writes to your repositories." />
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderBottom: '1px solid var(--fg-a8)' }}>
          <span style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--fg-a6)', boxShadow: '0 0 0 1px var(--fg-a10)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><GitHubIcon size={20} /></span>
          <div style={{ flex: 1 }}><div className="set-title">yashksaini-coder</div><div className="set-desc">Connected Sep 2, 2026 · read:user, repo:read</div></div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--success)' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} />Connected</span>
        </div>
        <Row title="Repository access" desc="Which pull requests show up in Recent."><div style={{ width: 260 }}><Segmented size="sm" value={access} onChange={setAccess} options={[{ id: 'all', label: 'All repositories' }, { id: 'selected', label: 'Selected only' }]} /></div></Row>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--fg-a8)' }}>
          {repos.map((r, i) => (
            <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
              <GitBranch size={14} className="muted" />
              <span className="mono" style={{ flex: 1, fontSize: 14 }}>{r.name}</span>
              <span className="label-sm">{r.prs} PRs</span>
              <Switch checked={r.on} onChange={(v) => setRepos((l) => l.map((x, j) => (j === i ? { ...x, on: v } : x)))} label={`Include ${r.name}`} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 20px' }}>
          <Button variant="outline" size="sm" onClick={() => toast({ type: 'loading', title: 'Reconnecting to GitHub…' })}><RefreshCw size={14} />Reconnect</Button>
          <Button variant="destructive" size="sm" onClick={() => setConfirm({ icon: <GitHubIcon />, title: 'Disconnect GitHub?', desc: 'Recent pull requests stop syncing and private repos need a fresh sign-in. Your exports stay.', ok: 'Disconnect', run: () => { setConfirm(null); toast({ type: 'info', title: 'GitHub disconnected' }); } })}>Disconnect</Button>
        </div>
      </div>
    </>
  );
}

function Notifications() {
  const [delivery, setDelivery] = useState<'email' | 'app' | 'both'>('both');
  const [s, setS] = useState({ exp: true, merged: true, digest: false, product: true });
  const toggle = (k: keyof typeof s) => (v: boolean) => setS((p) => ({ ...p, [k]: v }));
  return (
    <>
      <Head eyebrow="Account" title="Notifications." desc="Only what helps you post. Nothing else." />
      <div className="card">
        <Row title="Delivery"><div style={{ width: 220 }}><Segmented size="sm" value={delivery} onChange={setDelivery} options={[{ id: 'email', label: 'Email' }, { id: 'app', label: 'In-app' }, { id: 'both', label: 'Both' }]} /></div></Row>
        <Row title="Video export finished" desc="Renders can take a minute; we'll ping you."><Switch checked={s.exp} onChange={toggle('exp')} label="Export finished" /></Row>
        <Row title="Merged PR nudge" desc="A reminder when one of your PRs merges."><Switch checked={s.merged} onChange={toggle('merged')} label="Merged nudge" /></Row>
        <Row title="Weekly digest" desc="Your shared PRs and how the posts did."><Switch checked={s.digest} onChange={toggle('digest')} label="Weekly digest" /></Row>
        <Row title="Product updates" desc="New frames, backgrounds and features. Monthly at most."><Switch checked={s.product} onChange={toggle('product')} label="Product updates" /></Row>
      </div>
    </>
  );
}

function Billing({ toast, setConfirm }: { toast: ToastFn; setConfirm: (c: Confirm) => void }) {
  const portal = () => toast({ type: 'info', title: 'Opening billing portal', description: 'Stripe customer portal goes here.' });
  return (
    <>
      <Head eyebrow="Account" title="Billing." desc="You're on Pro. It renews on Oct 3, 2026 for $8." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
        {[
          { n: 'Free', p: '$0', f: ['20 exports a month', 'PNG and JPG up to 2×', 'Pullsheets badge'], cta: 'Downgrade', v: 'outline' as const, act: () => setConfirm({ icon: <TriangleAlert size={16} />, title: 'Downgrade to Free?', desc: 'You keep Pro until Oct 3. After that exports cap at 20 a month and the badge returns.', ok: 'Downgrade', run: () => { setConfirm(null); toast({ type: 'info', title: 'Downgrade scheduled for Oct 3' }); } }) },
          { n: 'Pro', p: '$8', f: ['Unlimited exports, up to 5×', 'Video export, MP4 and GIF', 'Your badge or none', 'Post to X and LinkedIn'], cta: 'Manage subscription', v: 'secondary' as const, act: portal, current: true },
          { n: 'Team', p: '$24', f: ['Everything in Pro, 5 seats', 'Shared brand kit and templates', 'Team export history'], cta: 'Upgrade to Team', v: 'default' as const, act: () => toast({ type: 'success', title: 'Team plan', description: 'Checkout opens here.' }) },
        ].map((plan) => (
          <div key={plan.n} style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 20, borderRadius: 12, background: 'var(--card)', boxShadow: plan.current ? 'var(--card-edge-shadow),0 0 0 1px var(--primary),0 0 32px rgba(232,69,43,.12)' : 'var(--card-edge-shadow),0 0 0 1px var(--fg-a10)' }}>
            <div className="row-between" style={{ alignItems: 'baseline' }}>
              <span style={{ fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8 }}>{plan.n}{plan.current && <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '.04em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 9999, background: 'var(--primary)', color: '#fff' }}>Current</span>}</span>
              <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em' }}>{plan.p}<span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>/mo</span></span>
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: plan.current ? 'var(--foreground)' : 'var(--muted-foreground)' }}>
              {plan.f.map((f) => <li key={f}><span style={{ color: plan.current ? 'var(--primary)' : undefined }}>✓</span> {f}</li>)}
            </ul>
            <div style={{ marginTop: 'auto' }}><Button variant={plan.v} size="sm" fullWidth onClick={plan.act}>{plan.cta}</Button></div>
          </div>
        ))}
      </div>
      <div className="card">
        <Row title="Payment method" desc={<span className="mono">Visa ···· 4242 · exp 08/28</span>}><Button variant="outline" size="sm" onClick={portal}>Update</Button></Row>
        <div style={{ padding: '16px 20px 6px' }} className="set-title">Invoices</div>
        {['Sep 3, 2026', 'Aug 3, 2026', 'Jul 3, 2026'].map((date) => (
          <div key={date} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 16, alignItems: 'center', padding: '10px 20px', borderTop: '1px solid var(--fg-a6)', fontSize: 13 }}>
            <span>{date}</span><span className="muted">Pro · monthly</span><span className="mono">$8.00</span>
            <Button variant="ghost" size="xs" onClick={() => toast({ type: 'success', title: 'Invoice downloading' })}><Download size={12} />PDF</Button>
          </div>
        ))}
      </div>
    </>
  );
}

function Danger({ all, setConfirm, toast, clearAll }: Ctx) {
  return (
    <>
      <Head eyebrow="Account" title="Danger zone." desc="These can't be undone. Each one asks you to confirm." />
      <div className="card" style={{ boxShadow: 'var(--card-edge-shadow),0 0 0 1px color-mix(in oklab,var(--destructive) 30%,transparent)' }}>
        <Row title="Delete all exports" desc={`Removes ${all.length} images and clips from your history.`}>
          <Button variant="destructive" size="sm" onClick={() => setConfirm({ icon: <Trash2 size={16} />, title: 'Delete all exports?', desc: `All ${all.length} images and clips are removed from your history. This cannot be undone.`, ok: 'Delete everything', run: () => { clearAll(); setConfirm(null); toast({ type: 'success', title: 'Export history cleared' }); } })}>Delete exports</Button>
        </Row>
        <Row title="Revoke all API keys" desc="CI jobs using them will start failing.">
          <Button variant="destructive" size="sm" onClick={() => setConfirm({ icon: <Command size={16} />, title: 'Revoke all API keys?', desc: 'Every integration and CI job using them stops immediately.', ok: 'Revoke all', run: () => { setConfirm(null); toast({ type: 'success', title: 'All keys revoked' }); } })}>Revoke keys</Button>
        </Row>
        <Row title="Delete account" desc="Cancels Pro, deletes exports and disconnects GitHub.">
          <Button variant="destructive" size="sm" onClick={() => setConfirm({ icon: <TriangleAlert size={16} />, title: 'Delete your account?', desc: 'Cancels Pro, deletes every export and disconnects GitHub. We keep nothing.', ok: 'Delete account', run: () => { window.location.href = '/'; } })}>Delete account</Button>
        </Row>
      </div>
    </>
  );
}
