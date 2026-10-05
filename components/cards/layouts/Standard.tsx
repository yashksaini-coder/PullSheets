import type { CardFamily, PrFacts } from '../model';
import { FRAME_WIDTH } from '../model';
import { AvatarStack, ChangeBar, Checks, RepoMark, SnapshotStamp, StatusPill, TypeChip } from '../primitives';
import { ageLine, firstName, peopleOf } from './shared';

export function Standard({ facts, family }: { facts: PrFacts; family: CardFamily }) {
  const merged = facts.state === 'merged';
  const verdicts = facts.reviews.items.map((r) => `${firstName(r.reviewer)} ${r.verdict === 'approved' ? 'approved' : r.verdict === 'changes' ? 'requested changes' : 'waiting'}`);
  return (
    <article className={`pc pc-${family} pc-standard`} style={{ width: FRAME_WIDTH.standard }}>
      <header className="pc-head">
        <StatusPill state={facts.state} />
        <TypeChip type={facts.type} />
        <span className="pc-num">#{facts.number}</span>
        <span className="pc-age">{ageLine(facts)}</span>
      </header>
      <h2 className="pc-title">{facts.title}</h2>
      {facts.body && <p className="pc-body">{facts.body}</p>}
      <div className="pc-branches">
        <code>{facts.head}</code> <span className="pc-arrow">→</span> <code>{facts.base}</code>
        {facts.mergeCommit && <code className="pc-sha">{facts.mergeCommit.slice(0, 7)}</code>}
      </div>
      <ChangeBar additions={facts.diff.additions} deletions={facts.diff.deletions} />
      <div className="pc-stats">
        <span className="pc-add">+{facts.diff.additions.toLocaleString()}</span>
        <span className="pc-del">−{facts.diff.deletions.toLocaleString()}</span>
        <span className="pc-files">{facts.diff.files} files</span>
        <Checks passed={facts.checks.passed} total={facts.checks.total} />
      </div>
      {facts.labels.length > 0 && (
        <div className="pc-labels">
          {facts.labels.slice(0, 3).map((l) => <span key={l} className="pc-label">{l}</span>)}
          {facts.labels.length > 3 && <span className="pc-label pc-label-more">+{facts.labels.length - 3}</span>}
        </div>
      )}
      <div className="pc-people">
        <AvatarStack people={peopleOf(facts)} />
        <span className="pc-verdicts">{[facts.author.name ?? facts.author.login, ...verdicts].join(' · ')}</span>
      </div>
      <footer className="pc-foot">
        <RepoMark owner={facts.repo.owner} name={facts.repo.name} />
        <SnapshotStamp at={facts.snapshotAt} merged={merged} />
      </footer>
    </article>
  );
}
