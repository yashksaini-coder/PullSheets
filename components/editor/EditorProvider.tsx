'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import type { PrFacts } from '@/components/cards/model';
import type { Design } from '@/lib/editor/design';
import type { Features } from '@/lib/env';
import { useToasts, type Toast } from '@/components/ui';
import { editorReducer, initialEditorState } from './editor-reducer';

export interface EditorUser { id: string; name: string; image: string | null; plan: 'free' | 'pro'; githubLogin: string | null }

interface Ctx {
  d: Design;
  update: (patch: Partial<Design>) => void;
  undo: () => void; redo: () => void; reset: () => void;
  canUndo: boolean; canRedo: boolean;
  facts: PrFacts | null; setFacts: (f: PrFacts | null) => void;
  /** One import at a time: every panel that can start one reads the same flag. */
  fetching: boolean; setFetching: (v: boolean) => void;
  user: EditorUser; features: Features;
  toasts: Toast[]; toast: ReturnType<typeof useToasts>['toast']; dismiss: (id: number) => void;
}
const EditorCtx = createContext<Ctx | null>(null);

export function EditorProvider({ initialDesign, initialFacts, user, features, children }: { initialDesign: Design; initialFacts: PrFacts | null; user: EditorUser; features: Features; children: ReactNode }) {
  const [s, dispatch] = useReducer(editorReducer, initialDesign, initialEditorState);
  const [facts, setFacts] = useState<PrFacts | null>(initialFacts);
  const [fetching, setFetching] = useState(false);
  const { toasts, toast, dismiss } = useToasts();
  const update = useCallback((patch: Partial<Design>) => dispatch({ type: 'patch', patch }), []);
  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'redo' }), []);
  const reset = useCallback(() => dispatch({ type: 'reset' }), []);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [undo, redo]);

  const value = useMemo<Ctx>(() => ({
    d: s.design, update, undo, redo, reset, canUndo: s.past.length > 0, canRedo: s.future.length > 0,
    facts, setFacts, fetching, setFetching, user, features, toasts, toast, dismiss,
  }), [s, update, undo, redo, reset, facts, fetching, user, features, toasts, toast, dismiss]);
  return <EditorCtx.Provider value={value}>{children}</EditorCtx.Provider>;
}

export function useEditor() {
  const c = useContext(EditorCtx);
  if (!c) throw new Error('useEditor outside EditorProvider');
  return c;
}
