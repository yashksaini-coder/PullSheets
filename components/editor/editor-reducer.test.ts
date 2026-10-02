import { describe, expect, it } from 'vitest';
import { DEFAULT_DESIGN } from '@/lib/editor/design';
import { editorReducer, initialEditorState } from './editor-reducer';

describe('editorReducer', () => {
  const s0 = initialEditorState(DEFAULT_DESIGN);
  it('patch pushes history and clears future', () => {
    const s1 = editorReducer(s0, { type: 'patch', patch: { bg: 'crimson' } });
    expect(s1.design.bg).toBe('crimson');
    expect(s1.past).toHaveLength(1);
    expect(s1.future).toHaveLength(0);
  });
  it('undo/redo walk the stacks', () => {
    const s1 = editorReducer(s0, { type: 'patch', patch: { bg: 'crimson' } });
    const s2 = editorReducer(s1, { type: 'undo' });
    expect(s2.design.bg).toBe('ember');
    expect(s2.future).toHaveLength(1);
    expect(editorReducer(s2, { type: 'redo' }).design.bg).toBe('crimson');
  });
  it('undo with empty past and redo with empty future are no-ops', () => {
    expect(editorReducer(s0, { type: 'undo' })).toBe(s0);
    expect(editorReducer(s0, { type: 'redo' })).toBe(s0);
  });
  it('history is bounded to 50', () => {
    let s = s0;
    for (let i = 0; i < 60; i++) s = editorReducer(s, { type: 'patch', patch: { rotX: i } });
    expect(s.past).toHaveLength(50);
  });
  it('reset restores defaults and keeps an undo step', () => {
    const s1 = editorReducer(s0, { type: 'patch', patch: { bg: 'crimson' } });
    const s2 = editorReducer(s1, { type: 'reset' });
    expect(s2.design).toEqual(DEFAULT_DESIGN);
    expect(editorReducer(s2, { type: 'undo' }).design.bg).toBe('crimson');
  });
});
