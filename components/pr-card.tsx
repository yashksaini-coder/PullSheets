import type { ReactNode } from 'react';
import type { PullRequest } from '@/lib/data';
import { StatusPill } from './ui';

const THEMES = {
  light: { bg: '#FFFFFF', fg: '#1E1B1A', muted: '#7A736F', line: '#E6E1DE', body: '#3A3634', code: '#F5F3F2' },
  dark: { bg: '#0D1117', fg: '#E6EDF3', muted: '#8D96A0', line: '#30363D', body: '#C9D1D9', code: '#161B22' },
};

const VERB = { merged: 'merged', open: 'wants to merge', draft: 'is drafting', closed: 'closed' } as const;

export function PrCard({ pr, theme = 'light' }: { pr: PullRequest; theme?: 'light' | 'dark' }) {
  const c = THEMES[theme];
  return (
    <div className="prc" style={{ background: c.bg, color: c.fg }}>
      <div className="prc-repo" style={{ color: c.muted }}>
        {pr.repo} · <span className="mono">#{pr.number}</span>
      </div>
      <div className="prc-title">{pr.title}</div>
      <div className="prc-meta" style={{ color: c.muted }}>
        <StatusPill status={pr.status} />
        <span>
          {pr.author} {VERB[pr.status]} {pr.commits} commit{pr.commits === 1 ? '' : 's'} into <code style={{ background: c.code }}>{pr.base}</code> from{' '}
          <code style={{ background: c.code }}>{pr.branch}</code> · {pr.when}
        </span>
      </div>
      <div className="prc-body" style={{ color: c.body, borderColor: c.line }}>
        {pr.body}
      </div>
      <div className="prc-stats" style={{ color: c.muted, borderColor: c.line }}>
        <span className="mono">
          <span style={{ color: '#1F9D4A' }}>+{pr.additions.toLocaleString()}</span> <span style={{ color: '#E11D48' }}>−{pr.deletions.toLocaleString()}</span>
        </span>
        <span>{pr.files} files changed</span>
        <span style={{ color: '#1F9D4A' }}>{pr.checks} checks</span>
      </div>
    </div>
  );
}

export function BrowserFrame({ browser, dark, url, children }: { browser: 'safari' | 'chrome' | 'none'; dark: boolean; url: string; children: ReactNode }) {
  if (browser === 'none') return <>{children}</>;
  const dots = (
    <span className="bf-dots">
      <i style={{ background: '#FF5F57' }} />
      <i style={{ background: '#FEBC2E' }} />
      <i style={{ background: '#28C840' }} />
    </span>
  );
  if (browser === 'safari') {
    return (
      <div>
        <div className="bf-bar" style={{ background: dark ? '#2B2B2E' : '#EDEBEA' }}>
          {dots}
          <span className="bf-url" style={{ background: dark ? '#1C1C1E' : '#FFFFFF', color: dark ? '#A1A1A6' : '#6B6560' }}>{url}</span>
          <span className="bf-spacer" />
        </div>
        {children}
      </div>
    );
  }
  return (
    <div>
      <div className="bf-tabs" style={{ background: dark ? '#202124' : '#DEE1E6' }}>
        {dots}
        <span className="bf-tab" style={{ background: dark ? '#35363A' : '#FFFFFF', color: dark ? '#E8EAED' : '#3C4043' }}>{url.split('/').slice(1, 3).join('/') || url}</span>
      </div>
      <div className="bf-bar" style={{ background: dark ? '#35363A' : '#FFFFFF' }}>
        <span className="bf-url bf-url-chrome" style={{ background: dark ? '#202124' : '#F1F3F4', color: dark ? '#BDC1C6' : '#5F6368' }}>{url}</span>
      </div>
      {children}
    </div>
  );
}
