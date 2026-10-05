import type { CardFamily, PrFacts } from '../../model';
import { FRAME_WIDTH, STATE_LABEL } from '../../model';
import { figuresSentence } from '../../layouts/shared';

const TYPE_WORD: Record<string, string> = { feat: 'Feature', fix: 'Fix', hotfix: 'Hotfix', chore: 'Chore', docs: 'Documentation', deps: 'Dependencies', release: 'Release', revert: 'Revert' };
const initialName = (name: string | null, login: string) => { if (!name) return login; const [first, ...rest] = name.split(' '); return rest.length ? `${first[0]}. ${rest.join(' ')}` : first; };
const longDate = (iso: string) => { const d = new Date(iso); const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()]; return `${d.getUTCDate()} ${m} ${d.getUTCFullYear()}`; };

export function EditorialStandard({ facts, family }: { facts: PrFacts; family: CardFamily }) {
  const dateline = [STATE_LABEL[facts.state], facts.type ? TYPE_WORD[facts.type] : null, `${facts.repo.owner} / ${facts.repo.name}`].filter(Boolean).join(' · ');
  const reviewed = facts.reviews.items.map((r) => `${initialName(r.reviewer.name, r.reviewer.login)} (${r.verdict})`).join(', ');
  return (
    <article className={`pc pc-${family} pc-standard`} style={{ width: FRAME_WIDTH.standard }}>
      <div className="pc-ed-dateline"><span>{dateline}</span><span>No. {facts.number}</span></div>
      <h2 className="pc-title pc-ed-headline">{facts.title}</h2>
      {facts.body && <p className="pc-body pc-ed-body">{facts.body}</p>}
      <p className="pc-ed-figures"><span className="pc-ed-lead">Figures.</span> {figuresSentence(facts)}</p>
      <div className="pc-ed-byline">
        <span>By {facts.author.name ?? facts.author.login}</span>
        {reviewed && <span> · Reviewed by {reviewed}</span>}
      </div>
      <div className="pc-ed-date">{longDate(facts.snapshotAt)}</div>
    </article>
  );
}
