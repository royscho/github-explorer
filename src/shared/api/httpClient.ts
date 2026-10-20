import {
  ApiError,
  NetworkError,
  NotFoundError,
  RateLimitError,
} from './errors';
import { parseRateLimitHeaders } from './rateLimit';

const BASE_URL = 'https://api.github.com';
const TIMEOUT_MS = 10000;

export interface HttpResponse<T> {
  data: T;
  headers: Headers;
}

export interface HttpGetOptions {
  signal?: AbortSignal;
  searchParams?: Record<string, string>;
}

function buildUrl(path: string, searchParams?: Record<string, string>): string {
  const query = searchParams
    ? `?${new URLSearchParams(searchParams).toString()}`
    : '';
  return `${BASE_URL}${path}${query}`;
}

function mapErrorResponse(
  response: Response,
): NotFoundError | RateLimitError | ApiError {
  if (response.status === 404) {
    return new NotFoundError();
  }

  if (response.status === 403 || response.status === 429) {
    const rateLimit = parseRateLimitHeaders(response.headers);
    if (rateLimit && rateLimit.remaining === 0) {
      return new RateLimitError(rateLimit.resetAt);
    }
  }

  return new ApiError(response.status);
}

export async function httpGet<T>(
  path: string,
  options: HttpGetOptions = {},
): Promise<HttpResponse<T>> {
  const { signal: callerSignal, searchParams } = options;

  const controller = new AbortController();
  let timedOut = false;

  if (callerSignal?.aborted) {
    controller.abort();
  }

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, TIMEOUT_MS);

  const onCallerAbort = (): void => controller.abort();
  callerSignal?.addEventListener('abort', onCallerAbort);

  let response: Response;
  try {
    response = await fetch(buildUrl(path, searchParams), {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal: controller.signal,
    });
  } catch (error) {
    // Only the internal timeout and the caller's own signal ever abort `controller`, so once
    // aborted, `timedOut` tells us which one it was.
    if (controller.signal.aborted) {
      if (timedOut) {
        throw new NetworkError(error);
      }
      throw error;
    }

    throw new NetworkError(error);
  } finally {
    clearTimeout(timeoutId);
    callerSignal?.removeEventListener('abort', onCallerAbort);
  }

  if (!response.ok) {
    throw mapErrorResponse(response);
  }

  try {
    // Trusted boundary: the body is assumed to match T, GitHub's documented response shape, with
    // no runtime validation.
    const data = (await response.json()) as T;
    return { data, headers: response.headers };
  } catch (error) {
    // A 200 with a body that isn't valid JSON (e.g. a captive-portal HTML page) isn't something
    // the caller can act on differently from a network failure, so it's reported as one.
    throw new NetworkError(error);
  }
}
