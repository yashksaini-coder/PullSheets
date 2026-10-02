import { DEFAULT_DESIGN, type Design } from '@/lib/editor/design';

export interface EditorState { design: Design; past: Design[]; future: Design[] }
export type EditorAction =
  | { type: 'patch'; patch: Partial<Design> }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'reset' }
  | { type: 'load'; design: Design };

const LIMIT = 50;
export const initialEditorState = (design: Design): EditorState => ({ design, past: [], future: [] });

export function editorReducer(s: EditorState, a: EditorAction): EditorState {
  switch (a.type) {
    case 'patch': {
      const design = { ...s.design, ...a.patch };
      return { design, past: [...s.past.slice(-(LIMIT - 1)), s.design], future: [] };
    }
    case 'reset':
      return { design: DEFAULT_DESIGN, past: [...s.past.slice(-(LIMIT - 1)), s.design], future: [] };
    case 'load':
      return { design: a.design, past: [], future: [] };
    case 'undo': {
      const prev = s.past.at(-1);
      if (!prev) return s;
      return { design: prev, past: s.past.slice(0, -1), future: [s.design, ...s.future] };
    }
    case 'redo': {
      const [next, ...rest] = s.future;
      if (!next) return s;
      return { design: next, past: [...s.past, s.design], future: rest };
    }
  }
}
