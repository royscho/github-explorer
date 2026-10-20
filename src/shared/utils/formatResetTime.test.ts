import { formatResetTime } from './formatResetTime';

describe('formatResetTime', () => {
  it('formats a date as a localized hour:minute string', () => {
    const resetAt = new Date('2026-01-01T15:30:00.000Z');
    const expected = new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(resetAt);
    expect(formatResetTime(resetAt)).toBe(expected);
  });
});
