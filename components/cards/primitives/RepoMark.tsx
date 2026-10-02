export function RepoMark({ owner, name }: { owner: string; name: string }) {
  return (
    <span className="pc-repo">
      <span className="pc-repo-tile" aria-hidden="true">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 2.5h7.5a1.5 1.5 0 0 1 1.5 1.5v9.5H4.5A1.5 1.5 0 0 1 3 12V2.5zM3 11h9" /></svg>
      </span>
      <span className="pc-repo-owner">{owner} /</span> {name}
    </span>
  );
}
