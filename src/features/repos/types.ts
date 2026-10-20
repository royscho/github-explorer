export interface Owner {
  login: string;
  avatarUrl: string;
  htmlUrl: string;
}

export interface License {
  key: string;
  name: string;
  spdxId: string | null;
}

export interface Repo {
  id: number;
  name: string;
  fullName: string;
  owner: Owner;
  description: string | null;
  htmlUrl: string;
  language: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  /** ISO-8601 string, not a `Date` instance — `Repo` round-trips through JSON (favorites snapshot, cached queries). */
  createdAt: string;
  updatedAt: string;
}

export interface RepoDetails extends Repo {
  defaultBranch: string;
  license: License | null;
  // Only the single-repo endpoint (`GET /repos/{owner}/{repo}`) is trusted for this — see the
  // `subscribers_count` note on `RepoDto`.
  watchers: number;
}

/**
 * The `RepoDetails` route's params. Owned here (not `app/navigation`) so screens in this feature
 * can type their navigation/route hooks against a local `{ RepoDetails: RepoDetailsRouteParams }`
 * param list without importing `@app/navigation` — dependencies flow screens → shared, never back
 * up into `app/`. `app/navigation`'s `RootStackParamList` imports this type instead.
 */
export interface RepoDetailsRouteParams {
  owner: string;
  repo: string;
}
