import type { CardFamily, PrFacts } from '../../model';
import { FRAME_WIDTH, relativeAge } from '../../model';
import { AvatarStack, TickBar } from '../../primitives';
import { peopleOf } from '../../layouts/shared';

const stamp = (iso: string) => iso.slice(0, 10).replace(/-/g, '.');
export function FuturisticStandard({ facts, family }: { facts: PrFacts; family: CardFamily }) {
  const age = relativeAge(new Date(facts.timestamps.opened), new Date(facts.snapshotAt)).replace(' ago', '').toUpperCase();
  const checks = facts.checks.total === 0 ? 'NO CI' : facts.checks.passed === facts.checks.total ? `${facts.checks.passed}/${facts.checks.total} PASS` : `${facts.checks.passed}/${facts.checks.total} ${facts.checks.items.some((c) => c.status === 'fail') ? 'FAIL' : 'RUN'}`;
  const rev = facts.reviews.items.map((r) => `${r.reviewer.login.slice(0, 2).toUpperCase()} ${r.verdict === 'approved' ? '✓' : r.verdict === 'changes' ? '✕' : '…'}`).join('  ') || '—';
  return (
    <article className={`pc pc-${family} pc-standard`} style={{ width: FRAME_WIDTH.standard }}>
      <i className="pc-bracket pc-bracket-tl" /><i className="pc-bracket pc-bracket-tr" /><i className="pc-bracket pc-bracket-bl" /><i className="pc-bracket pc-bracket-br" />
      <header className="pc-hud-head">
        <span className="pc-hud-sys">SYS // PR-{facts.number}</span>
        <span className="pc-hud-repo">{facts.repo.owner}.{facts.repo.name}</span>
      </header>
      <div className={`pc-hud-state pc-hud-state-${facts.state}`}>{facts.state.replace('-', ' ').toUpperCase()}{facts.type ? ` · ${facts.type.toUpperCase()}` : ''}</div>
      <h2 className="pc-title">{facts.title}</h2>
      {facts.body && <p className="pc-body">{facts.body}</p>}
      <dl className="pc-hud-grid">
        <dt>DIFF</dt><dd><span className="pc-add">+{facts.diff.additions}</span> <span className="pc-del">−{facts.diff.deletions}</span><TickBar additions={facts.diff.additions} deletions={facts.diff.deletions} /></dd>
        <dt>CI</dt><dd className={facts.checks.items.some((c) => c.status === 'fail') ? 'pc-hud-fail' : 'pc-hud-ok'}>{checks}</dd>
        <dt>REV</dt><dd className="pc-mono">{rev}</dd>
      </dl>
      <div className="pc-hud-foot">
        <AvatarStack people={peopleOf(facts).slice(0, 1)} size={20} />
        <span className="pc-hud-author">{(facts.author.name ?? facts.author.login).replace(/^(\w)\w*\s+/, '$1.').toUpperCase()}</span>
        <span className="pc-hud-branch">{facts.state === 'merged' && facts.mergeCommit ? facts.mergeCommit.slice(0, 7) : facts.head} ⟶ {facts.base}</span>
        <span className="pc-hud-time">T-{age} · {stamp(facts.snapshotAt)}</span>
      </div>
    </article>
  );
}
