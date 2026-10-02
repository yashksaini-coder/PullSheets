'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Clock, Copy, Download, GitMerge, GitPullRequest, Globe, Grid2x2, Image as ImageIcon, Layers, Link2, Palette, Plus, Ratio, Redo2, Ruler, SlidersHorizontal, Smartphone, Star, Undo2, Upload, WandSparkles } from 'lucide-react';
import { Avatar, BetaBar, Button, Logo, Segmented, StatusPill } from '@/components/ui';
import { GitHubIcon, LinkedInIcon, XIcon } from '@/components/brand-icons';
import { BACKGROUNDS } from '@/lib/data';
import { Card, SAMPLE_FACTS } from '@/components/cards';
import { CardScaler } from '@/components/editor/CardScaler';

const MODE_OPTIONS = [
  { id: 'image', label: 'Image', icon: <ImageIcon size={12} /> },
  { id: 'browser', label: 'Browser', icon: <Globe size={12} /> },
  { id: 'device', label: 'Device', icon: <Smartphone size={12} /> },
] as const;
const TAB_OPTIONS = [
  { id: 'edit', label: 'Design', icon: <SlidersHorizontal size={12} /> },
  { id: 'bg', label: 'BG', icon: <Palette size={12} /> },
  { id: 'layers', label: 'Layers', icon: <Layers size={12} /> },
] as const;

const FAQ = [
  { q: 'Do I need an account?', a: 'You sign in with GitHub. That is what lets Pullsheets read your pull requests, keep your export history and remember your defaults. Public PRs pasted by link render without extra permissions.' },
  { q: 'Which platforms are the presets for?', a: 'X posts, LinkedIn posts, Instagram square and portrait, Stories and Reels, plus custom sizes up to 2560 px wide.' },
  { q: 'Is my pull-request data stored?', a: 'Pullsheets reads PR metadata from the GitHub API when you import and renders in your browser. Only the exported image and its settings are saved to your account, and you can delete them any time.' },
  { q: 'Can I export video?', a: 'Yes, on Pro and Team. Add entrance, camera or emphasis clips in the Motion panel and export up to 10 seconds as MP4 or GIF.' },
];

const PLANS = [
  { name: 'Free', price: '$0', unit: 'forever', blurb: 'For sharing the occasional PR.', features: ['20 exports a month', 'PNG and JPG up to 2×', 'All frames, backgrounds and 3D presets', 'Small “Made with Pullsheets” badge'], cta: 'Start free', href: '/login', featured: false },
  { name: 'Pro', price: '$8', unit: 'per month', blurb: 'For developers and maintainers who post every week.', features: ['Unlimited exports', 'Up to 5× resolution', 'Video export, MP4 and GIF', 'Your own badge or none', 'Post directly to X and LinkedIn'], cta: 'Upgrade to Pro', href: '/account#billing', featured: true },
  { name: 'Team', price: '$24', unit: 'per month · 5 seats', blurb: 'For DevRel and engineering teams with a brand to keep.', features: ['Everything in Pro', 'Shared brand kit and templates', 'Team export history', 'Priority support'], cta: 'Talk to us', href: '#faq', featured: false },
];

const sectionLabel = { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '.04em', color: 'var(--muted-foreground)', padding: '6px 4px 0' };

