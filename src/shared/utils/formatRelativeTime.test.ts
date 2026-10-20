import { formatRelativeTime } from './formatRelativeTime';

const NOW = new Date('2026-01-10T12:00:00.000Z');

function isoBefore(seconds: number): string {
  return new Date(NOW.getTime() - seconds * 1000).toISOString();
}

describe('formatRelativeTime', () => {
  it('returns "just now" for under a minute', () => {
    expect(formatRelativeTime(isoBefore(30), NOW)).toBe('just now');
  });

  it('formats minutes', () => {
    expect(formatRelativeTime(isoBefore(5 * 60), NOW)).toBe('5 minutes ago');
    expect(formatRelativeTime(isoBefore(60), NOW)).toBe('1 minute ago');
  });

  it('formats hours', () => {
    expect(formatRelativeTime(isoBefore(3 * 3600), NOW)).toBe('3 hours ago');
    expect(formatRelativeTime(isoBefore(3600), NOW)).toBe('1 hour ago');
  });

  it('formats days', () => {
    expect(formatRelativeTime(isoBefore(3 * 86400), NOW)).toBe('3 days ago');
    expect(formatRelativeTime(isoBefore(86400), NOW)).toBe('1 day ago');
  });

  it('formats months', () => {
    expect(formatRelativeTime(isoBefore(60 * 86400), NOW)).toBe('2 months ago');
  });

  it('formats years', () => {
    expect(formatRelativeTime(isoBefore(400 * 86400), NOW)).toBe('1 year ago');
  });

  it('treats a future date as "just now" rather than negative', () => {
    expect(formatRelativeTime(isoBefore(-100), NOW)).toBe('just now');
  });

  it('returns an empty string for an unparseable date instead of "NaN years ago"', () => {
    expect(formatRelativeTime('not-a-date', NOW)).toBe('');
  });
});
