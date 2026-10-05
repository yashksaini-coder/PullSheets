import type { PrReview } from '../model';
export function ReviewSegments({ items }: { items: PrReview[] }) {
  if (items.length === 0) return <span className="pc-segments pc-empty">no reviewers</span>;
  return (
    <span className="pc-segments" role="img" aria-label={`${items.filter((r) => r.verdict === 'approved').length} of ${items.length} approved`}>
      {items.map((r) => <span key={r.reviewer.login} className={`pc-seg pc-seg-${r.verdict}`} title={`${r.reviewer.name ?? r.reviewer.login}: ${r.verdict}`} />)}
    </span>
  );
}
