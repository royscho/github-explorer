export interface RepoOwnerDto {
  login: string;
  avatar_url: string;
  html_url: string;
}

export interface RepoLicenseDto {
  key: string;
  name: string;
  spdx_id: string | null;
}

export interface RepoDto {
  id: number;
  name: string;
  full_name: string;
  owner: RepoOwnerDto;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  created_at: string;
  updated_at: string;
  default_branch: string;
  // GitHub's `watchers_count` is a long-standing API quirk that always duplicates
  // `stargazers_count`; the real "people watching this repo" figure is `subscribers_count`
  // (only on the single-repo endpoint response — see `mapRepoDetails`).
  subscribers_count: number;
  license: RepoLicenseDto | null;
}
