import type { CardFamily, CardFormat, PrFacts } from './model';
import { resolveCard } from './registry';

export function Card({ family, format, facts }: { family: CardFamily; format: CardFormat; facts: PrFacts }) {
  const C = resolveCard(family, format);
  if (!C) return <div className={`pc pc-${family} pc-${format} pc-missing`}>{family} / {format} is not available yet</div>;
  return <C facts={facts} family={family} />;
}
