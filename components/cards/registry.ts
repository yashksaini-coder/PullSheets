import type { ComponentType } from 'react';
import type { CardFamily, CardFormat, PrFacts } from './model';
import { CARD_FAMILIES } from './model';
import { Compact } from './layouts/Compact';
import { Detail } from './layouts/Detail';
import { DetailWide } from './layouts/DetailWide';
import { Digest } from './layouts/Digest';
import { QueueRow } from './layouts/QueueRow';
import { Standard } from './layouts/Standard';
import { FuturisticStandard } from './families/futuristic/Standard';
import { TerminalStandard } from './families/terminal/Standard';
import { EditorialStandard } from './families/editorial/Standard';

export type CardComponent = ComponentType<{ facts: PrFacts; family: CardFamily }>;

/** Default layout per format. Families that need structural overrides register them in FAMILY_OVERRIDES. */
export const LAYOUTS: Record<CardFormat, CardComponent> = {
  'queue-row': QueueRow, compact: Compact, standard: Standard, detail: Detail, digest: Digest, 'detail-wide': DetailWide,
};
export const FAMILY_OVERRIDES: Partial<Record<CardFamily, Partial<Record<CardFormat, CardComponent>>>> = {
  futuristic: { standard: FuturisticStandard },
  terminal: { standard: TerminalStandard },
  editorial: { standard: EditorialStandard },
};
export const AVAILABLE_FAMILIES: CardFamily[] = [...CARD_FAMILIES];

/** Every CardFormat now resolves; the `| null` stays for the editor's picker, which probes unknown formats. */
export function resolveCard(family: CardFamily, format: CardFormat): CardComponent | null {
  return FAMILY_OVERRIDES[family]?.[format] ?? LAYOUTS[format] ?? null;
}
