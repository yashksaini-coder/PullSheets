export function ChangeBar({ additions, deletions, height = 4 }: { additions: number; deletions: number; height?: number }) {
  const total = Math.max(1, additions + deletions);
  const add = Math.round((additions / total) * 100);
  return (
    <div className="pc-bar" style={{ height }} role="img" aria-label={`+${additions} −${deletions}`}>
      <div className="pc-bar-add" style={{ width: `${add}%` }} />
      <div className="pc-bar-del" style={{ width: `${100 - add}%` }} />
    </div>
  );
}
