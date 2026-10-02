'use client';

import Link from 'next/link';
import {
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
  type RefObject,
} from 'react';
import { ChevronDown, X } from 'lucide-react';
import type { PrStatus } from '@/lib/data';

/* ---------- Brand ---------- */

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <span className="logo-mark" style={{ width: size, height: size, borderRadius: size * 0.25 }}>
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="18" cy="18" r="3" />
        <circle cx="6" cy="6" r="3" />
        <path d="M13 6h3a2 2 0 0 1 2 2v7" />
        <line x1="6" x2="6" y1="9" y2="21" />
      </svg>
    </span>
  );
}

export function Logo({ size = 32, href = '/', small = false }: { size?: number; href?: string; small?: boolean }) {
  return (
    <Link href={href} className="logo" style={small ? { fontSize: 14 } : undefined}>
      <LogoMark size={size} />
      <span>Pullsheets</span>
    </Link>
  );
}

export function BetaBar() {
  return (
    <div className="beta-bar">
      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--foreground)' }}>Beta</span>
      <span style={{ color: 'var(--fg-a30)' }}>·</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
        Pull requests, ready to post. We&apos;re building in the open — expect rough edges and things to shift.
      </span>
    </div>
  );
}

/* ---------- Button ---------- */

type Variant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm' | 'icon-xs';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  href?: string;
  active?: boolean;
  fullWidth?: boolean;
}

export function Button({ variant = 'default', size = 'md', href, active, fullWidth, className = '', style, children, ...rest }: ButtonProps) {
  const cls = `btn btn-${variant} btn-${size}${fullWidth ? ' btn-full' : ''} ${className}`.trim();
  if (href) {
    return (
      <Link href={href} className={cls} style={style} data-active={active || undefined} aria-label={rest['aria-label']}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} style={style} data-active={active || undefined} {...rest}>
      {children}
    </button>
  );
}

/* ---------- Form controls ---------- */

export interface SegOption<T extends string> {
  id: T;
  label: string;
  icon?: ReactNode;
}

export function Segmented<T extends string>({ value, onChange, options, size = 'md' }: { value: NoInfer<T>; onChange?: (v: T) => void; options: readonly SegOption<T>[]; size?: 'sm' | 'md' }) {
  return (
    <div className={`seg seg-${size}`} role="tablist">
      {options.map((o) => (
        <button key={o.id} type="button" role="tab" aria-selected={value === o.id} onClick={() => onChange?.(o.id)}>
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Slider({ label, value, min, max, step = 1, onChange, display }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; display?: string }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="slider">
      <span className="slider-head">
        <span>{label}</span>
        <span className="mono">{display ?? value}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ ['--pct' as string]: `${pct}%` } as CSSProperties} />
    </label>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} className="switch" onClick={() => onChange(!checked)}>
      <span />
    </button>
  );
}

export function Input({ mono, inputSize = 'md', className = '', ...rest }: InputHTMLAttributes<HTMLInputElement> & { mono?: boolean; inputSize?: 'xs' | 'sm' | 'md' }) {
  return <input className={`input input-${inputSize}${mono ? ' mono' : ''} ${className}`.trim()} {...rest} />;
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}

/* ---------- Display ---------- */

const STATUS: Record<PrStatus, { label: string; color: string }> = {
  open: { label: 'Open', color: '#1F9D4A' },
  merged: { label: 'Merged', color: '#8250DF' },
  draft: { label: 'Draft', color: '#6E7781' },
  closed: { label: 'Closed', color: '#CF222E' },
};

export function StatusPill({ status }: { status: PrStatus }) {
  const s = STATUS[status];
  return (
    <span className="pill" style={{ background: s.color }}>
      {s.label}
    </span>
  );
}

export function Tile({ label, selected, onClick, background, children, aspect = '1 / 1', badge }: { label: string; selected?: boolean; onClick?: () => void; background?: string; children?: ReactNode; aspect?: string; badge?: string }) {
  return (
    <button type="button" className="tile" data-selected={selected || undefined} onClick={onClick}>
      <span className="tile-preview" style={{ background: background ?? 'rgb(210,210,214)', aspectRatio: aspect }}>
        {children}
        {badge && <span className="tile-badge">{badge}</span>}
      </span>
      <span className="tile-label">{label}</span>
    </button>
  );
}

export function Section({ title, children, defaultOpen = true }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="section">
      <button type="button" className="section-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span>{title}</span>
        <ChevronDown size={14} style={{ transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform .2s' }} />
      </button>
      {open && <div className="section-body">{children}</div>}
    </div>
  );
}

export function Avatar({ initials = 'YS', size = 30 }: { initials?: string; size?: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: '50%', background: 'var(--primary)', color: '#fff', fontWeight: 600, fontSize: Math.round(size * 0.36), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {initials}
    </span>
  );
}

/* ---------- Overlays ---------- */

export function Dialog({ open, onClose, icon, title, description, children }: { open: boolean; onClose: () => void; icon?: ReactNode; title: string; description: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        {icon && <span className="dialog-icon">{icon}</span>}
        <h2>{title}</h2>
        <p>{description}</p>
        <div className="dialog-footer">{children}</div>
      </div>
    </div>
  );
}

export function useClickOutside(ref: RefObject<HTMLElement | null>, onOutside: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, onOutside, active]);
}

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'loading';
export interface Toast {
  id: number;
  type: ToastType;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));
  const toast = (t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setToasts((l) => [...l, { ...t, id }]);
    setTimeout(() => dismiss(id), 3800);
  };
  return { toasts, toast, dismiss };
}

export function Toaster({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: number) => void }) {
  return (
    <div className="toaster" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <span className={`toast-dot toast-${t.type}`} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="toast-title">{t.title}</div>
            {t.description && <div className="toast-desc">{t.description}</div>}
          </div>
          {t.actionLabel && (
            <Button size="xs" variant="secondary" onClick={() => { t.onAction?.(); dismiss(t.id); }}>
              {t.actionLabel}
            </Button>
          )}
          <button type="button" className="toast-close" onClick={() => dismiss(t.id)} aria-label="Close">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
