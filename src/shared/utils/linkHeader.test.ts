import { parseLinkHeader } from './linkHeader';

describe('parseLinkHeader', () => {
  it('parses a multi-rel Link header', () => {
    const header =
      '<https://api.github.com/orgs/facebook/repos?page=2>; rel="next", ' +
      '<https://api.github.com/orgs/facebook/repos?page=10>; rel="last"';

    expect(parseLinkHeader(header)).toEqual({
      next: 'https://api.github.com/orgs/facebook/repos?page=2',
      last: 'https://api.github.com/orgs/facebook/repos?page=10',
    });
  });

  it('returns an empty object for null input', () => {
    expect(parseLinkHeader(null)).toEqual({});
  });

  it('returns an empty object when there is no recognized rel', () => {
    expect(parseLinkHeader('not a link header')).toEqual({});
  });

  it('ignores unknown rel values', () => {
    const header =
      '<https://api.github.com/orgs/facebook/repos?page=2>; rel="unknown"';

    expect(parseLinkHeader(header)).toEqual({});
  });
});
