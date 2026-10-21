import { formatTime } from './formatTime';

describe('formatTime', () => {
  it('formats a date as a localized hour:minute string', () => {
    const date = new Date('2026-01-01T15:30:00.000Z');
    const expected = new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
    expect(formatTime(date)).toBe(expected);
  });
});
