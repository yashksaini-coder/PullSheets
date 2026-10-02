'use client';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { signOut } from '@/lib/auth/client';

export function SignOutButton({ className = 'menu-item' }: { className?: string }) {
  const router = useRouter();
  return (
    <button type="button" className={className} onClick={() => signOut({ fetchOptions: { onSuccess: () => router.push('/') } })}>
      <LogOut size={14} /> Sign out
    </button>
  );
}
