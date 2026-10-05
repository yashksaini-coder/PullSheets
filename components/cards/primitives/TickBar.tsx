export function TickBar({ additions, deletions, ticks = 24 }: { additions: number; deletions: number; ticks?: number }) {
  const total = Math.max(1, additions + deletions);
  const addTicks = Math.round((additions / total) * ticks);
  return (
    <span className="pc-ticks" role="img" aria-label={`+${additions} −${deletions}`}>
      {Array.from({ length: ticks }, (_, i) => <i key={i} className={`pc-tick ${i < addTicks ? 'pc-tick-add' : 'pc-tick-del'}`} />)}
    </span>
  );
}
