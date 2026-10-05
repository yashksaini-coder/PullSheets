import type { ReactNode } from 'react';
import type { CardFamily, PrFacts } from '../../model';
import { FRAME_WIDTH, relativeAge } from '../../model';

const glyphs = (a: number, d: number, width = 20) => {
  const total = Math.max(1, a + d);
  const plus = Math.round((a / total) * width);
  return '+'.repeat(plus) + '-'.repeat(Math.max(0, width - plus));
};
const Row = ({ k, children, className }: { k: string; children: ReactNode; className?: string }) => (
  <div className={`pc-term-row ${className ?? ''}`}><span className="pc-term-key">{k}</span><span className="pc-term-val">{children}</span></div>
);

export function TerminalStandard({ facts, family }: { facts: PrFacts; family: CardFamily }) {
  const age = relativeAge(new Date(facts.timestamps.opened), new Date(facts.snapshotAt)).replace(' ago', '');
  const checkNames = facts.checks.items.map((c) => c.name).join(' ');
  const checksOk = facts.checks.total > 0 && facts.checks.passed === facts.checks.total;
  const bar = glyphs(facts.diff.additions, facts.diff.deletions);
  const diffBar = facts.diff.additions + facts.diff.deletions === 0
    ? <span className="pc-term-dim">(no changes)</span>
    : <><span className="pc-add">{bar.replace(/-+$/, '')}</span><span className="pc-del">{bar.replace(/^\++/, '')}</span></>;
  return (
    <article className={`pc pc-${family} pc-standard`} style={{ width: FRAME_WIDTH.standard }}>
      <div className="pc-term-prompt"><span className="pc-term-dollar">$</span> <span>pullsheet show {facts.repo.owner}/{facts.repo.name}#{facts.number}</span></div>
      <div className="pc-term-rule">{'─'.repeat(46)}</div>
      <Row k="state" className={`pc-term-state-${facts.state}`}>[ {facts.state.replace('-', ' ').toUpperCase()} ]</Row>
      <Row k="type">{facts.type ?? '—'}<span className="pc-term-key pc-term-inline">age</span>{age}</Row>
      <Row k="title">{facts.title}</Row>
      {facts.body && <Row k="body">{facts.body}</Row>}
      <Row k="branch">{facts.state === 'merged' && facts.mergeCommit ? facts.mergeCommit.slice(0, 7) : facts.head} {'->'} {facts.base}</Row>
      <Row k="diff"><span className="pc-add">+{facts.diff.additions}</span> <span className="pc-del">-{facts.diff.deletions}</span> <span className="pc-term-diffstat">{diffBar}</span> {facts.diff.files} files</Row>
      <Row k="checks" className={checksOk ? 'pc-term-ok' : facts.checks.total === 0 ? '' : 'pc-term-warn'}>{facts.checks.passed}/{facts.checks.total} {checksOk ? '✓' : facts.checks.total === 0 ? '—' : '…'}{checkNames && <span className="pc-term-dim"> {checkNames}</span>}</Row>
      <Row k="review">{facts.reviews.items.length === 0 ? <span className="pc-term-dim">none requested</span> : facts.reviews.items.map((r) => (
        <span key={r.reviewer.login} className={`pc-term-line pc-term-rev-${r.verdict}`}>{r.reviewer.login} {r.verdict === 'approved' ? '✓ approved' : r.verdict === 'changes' ? '✕ changes' : r.verdict === 'commented' ? '· commented' : '… waiting'}</span>
      ))}</Row>
      <Row k="author">@{facts.author.login}{facts.author.name ? ` (${facts.author.name})` : ''}</Row>
      <Row k="snapshot">{facts.snapshotAt.slice(0, 16)}Z</Row>
      <div className="pc-term-cursor" aria-hidden="true">▌</div>
    </article>
  );
}
