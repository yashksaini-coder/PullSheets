'use client';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { GitHubIcon } from '@/components/brand-icons';
import { authClient } from '@/lib/auth/client';

export function SignInGitHub({ next = '/editor', disabled, reason }: { next?: string; disabled?: boolean; reason?: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Button
        size="lg"
        fullWidth
        disabled={disabled || busy}
        title={disabled ? reason : undefined}
        onClick={async () => {
          setBusy(true);
          setMessage(null);
          // signIn.social resolves { data, error } for a refused sign-in and only throws when the
          // request itself fails; neither case used to clear `busy`, so the spinner locked forever.
          try {
            const { error } = await authClient.signIn.social({ provider: 'github', callbackURL: next, errorCallbackURL: '/login?error=github' });
            if (error) {
              setBusy(false);
              setMessage(error.message ?? 'Sign-in failed');
            }
          } catch {
            setBusy(false);
            setMessage('Could not reach the server');
          }
        }}
      >
        {busy ? <Loader2 size={18} className="spin" /> : <GitHubIcon size={18} />}
        {disabled ? 'GitHub login not configured' : 'Continue with GitHub'}
      </Button>
      {message && <span role="alert" className="muted" style={{ fontSize: 12, color: 'var(--destructive)' }}>{message}</span>}
    </div>
  );
}
