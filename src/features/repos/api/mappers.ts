import type { Owner, License, Repo, RepoDetails } from '../types';
import type { RepoDto, RepoLicenseDto, RepoOwnerDto } from './dto';

function mapOwner(dto: RepoOwnerDto): Owner {
  return {
    login: dto.login,
    avatarUrl: dto.avatar_url,
    htmlUrl: dto.html_url,
  };
}

function mapLicense(dto: RepoLicenseDto): License {
  return {
    key: dto.key,
    name: dto.name,
    spdxId: dto.spdx_id,
  };
}

export function mapRepo(dto: RepoDto): Repo {
  return {
    id: dto.id,
    name: dto.name,
    fullName: dto.full_name,
    owner: mapOwner(dto.owner),
    description: dto.description,
    htmlUrl: dto.html_url,
    language: dto.language,
    stars: dto.stargazers_count,
    forks: dto.forks_count,
    openIssues: dto.open_issues_count,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}

export function mapRepoDetails(dto: RepoDto): RepoDetails {
  return {
    ...mapRepo(dto),
    defaultBranch: dto.default_branch,
    license: dto.license ? mapLicense(dto.license) : null,
    watchers: dto.subscribers_count,
  };
}
