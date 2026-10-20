import { mapRepo, mapRepoDetails } from './mappers';
import type { RepoDto } from './dto';

function makeDto(overrides: Partial<RepoDto> = {}): RepoDto {
  return {
    id: 10270250,
    name: 'react',
    full_name: 'facebook/react',
    owner: {
      login: 'facebook',
      avatar_url: 'https://avatars.githubusercontent.com/u/69631',
      html_url: 'https://github.com/facebook',
    },
    description: 'The library for web and native user interfaces.',
    html_url: 'https://github.com/facebook/react',
    language: 'JavaScript',
    stargazers_count: 220000,
    forks_count: 45000,
    open_issues_count: 1200,
    watchers_count: 220000,
    created_at: '2013-05-24T16:15:54Z',
    updated_at: '2026-10-19T08:00:00Z',
    default_branch: 'main',
    license: { key: 'mit', name: 'MIT License', spdx_id: 'MIT' },
    ...overrides,
  };
}

describe('mapRepo', () => {
  it('maps a full DTO into a camelCase Repo with ISO date strings', () => {
    const repo = mapRepo(makeDto());

    expect(repo).toEqual({
      id: 10270250,
      name: 'react',
      fullName: 'facebook/react',
      owner: {
        login: 'facebook',
        avatarUrl: 'https://avatars.githubusercontent.com/u/69631',
        htmlUrl: 'https://github.com/facebook',
      },
      description: 'The library for web and native user interfaces.',
      htmlUrl: 'https://github.com/facebook/react',
      language: 'JavaScript',
      stars: 220000,
      forks: 45000,
      openIssues: 1200,
      watchers: 220000,
      createdAt: '2013-05-24T16:15:54Z',
      updatedAt: '2026-10-19T08:00:00Z',
    });
  });

  it('passes through null description and language', () => {
    const repo = mapRepo(makeDto({ description: null, language: null }));

    expect(repo.description).toBeNull();
    expect(repo.language).toBeNull();
  });
});

describe('mapRepoDetails', () => {
  it('adds defaultBranch and a mapped license', () => {
    const details = mapRepoDetails(makeDto());

    expect(details.defaultBranch).toBe('main');
    expect(details.license).toEqual({
      key: 'mit',
      name: 'MIT License',
      spdxId: 'MIT',
    });
  });

  it('maps a null license to null', () => {
    const details = mapRepoDetails(makeDto({ license: null }));

    expect(details.license).toBeNull();
  });
});
