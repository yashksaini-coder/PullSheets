import { z } from 'zod';
import { CARD_FAMILIES, CARD_FORMATS } from '@/components/cards/model';
import { ASPECTS, CLIPS, LAYOUTS, OVERLAYS, SHADOWS } from '@/lib/data';

const aspectKeys = Object.keys(ASPECTS) as [keyof typeof ASPECTS, ...(keyof typeof ASPECTS)[]];
const shadowKeys = Object.keys(SHADOWS) as [keyof typeof SHADOWS, ...(keyof typeof SHADOWS)[]];

export const DesignSchema = z.object({
  mode: z.enum(['image', 'browser', 'device']),
  browser: z.enum(['safari', 'chrome', 'none']),
  chromeDark: z.boolean(),
  device: z.enum(['macbook', 'iphone']),
  cardFamily: z.enum(CARD_FAMILIES),
  cardFormat: z.enum(CARD_FORMATS),
  bg: z.string().min(1).max(32),
  customColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  bgPad: z.number().min(0).max(160),
  noise: z.boolean(),
  shadow: z.enum(shadowKeys),
  radius: z.number().min(0).max(48),
  scale: z.number().min(20).max(100),
  caption: z.boolean(),
  captionText: z.string().max(80),
  captionSub: z.string().max(80),
  overlay: z.enum(OVERLAYS).nullable(),
  overlaySize: z.number().min(10).max(80),
  layout: z.enum(['custom', ...LAYOUTS.map((l) => l.key)] as [string, ...string[]]),
  persp: z.number().min(300).max(3000),
  rotX: z.number().min(-180).max(180),
  rotY: z.number().min(-180).max(180),
  rotZ: z.number().min(-180).max(180),
  aspect: z.enum(aspectKeys),
  clips: z.array(z.enum(CLIPS.map((c) => c.key) as [string, ...string[]])).max(8),
});
export type Design = z.infer<typeof DesignSchema>;

export const DEFAULT_DESIGN: Design = {
  mode: 'browser', browser: 'safari', chromeDark: true, device: 'macbook', cardFamily: 'midnight', cardFormat: 'standard',
  bg: 'ember', customColor: '#E8452B', bgPad: 0, noise: false, shadow: 'soft', radius: 12, scale: 66,
  caption: true, captionText: 'Just merged.', captionSub: 'Pullsheets · v0.1', overlay: null, overlaySize: 30,
  layout: 'flat', persp: 1200, rotX: 0, rotY: 0, rotZ: 0, aspect: 'twitter', clips: [],
};

// base64url over TextEncoder/btoa — no Buffer, because the client reducer value-imports this module.
const b64 = {
  enc: (s: string) => {
    const bytes = new TextEncoder().encode(s);
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  dec: (s: string) => {
    const b64url = s.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64url.padEnd(Math.ceil(b64url.length / 4) * 4, '='));
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  },
};

export function encodeDesign(d: Design): string {
  return b64.enc(JSON.stringify(d));
}
export function decodeDesign(s: string | null | undefined): Design {
  if (!s) return DEFAULT_DESIGN;
  try {
    const r = DesignSchema.safeParse(JSON.parse(b64.dec(s)));
    return r.success ? r.data : DEFAULT_DESIGN;
  } catch {
    return DEFAULT_DESIGN;
  }
}

/** Total runtime of a design's clips, in seconds. */
export const clipsDuration = (clips: string[]) => clips.reduce((t, c) => t + (CLIPS.find((x) => x.key === c)?.dur ?? 0), 0);
