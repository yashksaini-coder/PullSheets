import type { PrCheck } from '../model';
const fmt = (s: number | null) => (s == null ? '' : s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`);
export function CheckList({ items, max = 4 }: { items: PrCheck[]; max?: number }) {
  if (items.length === 0) return <div className="pc-checklist pc-empty">No checks reported</div>;
  const shown = items.slice(0, max);
  return (
    <ul className="pc-checklist">
      {shown.map((c) => (
        <li key={c.name} className={`pc-check pc-check-${c.status}`}>
          <span className="pc-check-dot" aria-hidden="true" />
          <span className="pc-check-name">{c.name}</span>
          <span className="pc-check-meta">{c.status === 'pending' ? 'running' : c.status === 'fail' ? 'failed' : fmt(c.durationSec)}</span>
        </li>
      ))}
      {items.length > max && <li className="pc-check pc-check-more">+ {items.length - max} more</li>}
    </ul>
  );
}
