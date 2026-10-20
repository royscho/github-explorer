import { httpGet } from '@shared/api';
import { parseLinkHeader } from '@shared/utils';

import type { Repo, RepoDetails } from '../types';
import type { RepoDto } from './dto';
import { mapRepo, mapRepoDetails } from './mappers';

export interface OrgReposPage {
  repos: Repo[];
  hasNextPage: boolean;
}

export async function fetchOrgRepos(
  org: string,
  page: number,
  signal?: AbortSignal,
): Promise<OrgReposPage> {
  const { data, headers } = await httpGet<RepoDto[]>(
    `/orgs/${encodeURIComponent(org)}/repos`,
    {
      signal,
      searchParams: {
        per_page: '30',
        page: String(page),
        sort: 'updated',
      },
    },
  );

  const links = parseLinkHeader(headers.get('Link'));

  return {
    repos: data.map(mapRepo),
    hasNextPage: links.next !== undefined,
  };
}

export async function fetchRepoDetails(
  owner: string,
  repo: string,
  signal?: AbortSignal,
): Promise<RepoDetails> {
  const { data } = await httpGet<RepoDto>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    {
      signal,
    },
  );
  return mapRepoDetails(data);
}
