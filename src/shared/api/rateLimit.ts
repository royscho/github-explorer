export interface RateLimitInfo {
  remaining: number;
  resetAt: Date;
}

export function parseRateLimitHeaders(headers: Headers): RateLimitInfo | null {
  const remainingHeader = headers.get('X-RateLimit-Remaining');
  const resetHeader = headers.get('X-RateLimit-Reset');

  if (remainingHeader === null || resetHeader === null) {
    return null;
  }

  const remaining = Number(remainingHeader);
  const resetSeconds = Number(resetHeader);

  if (Number.isNaN(remaining) || Number.isNaN(resetSeconds)) {
    return null;
  }

  return { remaining, resetAt: new Date(resetSeconds * 1000) };
}
