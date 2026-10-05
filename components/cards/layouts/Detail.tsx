import type { CardFamily, PrFacts } from '../model';
import { FRAME_WIDTH } from '../model';
import { Avatar, CheckList, FileHeat, RepoMark, SnapshotStamp, StatusPill, TypeChip } from '../primitives';
import { ageLine, consequenceLine, shortName } from './shared';

export function DetailBody({ facts, wide }: { facts: PrFacts; wide?: boolean }) {
  return (
    <>
      <header className="pc-head">
        <StatusPill state={facts.state} />
        <TypeChip type={facts.type} />
        <span className="pc-num">#{facts.number}</span>
        <span className="pc-age">{consequenceLine(facts)}</span>
      </header>
      <h2 className="pc-title">{facts.title}</h2>
      {facts.body && <p className="pc-body">{facts.body}</p>}
      <div className="pc-author-line">
        <Avatar person={facts.author} size={20} />
        <span>{shortName(facts.author)}</span>
        <span className="pc-dot">·</span>
        <code>{facts.head}</code> → <code>{facts.base}</code>
        <span className="pc-dot">·</span>
        <span className="pc-author-age">{ageLine(facts)}</span>
      </div>
      <div className={wide ? 'pc-detail-cols' : 'pc-detail-stack'}>
        <section className="pc-panel"><h3 className="pc-panel-title">Checks</h3><CheckList items={facts.checks.items} /></section>
        <section className="pc-panel"><h3 className="pc-panel-title">Most changed</h3><FileHeat files={facts.files} totalFiles={facts.diff.files} /></section>
      </div>
      <footer className="pc-foot">
        <RepoMark owner={facts.repo.owner} name={facts.repo.name} />
        <span className="pc-foot-mid">{facts.reviews.items.length} reviewer{facts.reviews.items.length === 1 ? '' : 's'} · {facts.commits} commit{facts.commits === 1 ? '' : 's'}</span>
        <SnapshotStamp at={facts.snapshotAt} merged={facts.state === 'merged'} />
      </footer>
    </>
  );
}

export function Detail({ facts, family }: { facts: PrFacts; family: CardFamily }) {
  return <article className={`pc pc-${family} pc-detail`} style={{ width: FRAME_WIDTH.detail }}><DetailBody facts={facts} /></article>;
}
