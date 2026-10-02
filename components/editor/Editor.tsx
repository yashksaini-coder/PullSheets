'use client';
import { useEffect, useRef, useState } from 'react';
import { Box, Clapperboard, Globe, Image as ImageIcon, Layers, Palette, RefreshCw, SlidersHorizontal, Smartphone } from 'lucide-react';
import { Button, Dialog, Segmented, Toaster } from '@/components/ui';
import type { PrFacts } from '@/components/cards';
import type { Design } from '@/lib/editor/design';
import type { Features } from '@/lib/env';
import { EditorProvider, useEditor, type EditorUser } from './EditorProvider';
import { Toolbar } from './Toolbar';
import { Canvas } from './Canvas';
import { ImportPanel } from './panels/ImportPanel';
import { CardPanel } from './panels/CardPanel';
import { BackgroundPanel } from './panels/BackgroundPanel';
import { LayersPanel } from './panels/LayersPanel';
import { TransformPanel } from './panels/TransformPanel';
import { MotionPanel } from './panels/MotionPanel';
import { useImportPr } from './use-import-pr';

const MODE_OPTIONS = [
  { id: 'image' as const, label: 'Image', icon: <ImageIcon size={14} /> },
  { id: 'browser' as const, label: 'Browser', icon: <Globe size={14} /> },
  { id: 'device' as const, label: 'Device', icon: <Smartphone size={14} /> },
];

export function Editor({ user, features, initialDesign, initialFacts, initialPrUrl }: {
  user: EditorUser; features: Features; initialDesign: Design; initialFacts: PrFacts | null; initialPrUrl?: string;
}) {
  return (
    <EditorProvider initialDesign={initialDesign} initialFacts={initialFacts} user={user} features={features}>
      <EditorShell initialPrUrl={initialPrUrl} />
    </EditorProvider>
  );
}

function EditorShell({ initialPrUrl }: { initialPrUrl?: string }) {
  const { d, update, reset, toasts, toast, dismiss } = useEditor();
  const { importUrl } = useImportPr();
  const [tab, setTab] = useState<'edit' | 'bg' | 'layers'>('edit');
  const [rtab, setRtab] = useState<'3d' | 'motion'>('3d');
  const [rulers, setRulers] = useState(false);
  const [grid, setGrid] = useState(false);
  const [startOver, setStartOver] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current || !initialPrUrl) return;
    didInit.current = true;
    importUrl(initialPrUrl);
  }, [initialPrUrl, importUrl]);

  return (
    <div className="ed">
      <Toolbar
        stageRef={stageRef}
        rulers={rulers} setRulers={setRulers}
        grid={grid} setGrid={setGrid}
        onStartOver={() => setStartOver(true)}
        onNeedMotion={() => setRtab('motion')}
      />

      <div className="ed-body">
        {/* Left panel */}
        <aside className="ed-panel" style={{ borderRight: '1px solid var(--fg-a10)' }}>
          <div className="ed-panel-top">
            <Segmented value={d.mode} onChange={(m) => update({ mode: m })} options={MODE_OPTIONS} />
            <Segmented value={tab} onChange={setTab} options={[{ id: 'edit', label: 'Design', icon: <SlidersHorizontal size={14} /> }, { id: 'bg', label: 'BG', icon: <Palette size={14} /> }, { id: 'layers', label: 'Layers', icon: <Layers size={14} /> }]} />
          </div>
          <div className="ed-panel-scroll">
            {tab === 'edit' && (<><ImportPanel /><CardPanel /></>)}
            {tab === 'bg' && <BackgroundPanel />}
            {tab === 'layers' && <LayersPanel />}
          </div>
        </aside>

        <Canvas stageRef={stageRef} rulers={rulers} grid={grid} onOpenImport={() => setTab('edit')} onAnimate={() => setRtab('motion')} />

        {/* Right panel */}
        <aside className="ed-panel ed-panel-right" style={{ borderLeft: '1px solid var(--fg-a10)' }}>
          <div className="ed-panel-top">
            <Segmented value={rtab} onChange={setRtab} options={[{ id: '3d', label: '3D', icon: <Box size={14} /> }, { id: 'motion', label: 'Motion', icon: <Clapperboard size={14} /> }]} />
          </div>
          <div className="ed-panel-scroll" style={{ paddingTop: 12 }}>
            {rtab === '3d' && <TransformPanel />}
            {rtab === 'motion' && <MotionPanel />}
          </div>
        </aside>
      </div>

      <Dialog open={startOver} onClose={() => setStartOver(false)} icon={<RefreshCw size={16} />} title="Start over?" description="This resets the current design, overlays, and animation. Your imported pull request stays, and you can undo this action.">
        <Button variant="outline" onClick={() => setStartOver(false)}>Cancel</Button>
        <Button variant="destructive" onClick={() => { reset(); setStartOver(false); toast({ type: 'info', title: 'Design reset', description: 'Undo with ⌘Z.' }); }}>Start over</Button>
      </Dialog>
      <Toaster toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
