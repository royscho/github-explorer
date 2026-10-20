import { repoKeys } from './queryKeys';

describe('repoKeys', () => {
  it('exposes a stable root key', () => {
    expect(repoKeys.all).toEqual(['repos']);
  });

  it('builds an org list key prefixed by the root key', () => {
    expect(repoKeys.orgList('facebook')).toEqual(['repos', 'list', 'facebook']);
  });

  it('builds a detail key prefixed by the root key', () => {
    expect(repoKeys.detail('facebook', 'react')).toEqual([
      'repos',
      'detail',
      'facebook',
      'react',
    ]);
  });

  it('produces deep-equal keys for the same inputs', () => {
    expect(repoKeys.orgList('facebook')).toEqual(repoKeys.orgList('facebook'));
    expect(repoKeys.detail('facebook', 'react')).toEqual(
      repoKeys.detail('facebook', 'react'),
    );
  });

  it('normalizes case so differently-cased names share one cache entry', () => {
    expect(repoKeys.orgList('Facebook')).toEqual(repoKeys.orgList('facebook'));
    expect(repoKeys.detail('Facebook', 'React')).toEqual(
      repoKeys.detail('facebook', 'react'),
    );
  });
});
