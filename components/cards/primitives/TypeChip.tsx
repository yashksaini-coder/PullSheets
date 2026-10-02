import type { PrType } from '../model';
export function TypeChip({ type }: { type: PrType | null }) {
  if (!type) return null;
  return <span className={`pc-chip pc-chip-${type}`}>{type}</span>;
}
