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
  watchers_count: number;
  created_at: string;
  updated_at: string;
  default_branch: string;
  license: RepoLicenseDto | null;
}
