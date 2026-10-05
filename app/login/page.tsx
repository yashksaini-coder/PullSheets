import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, ChevronLeft } from 'lucide-react';
import { BetaBar, Logo, LogoMark } from '@/components/ui';
import { BitbucketIcon, GitHubIcon, GitLabIcon, LinkedInIcon, XIcon } from '@/components/brand-icons';
import { SignInGitHub } from '@/components/auth/SignInGitHub';
import { safeNextPath } from '@/lib/auth/safe-next';
import { getSession } from '@/lib/auth/session';
import { features } from '@/lib/env';

const tile = { width: 60, height: 60, borderRadius: 14, background: 'var(--fg-a6)', boxShadow: '0 0 0 1px var(--fg-a10)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } as const;
const altBtn = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, height: 44, borderRadius: 6, background: 'var(--fg-a4)', boxShadow: '0 0 0 1px var(--fg-a15)', color: 'var(--foreground)', fontSize: 14, fontWeight: 500 } as const;
const altBtnOff = { ...altBtn, opacity: 0.5, pointerEvents: 'none' } as const;

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next: raw, error } = await searchParams;
  const next = safeNextPath(raw);
  const session = await getSession();
  if (session) redirect(next);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <BetaBar />
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,440px),1fr))' }}>
        <section style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '32px 40px', minHeight: 420, backgroundColor: 'var(--background)', backgroundImage: 'radial-gradient(55% 45% at 28% 30%,rgba(232,69,43,.28),transparent 65%),radial-gradient(45% 50% at 78% 78%,rgba(232,69,43,.14),transparent 60%),radial-gradient(rgba(232,228,225,.12) 1px,transparent 1.2px)', backgroundSize: '100% 100%,100% 100%,22px 22px', backgroundPosition: '0 0,0 0,11px 11px' }}>
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 75% 65% at 50% 50%,transparent 45%,var(--background) 100%)' }} />
          <div style={{ position: 'relative' }}><Logo /></div>
          <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, textAlign: 'center', padding: '40px 0' }}>
            <div className="eyebrow fade">From pull request to post</div>
            <div className="fade" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 24px', borderRadius: 24, background: 'rgba(23,19,18,.72)', backdropFilter: 'blur(16px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08),0 0 0 1px var(--fg-a10),0 24px 48px rgba(0,0,0,.35)', animationDelay: '.12s' }}>
              <span style={tile}><GitHubIcon size={26} /></span>
              <ArrowRight size={14} color="var(--muted-foreground)" />
              <span style={{ boxShadow: '0 8px 24px rgba(232,69,43,.35)', borderRadius: 16 }}><LogoMark size={64} /></span>
              <ArrowRight size={14} color="var(--muted-foreground)" />
              <span style={tile}><XIcon size={22} /></span>
              <ArrowRight size={14} color="var(--muted-foreground)" />
              <span style={tile}><LinkedInIcon size={22} /></span>
            </div>
            <p className="fade" style={{ margin: 0, maxWidth: 380, fontSize: 15, lineHeight: 1.5, color: 'var(--muted-foreground)', animationDelay: '.24s' }}>One merged PR, one share-ready image for every platform you post on.</p>
          </div>
          <div style={{ position: 'relative', display: 'flex', gap: 16, fontSize: 12, color: 'var(--muted-foreground)' }}>
            <span>16 backgrounds</span><span style={{ color: 'var(--fg-a30)' }}>·</span><span>5 platform presets</span><span style={{ color: 'var(--fg-a30)' }}>·</span><span>Export up to 5×</span>
          </div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', padding: '32px 40px', background: 'var(--card)', borderLeft: '1px solid var(--fg-a10)' }}>
          <Link href="/" className="link-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start', fontSize: 13, fontWeight: 500 }}><ChevronLeft size={14} />Home</Link>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
            <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 24 }}>
              <LogoMark size={40} />
              <div>
                <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 34, lineHeight: 1.15, fontWeight: 600, letterSpacing: '-0.03em' }}>Pick up where you merged.</h1>
                <p style={{ margin: '10px 0 0', fontSize: 15, lineHeight: 1.5, color: 'var(--muted-foreground)' }}>Sign in with your git host. Your exports, defaults and recent pull requests come along.</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {error && <div className="chip" role="alert">GitHub sign-in failed. Try again.</div>}
                <SignInGitHub next={next} disabled={!features.auth} reason="Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env.local" />
                {/* altBtnOff sets pointer-events:none, so the tooltip lives on the wrapper; grid makes the link fill it. */}
                <span title="Coming later" style={{ display: 'grid' }}>
                  <Link href="#" aria-disabled="true" tabIndex={-1} style={altBtnOff} className="btn-outline"><GitLabIcon />Continue with GitLab</Link>
                </span>
                <span title="Coming later" style={{ display: 'grid' }}>
                  <Link href="#" aria-disabled="true" tabIndex={-1} style={altBtnOff} className="btn-outline"><BitbucketIcon />Continue with Bitbucket</Link>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--muted-foreground)', fontSize: 12 }}>
                <span style={{ flex: 1, height: 1, background: 'var(--fg-a10)' }} />or<span style={{ flex: 1, height: 1, background: 'var(--fg-a10)' }} />
              </div>
              <p className="muted" style={{ fontSize: 12 }}>Email sign-in is coming later. GitHub is the only provider in the beta.</p>
              <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--muted-foreground)' }}>
                By continuing you agree to the <a href="#" style={{ color: 'var(--foreground)' }}>Terms</a> and <a href="#" style={{ color: 'var(--foreground)' }}>Privacy policy</a>. Pullsheets only reads pull-request metadata; it never writes to your repos.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted-foreground)' }}>
            <span>© 2026 Pullsheets</span>
            <Link href="/#faq" className="link-muted">Need help?</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
