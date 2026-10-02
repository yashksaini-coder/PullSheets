export type PrStatus = 'open' | 'merged' | 'draft' | 'closed';

export interface PullRequest {
  repo: string;
  number: number;
  title: string;
  status: PrStatus;
  author: string;
  base: string;
  branch: string;
  when: string;
  commits: number;
  body: string;
  additions: number;
  deletions: number;
  files: number;
  checks: string;
}

// Demo data — replace with GitHub API results (GET /repos/{owner}/{repo}/pulls/{n}).
export const RECENT_PRS: PullRequest[] = [
  { repo: 'yashksaini-coder/PullSheets', number: 12, title: 'Add PR link import and share-card renderer', status: 'merged', author: 'yashksaini-coder', base: 'main', branch: 'feat/pr-import', when: '2 hours ago', commits: 9, body: 'Paste a GitHub pull-request URL and Pullsheets fetches the metadata, renders it in a browser frame and exports a share-ready PNG. Adds the Import section, recent-PR picker and platform presets.', additions: 1842, deletions: 236, files: 24, checks: '14 / 14' },
  { repo: 'yashksaini-coder/git-graph', number: 48, title: 'Export contribution graph as WebP', status: 'open', author: 'yashksaini-coder', base: 'master', branch: 'feat/webp-export', when: 'yesterday', commits: 4, body: 'Adds a WebP encoder path next to PNG, with a quality slider and a size comparison in the export dialog.', additions: 412, deletions: 38, files: 9, checks: '6 / 6' },
  { repo: 'yashksaini-coder/gitwatch-v2', number: 7, title: 'Realtime issue feed via SSE', status: 'draft', author: 'yashksaini-coder', base: 'main', branch: 'feat/sse-feed', when: '2 days ago', commits: 6, body: 'Replaces polling with a server-sent events stream for new issues and comments. Reconnects with exponential backoff.', additions: 688, deletions: 120, files: 12, checks: '3 / 5' },
  { repo: 'yashksaini-coder/Rustlens', number: 31, title: 'Trait browser: jump to impls', status: 'closed', author: 'yashksaini-coder', base: 'main', branch: 'feat/impl-index', when: 'last week', commits: 3, body: 'Adds an impl index so the trait view can jump to every implementation in the workspace.', additions: 301, deletions: 77, files: 7, checks: '8 / 8' },
];

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
  status: PrStatus;
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

export const DEMO_EXPORTS: ExportItem[] = [
  { id: 1, title: 'Add PR link import and share-card renderer', repo: 'yashksaini-coder/PullSheets', number: 12, status: 'merged', platform: 'X post', w: 2400, h: 1350, format: 'PNG', scale: 2, bg: 'ember', kind: 'image', dur: 0, when: '2 hours ago', ts: 8 },
  { id: 2, title: 'Export contribution graph as WebP', repo: 'yashksaini-coder/git-graph', number: 48, status: 'open', platform: 'LinkedIn', w: 2400, h: 1254, format: 'PNG', scale: 2, bg: 'graphite', kind: 'image', dur: 0, when: 'yesterday', ts: 7 },
  { id: 3, title: 'Realtime issue feed via SSE', repo: 'yashksaini-coder/gitwatch-v2', number: 7, status: 'draft', platform: 'Story', w: 1080, h: 1920, format: 'MP4', scale: 1, bg: 'crimson', kind: 'video', dur: 4.2, when: '2 days ago', ts: 6 },
  { id: 4, title: 'QUIC transport: retry on handshake timeout', repo: 'yashksaini-coder/py-libp2p', number: 612, status: 'merged', platform: 'Instagram square', w: 2160, h: 2160, format: 'JPG', scale: 2, bg: 'sunset', kind: 'image', dur: 0, when: '3 days ago', ts: 5 },
  { id: 5, title: 'Editor: 3D layout presets and fine-tune sliders', repo: 'yashksaini-coder/PullSheets', number: 9, status: 'merged', platform: 'X post', w: 3600, h: 2025, format: 'PNG', scale: 3, bg: 'distortion', kind: 'image', dur: 0, when: 'last week', ts: 4 },
  { id: 6, title: 'Self-healing scraper retries', repo: 'yashksaini-coder/opportunity-radar', number: 23, status: 'merged', platform: 'LinkedIn', w: 1200, h: 627, format: 'GIF', scale: 1, bg: 'mono', kind: 'video', dur: 2.7, when: 'last week', ts: 3 },
  { id: 7, title: 'Trait browser: jump to impls', repo: 'yashksaini-coder/Rustlens', number: 31, status: 'closed', platform: 'Instagram portrait', w: 2160, h: 2700, format: 'JPG', scale: 2, bg: 'peach', kind: 'image', dur: 0, when: '2 weeks ago', ts: 2 },
  { id: 8, title: 'Landing page and pricing', repo: 'yashksaini-coder/PullSheets', number: 5, status: 'merged', platform: 'X post', w: 2400, h: 1350, format: 'PNG', scale: 2, bg: 'fire', kind: 'image', dur: 0, when: '3 weeks ago', ts: 1 },
];

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

export function parsePrUrl(u: string): { repo: string; number: number } | null {
  const m = /github\.com\/([^/\s]+)\/([^/\s]+)\/pull\/(\d+)/i.exec(u || '');
  return m ? { repo: `${m[1]}/${m[2]}`, number: Number(m[3]) } : null;
}
