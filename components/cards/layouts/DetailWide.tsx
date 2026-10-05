import type { CardFamily, PrFacts } from '../model';
import { FRAME_WIDTH } from '../model';
import { DetailBody } from './Detail';

export function DetailWide({ facts, family }: { facts: PrFacts; family: CardFamily }) {
  return <article className={`pc pc-${family} pc-detail-wide`} style={{ width: FRAME_WIDTH['detail-wide'] }}><DetailBody facts={facts} wide /></article>;
}
