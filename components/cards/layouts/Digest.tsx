import type { CardFamily, PrFacts } from '../model';
import { FRAME_WIDTH } from '../model';
import { ChangeBar, RepoMark, ReviewSegments, SnapshotStamp, StatusPill } from '../primitives';
import { ageLine, verdictSentence } from './shared';

export function Digest({ facts, family }: { facts: PrFacts; family: CardFamily }) {
  const hottest = facts.files[0];
  const churn = facts.diff.additions + facts.diff.deletions;
  const share = hottest && churn > 0 ? Math.round(((hottest.additions + hottest.deletions) / churn) * 100) : null;
  const latest = facts.state === 'merged' && facts.mergeCommit
    ? `Merged as ${facts.mergeCommit.slice(0, 7)} into ${facts.base}.`
    : verdictSentence(facts);
  return (
    <article className={`pc pc-${family} pc-digest`} style={{ width: FRAME_WIDTH.digest }}>
      <h2 className="pc-title pc-title-lg">{facts.title}</h2>
      <div className="pc-head">
        <StatusPill state={facts.state} />
        <span className="pc-num">#{facts.number}</span>
        <span className="pc-age">{ageLine(facts)}</span>
      </div>
      <ChangeBar additions={facts.diff.additions} deletions={facts.diff.deletions} height={6} />
      <div className="pc-stats">
        <span className="pc-add">+{facts.diff.additions.toLocaleString()}</span>
        <span className="pc-del">−{facts.diff.deletions.toLocaleString()}</span>
        <span className="pc-files">{facts.diff.files} files{share !== null && hottest ? ` · ${share}% in ${hottest.path.split('/').pop()}` : ''}</span>
      </div>
      <div className="pc-people"><ReviewSegments items={facts.reviews.items} /><span className="pc-digest-line">{latest}</span></div>
      <footer className="pc-foot">
        <RepoMark owner={facts.repo.owner} name={facts.repo.name} />
        <SnapshotStamp at={facts.snapshotAt} merged={facts.state === 'merged'} />
      </footer>
    </article>
  );
}