export default function LandingPage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [open, setOpen] = useState<number | null>(0);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const u = url.trim();
    router.push('/editor' + (u ? `?pr=${encodeURIComponent(u)}` : ''));
  };

  return (
    <div style={{ minHeight: '100vh', overflowX: 'clip' }}>
      <BetaBar />
      <div style={{ position: 'relative', isolation: 'isolate' }}>
        <div aria-hidden="true" style={{ pointerEvents: 'none', position: 'absolute', inset: '0 0 auto 0', height: 'min(920px,100svh)', overflow: 'hidden', zIndex: 0 }}>
          <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 'min(720px,70%)', opacity: 0.28, maskImage: 'linear-gradient(90deg,transparent 0%,black 28%,black 100%)', background: 'repeating-linear-gradient(118deg,transparent 0 34px,rgba(232,69,43,.55) 34px 36px,transparent 36px 90px),radial-gradient(70% 60% at 70% 30%,rgba(232,69,43,.35),transparent 70%)' }} />
        </div>

        <nav style={{ position: 'sticky', top: 0, zIndex: 50, margin: '0 auto', width: '100%', maxWidth: 1152, padding: '8px 0' }}>
          <div className="nav-glass">
            <Logo />
            <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
              <a href="#features" className="nav-link">Product</a>
              <a href="#pricing" className="nav-link">Pricing</a>
              <a href="#faq" className="nav-link">FAQ</a>
            </div>
            <div style={{ justifySelf: 'end', display: 'flex', alignItems: 'center', gap: 8 }}>
              <a href="https://github.com/yashksaini-coder/PullSheets" className="btn btn-ghost btn-sm hide-sm" style={{ color: 'var(--foreground)' }}>
                <Star size={14} /> <span className="mono" style={{ fontVariantNumeric: 'tabular-nums' }}>312</span>
              </a>
              <Button size="sm" href="/login">Sign in</Button>
            </div>
          </div>
        </nav>

        <main style={{ position: 'relative', zIndex: 10, padding: '112px 0 80px' }}>
          <div style={{ margin: '0 auto', maxWidth: 1152, padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <h1 style={{ margin: 0, maxWidth: 820, fontFamily: 'var(--font-display)', fontSize: 'clamp(44px,7vw,72px)', lineHeight: 1.08, fontWeight: 600, letterSpacing: '-0.035em' }}>
              <span style={{ display: 'block', overflow: 'hidden' }}><span className="rise" style={{ display: 'block' }}>Don&apos;t just merge it.</span></span>
              <span style={{ display: 'block', overflow: 'hidden' }}><span className="rise" style={{ display: 'block', color: 'var(--primary)', animationDelay: '.075s' }}>Post it.</span></span>
            </h1>
            <p className="fade" style={{ margin: '24px auto 0', maxWidth: 560, fontSize: 17, lineHeight: 1.5, color: 'var(--muted-foreground)', animationDelay: '.42s' }}>
              Turn any pull request into a post people stop for. Paste the link, pick a frame, and it&apos;s ready for X, LinkedIn or Instagram in ten seconds.
            </p>
            <p className="fade" style={{ margin: '14px 0 0', fontSize: 13, color: 'var(--muted-foreground)', animationDelay: '.5s' }}>Public repos work right away · Sign in with GitHub for private ones</p>

            <div className="fade" style={{ marginTop: 48, position: 'relative', width: '100%', maxWidth: 960, animationDelay: '.62s' }}>
              <div style={{ position: 'absolute', inset: '-60px -40px', background: 'radial-gradient(55% 55% at 50% 50%,rgba(232,69,43,.16),transparent 70%)', pointerEvents: 'none' }} />
              <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: 'var(--background)', boxShadow: 'var(--preview-shell-shadow),0 0 0 1px var(--fg-a10)', textAlign: 'left' }}>
                <div style={{ height: 44, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12, padding: '0 14px', borderBottom: '1px solid var(--fg-a10)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <Logo size={22} small />
                    <span className="divider-v hide-sm" />
                    <span className="hide-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted-foreground)' }}><WandSparkles size={13} />Templates</span>
                  </div>
                  <div className="hide-sm" style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--muted-foreground)' }}>
                    <Undo2 size={14} /><Redo2 size={14} style={{ opacity: 0.4 }} />
                    <span className="divider-v" />
                    <Ruler size={14} /><Grid2x2 size={14} />
                    <span className="divider-v" />
                    <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 26, padding: '0 8px', borderRadius: 6, boxShadow: '0 0 0 1px var(--fg-a10)', fontSize: 11, color: 'var(--foreground)' }}><Ratio size={13} />1200 × 675</span>
                    <span className="divider-v" />
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11 }}><Copy size={13} />Copy</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 26, padding: '0 10px', borderRadius: 6, background: 'var(--primary)', color: '#fff', fontSize: 11, fontWeight: 500 }}><Download size={13} />Save</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, color: 'var(--muted-foreground)', fontSize: 11 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Clock size={13} />Exports</span>
                    <Avatar size={24} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(170px,210px) 1fr', minHeight: 420 }}>
                  <div style={{ borderRight: '1px solid var(--fg-a10)', padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
                    <Segmented size="sm" value="browser" options={[...MODE_OPTIONS]} />
                    <Segmented size="sm" value="edit" options={[...TAB_OPTIONS]} />
                    <div style={sectionLabel}><GitPullRequest size={12} />Pull request</div>
                    {[{ i: <GitMerge size={12} />, t: 'Share-card renderer', n: '#12' }, { i: <GitPullRequest size={12} />, t: 'WebP export', n: '#48' }].map((r) => (
                      <div key={r.n} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, background: 'var(--fg-a4)', border: '1px solid var(--fg-a8)', fontSize: 11 }}>
                        <span style={{ color: 'var(--muted-foreground)', display: 'inline-flex' }}>{r.i}</span>
                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.t}</span>
                        <span className="mono" style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>{r.n}</span>
                      </div>
                    ))}
                    <div style={sectionLabel}><Palette size={12} />Background</div>
                    <div className="grid-4" style={{ gap: 6 }}>
                      {BACKGROUNDS.filter((b) => ['ember', 'sunset', 'graphite', 'peach'].includes(b.key)).map((b, i) => (
                        <div key={b.key} style={{ aspectRatio: '1', borderRadius: 8, background: b.css, boxShadow: i === 0 ? '0 0 0 1px var(--fg-a25)' : undefined }} />
                      ))}
                    </div>
                  </div>
                  <div className="dot-grid" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 28, minWidth: 0 }}>
                    <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: 10, overflow: 'hidden', background: 'var(--gradient-ember)', boxShadow: '0 0 0 1px var(--fg-a10),0 24px 48px rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%', maxWidth: 440 }}>
                        <CardScaler nativeWidth={420}>
                          <Card family="midnight" format="standard" facts={SAMPLE_FACTS} />
                        </CardScaler>
                        <form onSubmit={submit} className="url-pill">
                          <Link2 size={14} style={{ color: 'rgba(255,255,255,.7)', flexShrink: 0 }} />
                          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="github.com/owner/repo/pull/482" aria-label="Pull request URL" />
                          <button type="submit" className="round-go" aria-label="Create image"><ArrowRight size={15} /></button>
                        </form>
                      </div>
                    </div>
                    <div style={{ position: 'absolute', top: 10, right: 12, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--muted-foreground)' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} />Draft saved</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <section id="features" style={{ padding: '112px 24px 16px' }}>
        <div style={{ margin: '0 auto', maxWidth: 1152 }}>
          <h2 className="landing-heading" style={{ marginBottom: 56, textAlign: 'center', fontSize: 'clamp(32px,4.5vw,44px)', lineHeight: 1.14 }}>
            <span style={{ display: 'block' }}>Everything you need.</span>
            <span style={{ display: 'block' }}>Nothing you don&apos;t.</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '.5em', fontSize: 'clamp(1rem,.9rem + .5vw,1.25rem)' }}>
            <Bento span label="Import" title="Paste a link or pick a PR" desc="Any public pull request by URL, or your recent PRs once you sign in.">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="mono" style={{ height: 32, padding: '0 10px', borderRadius: 6, background: 'var(--fg-a4)', border: '1px solid var(--fg-a10)', fontSize: 12, color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>github.com/yashksaini-coder/PullSheets/pull/12</span>
                  <span style={{ color: 'var(--primary)', fontFamily: 'var(--font-sans)', fontWeight: 500 }}>Import</span>
                </div>
                {[{ s: 'open' as const, t: 'Export contribution graph as WebP', r: 'git-graph #48' }, { s: 'draft' as const, t: 'Realtime issue feed via SSE', r: 'gitwatch-v2 #7' }].map((r) => (
                  <div key={r.r} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6, background: 'var(--fg-a4)', fontSize: 12 }}>
                    <StatusPill status={r.s} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.t}</span>
                    <span className="mono" style={{ color: 'var(--muted-foreground)', fontSize: 11 }}>{r.r}</span>
                  </div>
                ))}
              </div>
            </Bento>
            <Bento label="Frames" title="Browser & device frames" desc="Safari, Chrome, plain, MacBook, iPhone.">
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '80%', borderRadius: 6, overflow: 'hidden', boxShadow: 'var(--canvas-shadow-hug)', transform: 'rotate(-3deg)' }}>
                  <div style={{ height: 16, background: '#3A3A3C', display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px' }}>{['#ff5f57', '#febc2e', '#28c840'].map((c) => <span key={c} style={{ width: 5, height: 5, borderRadius: '50%', background: c }} />)}</div>
                  <div style={{ height: 52, background: '#fff', padding: 8, display: 'grid', gap: 5 }}><div style={{ height: 5, width: '60%', borderRadius: 3, background: 'var(--primary)' }} /><div style={{ height: 5, width: '90%', borderRadius: 3, background: 'rgba(0,0,0,.08)' }} /><div style={{ height: 5, width: '45%', borderRadius: 3, background: 'rgba(0,0,0,.08)' }} /></div>
                </div>
              </div>
            </Bento>
            <Bento label="Depth" title="3D transforms" desc="Six layout presets plus a tilt joystick and fine-tune sliders.">
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, perspective: 400 }}>
                {['rotateY(22deg)', 'rotateX(14deg)', 'rotateY(-22deg)'].map((t, i) => <div key={t} style={{ width: 44, height: 34, borderRadius: 4, background: 'var(--fg-a20)', border: '1px solid var(--fg-a25)', transform: t, opacity: i === 1 ? 0.8 : 0.5 }} />)}
              </div>
            </Bento>
            <Bento span label="Style" title="Backgrounds, shadows, glass" desc="16 backgrounds, four shadow presets, six frame styles and 3D overlay shapes.">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 8 }}>
                {BACKGROUNDS.map((b) => <div key={b.key} style={{ aspectRatio: '1', borderRadius: 8, background: b.css }} />)}
              </div>
            </Bento>
            <Bento label="Motion" title="Short clips" desc="Entrances, camera moves and emphasis, exported as MP4 or GIF.">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['Zoom in', 'Ken Burns', 'Tilt'].map((c, i) => <span key={c} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 9999, border: '1px solid var(--fg-a15)', background: i === 1 ? 'var(--primary-a15)' : 'var(--fg-a4)', color: i === 1 ? 'var(--primary)' : 'var(--muted-foreground)' }}>{c}</span>)}
                </div>
                <div style={{ position: 'relative', height: 40, borderRadius: 6, background: 'var(--fg-a4)', border: '1px solid var(--fg-a10)' }}>
                  <div style={{ position: 'absolute', top: 6, bottom: 6, left: '4%', width: '30%', borderRadius: 4, background: 'var(--primary-a20)', border: '1px solid var(--primary)' }} />
                  <div style={{ position: 'absolute', top: 6, bottom: 6, left: '36%', width: '40%', borderRadius: 4, background: 'var(--primary-a20)', border: '1px solid var(--primary)' }} />
                </div>
              </div>
            </Bento>
            <Bento label="Export" title="Post-ready output" desc="PNG, JPG or video up to 5×. Copy, download or post to X and LinkedIn.">
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 8 }}>
                {[22, 34, 46, 58, 72].map((h, i) => <div key={h} style={{ width: 30, height: h, borderRadius: 4, background: i === 4 ? 'var(--primary)' : 'var(--fg-a15)' }} />)}
              </div>
            </Bento>
          </div>
        </div>
      </section>

      <section aria-label="How it works" style={{ padding: '48px 24px 80px' }}>
        <div style={{ margin: '0 auto', maxWidth: 1152, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 }}>
          {[
            { i: <Link2 size={20} />, t: 'Paste a PR link.', d: 'Or pick one of your recent pull requests. Title, status, diff stats and checks come along.' },
            { i: <SlidersHorizontal size={20} />, t: 'Pick a frame.', d: 'Browser or device, background, shadow, a caption, a 3D tilt if you like.' },
            { i: <Upload size={20} />, t: 'Post it.', d: 'Export sized for X, LinkedIn or Instagram, or post straight from Pullsheets.' },
          ].map((s) => (
            <div key={s.t} style={{ display: 'flex', flexDirection: 'column', borderRadius: 16, background: 'var(--card)', padding: '16px 20px' }}>
              {s.i}
              <h3 style={{ margin: '12px 0 0', fontSize: 14, lineHeight: '20px', fontWeight: 600 }}>{s.t}</h3>
              <p style={{ margin: '6px 0 0', fontSize: 14, lineHeight: '20px', color: 'var(--muted-foreground)' }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" style={{ padding: '64px 24px 96px' }}>
        <div style={{ margin: '0 auto', maxWidth: 1152 }}>
          <h2 className="landing-heading" style={{ marginBottom: 48, textAlign: 'center', fontSize: 'clamp(32px,4.5vw,44px)', lineHeight: 1.14 }}>
            <span style={{ display: 'block' }}>Simple pricing.</span>
            <span style={{ display: 'block' }}>Cancel anytime.</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12 }}>
            {PLANS.map((p) => (
              <div key={p.name} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 20, padding: 28, borderRadius: 16, background: 'var(--card)', boxShadow: p.featured ? 'var(--card-edge-shadow),0 0 0 1px var(--primary),0 0 40px rgba(232,69,43,.15)' : 'var(--card-edge-shadow),0 0 0 1px var(--fg-a10)' }}>
                {p.featured && <span style={{ position: 'absolute', top: -12, left: 28, fontSize: 11, fontWeight: 500, letterSpacing: '.04em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 9999, background: 'var(--primary)', color: '#fff' }}>Most popular</span>}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{p.price}</span>
                    <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>{p.unit}</span>
                  </div>
                  <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.5, color: 'var(--muted-foreground)' }}>{p.blurb}</p>
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
                  {p.features.map((f) => <li key={f} style={{ display: 'flex', gap: 10 }}><span style={{ color: p.featured ? 'var(--primary)' : 'var(--muted-foreground)' }}>✓</span>{f}</li>)}
                </ul>
                <div style={{ marginTop: 'auto' }}>
                  <Button size="lg" variant={p.featured ? 'default' : 'outline'} fullWidth href={p.href}>{p.cta}</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" style={{ padding: '64px 24px 96px' }}>
        <div style={{ margin: '0 auto', display: 'flex', maxWidth: 1152, gap: 64, flexWrap: 'wrap' }}>
          <div style={{ position: 'sticky', top: 128, height: 'fit-content', flex: '1 1 280px', minWidth: 0 }}>
            <h2 className="landing-heading" style={{ fontSize: 'clamp(32px,4.5vw,44px)', lineHeight: 1.14 }}>
              <span style={{ display: 'block' }}>Common</span>
              <span style={{ display: 'block' }}>Questions.</span>
            </h2>
            <p style={{ margin: '20px 0 0', maxWidth: 300, fontSize: 16, lineHeight: 1.625, color: 'var(--muted-foreground)' }}>Quick answers about Pullsheets, accounts, exports and your data.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: '2 1 420px', minWidth: 0 }}>
            {FAQ.map((f, i) => (
              <div key={f.q} className="faq-row">
                <button type="button" className="faq-q" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                  <span style={{ fontSize: 17, lineHeight: 1.375, fontWeight: 600, letterSpacing: '-0.02em' }}>{f.q}</span>
                  <span className="faq-plus" style={{ transform: open === i ? 'rotate(45deg)' : 'none' }}><Plus size={16} /></span>
                </button>
                {open === i && <div style={{ maxWidth: 768, padding: '0 24px 24px', fontSize: 15, lineHeight: 1.625, color: 'var(--muted-foreground)' }}>{f.a}</div>}
              </div>
            ))}
            <div className="card" style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', borderRadius: 16, padding: 28 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>Ready to post?</h3>
                <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--muted-foreground)' }}>Your next merged PR deserves better than a cropped screenshot.</p>
              </div>
              <Button size="lg" href="/editor">Open Editor</Button>
            </div>
          </div>
        </div>
      </section>

      <footer style={{ padding: '16px 24px 40px' }}>
        <div className="card" style={{ margin: '0 auto', maxWidth: 1152, borderRadius: 16, padding: '40px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Logo size={36} />
            <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.03em', color: 'var(--muted-foreground)' }}>
              <span style={{ color: 'var(--foreground)' }}>Pull-request images</span> you can post.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <a className="social" href="https://x.com/" target="_blank" rel="noopener noreferrer" aria-label="X"><XIcon size={15} /></a>
              <a className="social" href="https://github.com/yashksaini-coder" target="_blank" rel="noopener noreferrer" aria-label="GitHub"><GitHubIcon size={16} /></a>
              <a className="social" href="https://www.linkedin.com/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><LinkedInIcon size={15} /></a>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--muted-foreground)' }}>© 2026 Pullsheets</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Bento({ label, title, desc, span, children }: { label: string; title: string; desc: string; span?: boolean; children: ReactNode }) {
  return (
    <div className="bento-card" style={span ? { gridColumn: 'span 2' } : undefined}>
      <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>{label}</span>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '12px 0', minHeight: 0, overflow: 'hidden' }}>{children}</div>
      <div>
        <h3 style={{ margin: '0 0 5px', fontWeight: 600, fontSize: 14, letterSpacing: '-0.02em' }}>{title}</h3>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: 'var(--muted-foreground)' }}>{desc}</p>
      </div>
    </div>
  );
}
