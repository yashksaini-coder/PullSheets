import type { CardFamily, PrFacts } from '../model';
import { FRAME_WIDTH } from '../model';
import { ChangeBar, StatusPill } from '../primitives';
import { ageLine, consequenceLine } from './shared';

export function Compact({ facts, family }: { facts: PrFacts; family: CardFamily }) {
  return (
    <article className={`pc pc-${family} pc-compact`} style={{ width: FRAME_WIDTH.compact }}>
      <header className="pc-head">
        <StatusPill state={facts.state} />
        <span className="pc-num">#{facts.number}</span>
        <span className="pc-age">{facts.state === 'merged' && facts.mergeCommit ? `${facts.mergeCommit.slice(0, 7)} → ${facts.base}` : ageLine(facts)}</span>
      </header>
      <h2 className="pc-title">{facts.title}</h2>
      <ChangeBar additions={facts.diff.additions} deletions={facts.diff.deletions} />
      <div className="pc-stats">
        <span className="pc-add" data-k="Change">+{facts.diff.additions.toLocaleString()}</span>
        <span className="pc-del">−{facts.diff.deletions.toLocaleString()}</span>
        <span className="pc-consequence">{consequenceLine(facts)}</span>
      </div>
    </article>
  );
}
