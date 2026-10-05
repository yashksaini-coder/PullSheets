import type { CardFamily, PrFacts } from '../model';
import { FRAME_WIDTH } from '../model';
import { AvatarStack, ChangeBar, StatusPill } from '../primitives';
import { ageLine, consequenceLine, peopleOf } from './shared';

export function QueueRow({ facts, family }: { facts: PrFacts; family: CardFamily }) {
  const age = ageLine(facts).replace(/^\w+ /, ''); // one source; the row has no space for the verb
  return (
    <article className={`pc pc-${family} pc-queue-row`} style={{ width: FRAME_WIDTH['queue-row'] }}>
      <span className={`pc-glyph pc-glyph-${facts.state}`} aria-hidden="true" />
      <div className="pc-row-main">
        <span className="pc-row-title">{facts.title} <span className="pc-num">#{facts.number}</span></span>
        <span className="pc-row-meta"><code>{facts.state === 'merged' && facts.mergeCommit ? facts.mergeCommit.slice(0, 7) : facts.head}</code> → <code>{facts.base}</code> · {facts.diff.files}f</span>
      </div>
      <div className="pc-row-change">
        <ChangeBar additions={facts.diff.additions} deletions={facts.diff.deletions} height={3} />
        <span className="pc-stats"><span className="pc-add">+{facts.diff.additions.toLocaleString()}</span><span className="pc-del">−{facts.diff.deletions.toLocaleString()}</span></span>
      </div>
      <AvatarStack people={peopleOf(facts)} size={20} />
      <span className="pc-row-status"><StatusPill state={facts.state} /><span className="pc-consequence">{consequenceLine(facts)}</span></span>
      <span className="pc-age">{age}</span>
    </article>
  );
}
