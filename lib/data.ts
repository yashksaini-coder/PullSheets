import type { PrState } from '@/components/cards/model';

export const BACKGROUNDS: { key: string; label: string; css: string; kind: 'gradient' | 'image' }[] = [
  { key: 'ember', label: 'Ember', css: 'var(--gradient-ember)', kind: 'gradient' },
  { key: 'crimson', label: 'Crimson', css: 'var(--gradient-crimson-dusk)', kind: 'gradient' },
  { key: 'sunset', label: 'Sunset', css: 'var(--gradient-sunset)', kind: 'gradient' },
  { key: 'charcoal', label: 'Charcoal', css: 'var(--gradient-charcoal-red)', kind: 'gradient' },
  { key: 'graphite', label: 'Graphite', css: 'var(--gradient-graphite)', kind: 'gradient' },
  { key: 'fire', label: 'Fire', css: 'var(--gradient-fire)', kind: 'gradient' },
  { key: 'distortion', label: 'Distortion', css: 'url(/assets/backgrounds/red-distortion.webp) center/cover', kind: 'image' },
  { key: 'blushing', label: 'Blushing', css: 'url(/assets/backgrounds/blushing-fire.webp) center/cover', kind: 'image' },
  { key: 'peach', label: 'Peach', css: 'url(/assets/backgrounds/autumnal-peach.webp) center/cover', kind: 'image' },
  { key: 'mono', label: 'Mono', css: 'url(/assets/backgrounds/mono-dark-distortion.webp) center/cover', kind: 'image' },
  { key: 'burst', label: 'Burst', css: 'url(/assets/backgrounds/mesh-burst.webp) center/cover', kind: 'image' },
  { key: 'dusk', label: 'Dusk', css: 'url(/assets/backgrounds/mesh-dusk.webp) center/cover', kind: 'image' },
  { key: 'mesh', label: 'Mesh', css: 'url(/assets/backgrounds/mesh-1.webp) center/cover', kind: 'image' },
  { key: 'radiant', label: 'Radiant', css: 'url(/assets/backgrounds/radiant-4.jpg) center/cover', kind: 'image' },
  { key: 'paper', label: 'Paper', css: 'url(/assets/backgrounds/paper-01.webp) center/cover', kind: 'image' },
  { key: 'pattern', label: 'Pattern', css: 'url(/assets/backgrounds/pattern-01.webp) center/cover', kind: 'image' },
];

export function bgCss(key: string, custom?: string): string {
  if (key === 'custom') return custom ?? '#E8452B';
  if (key.startsWith('#')) return key;
  return BACKGROUNDS.find((b) => b.key === key)?.css ?? 'var(--gradient-ember)';
}

export const ASPECTS = {
  twitter: { w: 1200, h: 675, label: 'X post' },
  linkedin: { w: 1200, h: 627, label: 'LinkedIn post' },
  square: { w: 1080, h: 1080, label: 'Instagram square' },
  portrait: { w: 1080, h: 1350, label: 'Instagram portrait' },
  story: { w: 1080, h: 1920, label: 'Story / Reel' },
  custom: { w: 1920, h: 1080, label: 'Custom 16:9' },
} as const;
export type AspectKey = keyof typeof ASPECTS;

export const SHADOWS = {
  none: 'none',
  hug: 'var(--canvas-shadow-hug)',
  soft: 'var(--canvas-shadow-soft)',
  strong: 'var(--canvas-shadow-strong)',
} as const;
export type ShadowKey = keyof typeof SHADOWS;

export const LAYOUTS: { key: string; label: string; rot: [number, number, number] }[] = [
  { key: 'flat', label: 'Flat', rot: [0, 0, 0] },
  { key: 'tiltL', label: 'Tilt left', rot: [0, 14, 0] },
  { key: 'tiltR', label: 'Tilt right', rot: [0, -14, 0] },
  { key: 'iso', label: 'Isometric', rot: [18, -16, 0] },
  { key: 'lean', label: 'Lean back', rot: [16, 0, 0] },
  { key: 'float', label: 'Float', rot: [8, 0, -4] },
];

export const CLIPS: { key: string; label: string; dur: number; group: 'Entrances' | 'Camera' | 'Emphasis' }[] = [
  { key: 'fadeIn', label: 'Fade in', dur: 1.2, group: 'Entrances' },
  { key: 'zoomIn', label: 'Zoom in', dur: 1.5, group: 'Entrances' },
  { key: 'slideUp', label: 'Slide up', dur: 1.0, group: 'Entrances' },
  { key: 'kenBurns', label: 'Ken Burns', dur: 3.0, group: 'Camera' },
  { key: 'panLeft', label: 'Pan left', dur: 2.5, group: 'Camera' },
  { key: 'tilt', label: 'Tilt', dur: 2.0, group: 'Camera' },
  { key: 'bounce', label: 'Bounce', dur: 1.4, group: 'Emphasis' },
  { key: 'pulse', label: 'Pulse', dur: 1.6, group: 'Emphasis' },
];

export const OVERLAYS = ['torus', 'cone', 'sphere', 'cuboid'] as const;

export interface ExportItem {
  id: number;
  title: string;
  repo: string;
  number: number;
  status: PrState;
  platform: string;
  w: number;
  h: number;
  format: string;
  scale: number;
  bg: string;
  kind: 'image' | 'video';
  dur: number;
  when: string;
  ts: number;
}

export const EXPORTS_KEY = 'pullsheets.exports';

export function loadExports(): ExportItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(EXPORTS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveExport(item: ExportItem) {
  const list = loadExports();
  localStorage.setItem(EXPORTS_KEY, JSON.stringify([item, ...list].slice(0, 40)));
}
