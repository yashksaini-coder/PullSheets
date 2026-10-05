'use client';
import Link from 'next/link';
import { useCallback, useRef, useState, type RefObject } from 'react';
import {
  Clock, Grid2x2, Image as ImageIcon, MessageSquare, Redo2, RefreshCw, Ruler, Settings2, Trash2, Undo2, User, WandSparkles,
} from 'lucide-react';
import { Avatar, Button, Logo, useClickOutside } from '@/components/ui';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { ASPECTS, type AspectKey } from '@/lib/data';
import { useEditor } from './EditorProvider';
import { ExportMenu } from './panels/ExportMenu';

export function Toolbar({ stageRef, rulers, setRulers, grid, setGrid, onStartOver, onNeedMotion }: {
  stageRef: RefObject<HTMLDivElement | null>;
  rulers: boolean; setRulers: (v: boolean) => void;
  grid: boolean; setGrid: (v: boolean) => void;
  onStartOver: () => void; onNeedMotion: () => void;
}) {
  const { d, update, undo, redo, canUndo, canRedo, facts, setFacts, user } = useEditor();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, useCallback(() => setMenuOpen(false), []), menuOpen);
  const initials = ((user.name || user.githubLogin || '?').split(/\s+/).slice(0, 2).map((w) => w[0]).join('') || '?').toUpperCase();

  return (
    <header className="ed-header">
      <div className="ed-group" style={{ gap: 10, minWidth: 0 }}>
        <Logo href="/" small />
        <span className="divider-v" />
        {/* .btn:disabled sets pointer-events:none, so the tooltip has to sit on a wrapper that still gets hovered. */}
        <span title="Coming in a later phase" style={{ display: 'inline-flex' }}>
          <Button variant="ghost" size="sm" disabled><WandSparkles size={14} />Templates</Button>
        </span>
      </div>

      <div className="ed-group" style={{ gap: 10 }}>
        <div className="ed-group">
          <Button variant="ghost" size="icon-sm" aria-label="Undo" disabled={!canUndo} onClick={undo}><Undo2 size={15} /></Button>
          <Button variant="ghost" size="icon-sm" aria-label="Redo" disabled={!canRedo} onClick={redo}><Redo2 size={15} /></Button>
        </div>
        <span className="divider-v" />
        <div className="ed-group">
          <Button variant="ghost" size="icon-sm" aria-label="Rulers" active={rulers} onClick={() => setRulers(!rulers)}><Ruler size={15} /></Button>
          <Button variant="ghost" size="icon-sm" aria-label="Grid" active={grid} onClick={() => setGrid(!grid)}><Grid2x2 size={15} /></Button>
        </div>
        <span className="divider-v" />
        <select className="select" aria-label="Aspect ratio" value={d.aspect} onChange={(e) => update({ aspect: e.target.value as AspectKey })}>
          {(Object.keys(ASPECTS) as AspectKey[]).map((key) => (
            <option key={key} value={key}>{ASPECTS[key].label} · {ASPECTS[key].w}×{ASPECTS[key].h}</option>
          ))}
        </select>
        <span className="divider-v" />
        <ExportMenu stageRef={stageRef} onNeedMotion={onNeedMotion} />
        <span className="divider-v" />
        <div className="ed-group">
          <Button variant="ghost" size="sm" onClick={onStartOver}><RefreshCw size={14} />Start over</Button>
          <Button variant="ghost" size="sm" disabled={!facts} onClick={() => setFacts(null)}><Trash2 size={14} />Remove</Button>
        </div>
      </div>

      <div className="ed-group" style={{ justifySelf: 'end' }}>
        <span title="Coming in a later phase" style={{ display: 'inline-flex' }}>
          <Button variant="ghost" size="sm" disabled><MessageSquare size={14} />Feedback</Button>
        </span>
        <Button variant="ghost" size="sm" href="/account#exports"><Clock size={14} />Exports</Button>
        <span className="divider-v" style={{ margin: '0 4px' }} />
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button type="button" onClick={() => setMenuOpen((o) => !o)} aria-label="Account menu" style={{ padding: 0, border: 0, background: 'none', cursor: 'pointer', display: 'inline-flex' }}><Avatar initials={initials} /></button>
          {menuOpen && (
            <div className="popover menu" style={{ right: 0 }}>
              <div className="menu-heading">{user.githubLogin ?? user.name} · {user.plan === 'pro' ? 'Pro' : 'Free'}</div>
              <Link href="/account#profile" className="menu-item"><User size={14} />Profile</Link>
              <Link href="/account#exports" className="menu-item"><ImageIcon size={14} />Recent exports</Link>
              <Link href="/account#editor-defaults" className="menu-item"><Settings2 size={14} />Settings</Link>
              <div className="menu-sep" />
              <SignOutButton />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
