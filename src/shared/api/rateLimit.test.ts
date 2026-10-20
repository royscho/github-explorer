import { parseRateLimitHeaders } from './rateLimit';

function headersWith(entries: Record<string, string>): Headers {
  return new Headers(entries);
}

describe('parseRateLimitHeaders', () => {
  it('parses remaining and reset headers into a RateLimitInfo', () => {
    const resetSeconds = 1_800_000_000;
    const headers = headersWith({
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': String(resetSeconds),
    });

    expect(parseRateLimitHeaders(headers)).toEqual({
      remaining: 0,
      resetAt: new Date(resetSeconds * 1000),
    });
  });

  it('returns null when X-RateLimit-Remaining is missing', () => {
    const headers = headersWith({ 'X-RateLimit-Reset': '1800000000' });

    expect(parseRateLimitHeaders(headers)).toBeNull();
  });

  it('returns null when X-RateLimit-Reset is missing', () => {
    const headers = headersWith({ 'X-RateLimit-Remaining': '10' });

    expect(parseRateLimitHeaders(headers)).toBeNull();
  });

  it('returns null when a header value is not numeric', () => {
    const headers = headersWith({
      'X-RateLimit-Remaining': 'not-a-number',
      'X-RateLimit-Reset': '1800000000',
    });

    expect(parseRateLimitHeaders(headers)).toBeNull();
  });
});
