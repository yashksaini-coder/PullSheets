import { formatSnapshot } from '../model';
export function SnapshotStamp({ at, merged }: { at: string; merged?: boolean }) {
  return <span className="pc-stamp">{merged ? 'MERGED' : 'SNAPSHOT'} · {formatSnapshot(new Date(at))}</span>;
}
