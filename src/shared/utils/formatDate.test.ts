import { formatDate } from './formatDate';

describe('formatDate', () => {
  it('formats an ISO date as a localized absolute date', () => {
    const iso = '2020-05-24T16:15:54Z';
    const expected = new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(iso));
    expect(formatDate(iso)).toBe(expected);
  });

  it('returns an empty string for an unparseable date', () => {
    expect(formatDate('not-a-date')).toBe('');
  });
});
