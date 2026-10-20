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
  watchers: number;
  /** ISO-8601 string, not a `Date` instance — `Repo` round-trips through JSON (favorites snapshot, cached queries). */
  createdAt: string;
  updatedAt: string;
}

export interface RepoDetails extends Repo {
  defaultBranch: string;
  license: License | null;
}
