import type { PrState } from '../model';
import { STATE_LABEL } from '../model';

const ICON: Record<PrState, string> = {
  open: 'M4 5.5v5M8 3.5h2a2 2 0 0 1 2 2v5', draft: 'M4 5.5v5', approved: 'M3 8l3 3 7-7', changes: 'M4 4l8 8M12 4l-8 8',
  'checks-failed': 'M4 4l8 8M12 4l-8 8', conflict: 'M8 3v6M8 12v1', merged: 'M4 5.5v5M4 5.5a6 6 0 0 0 8 5.5', closed: 'M4 4l8 8M12 4l-8 8',
};

export function StatusPill({ state }: { state: PrState }) {
  return (
    <span className={`pc-pill pc-pill-${state}`}>
      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <path d={ICON[state]} />
      </svg>
      {STATE_LABEL[state]}
    </span>
  );
}
