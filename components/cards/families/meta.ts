import type { CardFamily } from '../model';

export const FAMILY_META: Record<CardFamily, { label: string; blurb: string; swatch: string; ink: string }> = {
  midnight:   { label: 'Midnight',   blurb: 'Dark slate, blurple accent — team channels and dark docs.', swatch: '#161826', ink: '#e9e9ed' },
  industrial: { label: 'Industrial', blurb: 'Paper and steel-blue ink, datasheet grid — release notes and print.', swatch: '#f4f1ea', ink: '#1d2b3a' },
  modern:     { label: 'Modern',     blurb: 'White card, soft shadow, friendly — public changelogs.', swatch: '#ffffff', ink: '#111827' },
  minimal:    { label: 'Minimal',    blurb: 'Monochrome and typographic — portfolios and newsletters.', swatch: '#ffffff', ink: '#111111' },
  futuristic: { label: 'Futuristic', blurb: 'HUD telemetry: cyan hairlines, tick bars — dev-tool launches.', swatch: '#070a0f', ink: '#9fe8ff' },
  terminal:   { label: 'Terminal',   blurb: 'CLI output in phosphor green — infra teams and dev newsletters.', swatch: '#060a06', ink: '#8df0a0' },
  editorial:  { label: 'Editorial',  blurb: 'Cream paper, serif headline, double rule — retrospectives.', swatch: '#f7f1e3', ink: '#1a1613' },
};
