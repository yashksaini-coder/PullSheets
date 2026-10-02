import type { ReactNode } from 'react';

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
