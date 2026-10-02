export interface GhUser { login: string; name?: string | null; avatar_url: string | null; type: 'User' | 'Bot' | 'Organization' }
export interface GhPull {
  number: number; title: string; body: string | null; state: 'open' | 'closed'; draft: boolean; merged: boolean;
  merge_commit_sha: string | null; mergeable_state?: string | null;
  user: GhUser; head: { ref: string; sha: string }; base: { ref: string; repo: { name: string; owner: { login: string }; private: boolean } };
  additions: number; deletions: number; changed_files: number; commits: number;
  labels: { name: string }[]; requested_reviewers?: GhUser[];
  created_at: string; updated_at: string; merged_at: string | null; closed_at: string | null;
}
export interface GhReview { user: GhUser; state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED' | 'PENDING'; submitted_at: string | null }
export interface GhFile { filename: string; additions: number; deletions: number }
export interface GhCheckRun { name: string; status: 'queued' | 'in_progress' | 'completed'; conclusion: string | null; started_at: string | null; completed_at: string | null }
