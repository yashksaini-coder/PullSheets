'use client';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { GitHubIcon } from '@/components/brand-icons';
import { authClient } from '@/lib/auth/client';

export function SignInGitHub({ next = '/editor', disabled, reason }: { next?: string; disabled?: boolean; reason?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="lg"
      fullWidth
      disabled={disabled || busy}
      title={disabled ? reason : undefined}
      onClick={async () => {
        setBusy(true);
        await authClient.signIn.social({ provider: 'github', callbackURL: next, errorCallbackURL: '/login?error=github' });
      }}
    >
      {busy ? <Loader2 size={18} className="spin" /> : <GitHubIcon size={18} />}
      {disabled ? 'GitHub login not configured' : 'Continue with GitHub'}
    </Button>
  );
}
