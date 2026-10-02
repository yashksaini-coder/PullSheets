import type { ComponentType } from 'react';
import type { CardFamily, CardFormat, PrFacts } from './model';
import { Standard } from './layouts/Standard';

export type CardComponent = ComponentType<{ facts: PrFacts; family: CardFamily }>;

/** Default layout per format. Families that need structural overrides register them in FAMILY_OVERRIDES (phase 2). */
export const LAYOUTS: Partial<Record<CardFormat, CardComponent>> = { standard: Standard };
export const FAMILY_OVERRIDES: Partial<Record<CardFamily, Partial<Record<CardFormat, CardComponent>>>> = {};
export const AVAILABLE_FAMILIES: CardFamily[] = ['midnight'];

export function resolveCard(family: CardFamily, format: CardFormat): CardComponent | null {
  return FAMILY_OVERRIDES[family]?.[format] ?? LAYOUTS[format] ?? null;
}
