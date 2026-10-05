import type { PrFile } from '../model';
export function FileHeat({ files, totalFiles, max = 3 }: { files: PrFile[]; totalFiles: number; max?: number }) {
  if (files.length === 0) return <div className="pc-files-heat pc-empty">No file details</div>;
  const top = files.slice(0, max);
  const peak = Math.max(1, ...top.map((f) => f.additions + f.deletions));
  return (
    <ul className="pc-files-heat">
      {top.map((f) => (
        <li key={f.path} className="pc-file">
          <span className="pc-file-path" title={f.path}>{f.path}</span>
          <span className="pc-file-nums"><span className="pc-add">+{f.additions}</span> <span className="pc-del">−{f.deletions}</span></span>
          <span className="pc-file-bar" aria-hidden="true"><span style={{ width: `${Math.round(((f.additions + f.deletions) / peak) * 100)}%` }} /></span>
        </li>
      ))}
      {totalFiles > top.length && <li className="pc-file pc-file-more">+ {totalFiles - top.length} more files</li>}
    </ul>
  );
}
