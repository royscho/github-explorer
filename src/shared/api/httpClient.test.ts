import {
  ApiError,
  NetworkError,
  NotFoundError,
  RateLimitError,
} from './errors';
import { httpGet } from './httpClient';

function makeResponse(options: {
  ok: boolean;
  status?: number;
  headers?: Record<string, string>;
  body?: unknown;
}): Response {
  const { ok, status = 200, headers = {}, body = {} } = options;
  return {
    ok,
    status,
    headers: new Headers(headers),
    json: async () => body,
  } as unknown as Response;
}

describe('httpGet', () => {
  const fetchMock = jest.fn();
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it('resolves with the parsed JSON body and response headers on success', async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse({
        ok: true,
        headers: { Link: '<url>; rel="next"' },
        body: { id: 1 },
      }),
    );

    const result = await httpGet<{ id: number }>('/orgs/facebook/repos');

    expect(result.data).toEqual({ id: 1 });
    expect(result.headers.get('Link')).toBe('<url>; rel="next"');
  });

  it('sends GitHub Accept + API-version headers and merges searchParams into the URL', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse({ ok: true, body: [] }));

    await httpGet('/orgs/facebook/repos', {
      searchParams: { per_page: '30', page: '2' },
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      'https://api.github.com/orgs/facebook/repos?per_page=30&page=2',
    );
    expect(init.headers).toMatchObject({
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    });
  });

  it('rejects with NotFoundError on a 404', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse({ ok: false, status: 404 }));

    await expect(httpGet('/repos/facebook/missing')).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('rejects with RateLimitError on a 403 with X-RateLimit-Remaining: 0', async () => {
    const resetSeconds = 1_800_000_000;
    fetchMock.mockResolvedValueOnce(
      makeResponse({
        ok: false,
        status: 403,
        headers: {
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(resetSeconds),
        },
      }),
    );

    const error = await httpGet('/orgs/facebook/repos').catch(e => e);

    expect(error).toBeInstanceOf(RateLimitError);
    expect((error as RateLimitError).resetAt).toEqual(
      new Date(resetSeconds * 1000),
    );
  });

  it('rejects with RateLimitError on a 429 with X-RateLimit-Remaining: 0', async () => {
    const resetSeconds = 1_800_000_000;
    fetchMock.mockResolvedValueOnce(
      makeResponse({
        ok: false,
        status: 429,
        headers: {
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(resetSeconds),
        },
      }),
    );

    await expect(httpGet('/orgs/facebook/repos')).rejects.toBeInstanceOf(
      RateLimitError,
    );
  });

  it('rejects with a generic ApiError on a 403 that is not a quota rate limit', async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse({
        ok: false,
        status: 403,
        headers: {
          'X-RateLimit-Remaining': '10',
          'X-RateLimit-Reset': '1800000000',
        },
      }),
    );

    const error = await httpGet('/orgs/facebook/repos').catch(e => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).not.toBeInstanceOf(RateLimitError);
    expect((error as ApiError).status).toBe(403);
  });

  it('rejects with ApiError carrying the status on other 4xx/5xx responses', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse({ ok: false, status: 500 }));

    const error = await httpGet('/orgs/facebook/repos').catch(e => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(500);
  });

  it('rejects with a generic ApiError on a 403 with no rate-limit headers at all', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse({ ok: false, status: 403 }));

    const error = await httpGet('/orgs/facebook/repos').catch(e => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).not.toBeInstanceOf(RateLimitError);
  });

  it('rejects with NetworkError when fetch itself rejects', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));

    await expect(httpGet('/orgs/facebook/repos')).rejects.toBeInstanceOf(
      NetworkError,
    );
  });

  it('rejects with NetworkError when a successful response body is not valid JSON', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => {
        throw new SyntaxError('Unexpected token <');
      },
    } as unknown as Response);

    await expect(httpGet('/orgs/facebook/repos')).rejects.toBeInstanceOf(
      NetworkError,
    );
  });

  it('removes the caller abort listener once the request settles', async () => {
    const controller = new AbortController();
    const removeEventListenerSpy = jest.spyOn(
      controller.signal,
      'removeEventListener',
    );
    fetchMock.mockResolvedValueOnce(makeResponse({ ok: true, body: {} }));

    await httpGet('/orgs/facebook/repos', { signal: controller.signal });

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'abort',
      expect.any(Function),
    );
  });

  it('clears the internal timeout after a successful response, so it cannot fire late', async () => {
    const clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout');
    fetchMock.mockResolvedValueOnce(makeResponse({ ok: true, body: {} }));

    await httpGet('/orgs/facebook/repos');

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('rejects with NetworkError when the request times out', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            const abortError = new Error('Aborted');
            abortError.name = 'AbortError';
            reject(abortError);
          });
        }),
    );

    const promise = httpGet('/orgs/facebook/repos');
    // Matches httpClient.ts's private TIMEOUT_MS; bump both together if that value changes.
    jest.advanceTimersByTime(10_000);

    await expect(promise).rejects.toBeInstanceOf(NetworkError);
  });

  it('rethrows the original AbortError, unwrapped, when the caller cancels', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            const abortError = new Error('Aborted');
            abortError.name = 'AbortError';
            reject(abortError);
          });
        }),
    );

    const promise = httpGet('/orgs/facebook/repos', {
      signal: controller.signal,
    });
    controller.abort();

    const error = await promise.catch(e => e);
    expect(error).not.toBeInstanceOf(NetworkError);
    expect((error as Error).name).toBe('AbortError');
  });

  it('rethrows an AbortError, unwrapped, when the caller signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          if (init.signal?.aborted) {
            const abortError = new Error('Aborted');
            abortError.name = 'AbortError';
            reject(abortError);
            return;
          }
        }),
    );

    const error = await httpGet('/orgs/facebook/repos', {
      signal: controller.signal,
    }).catch(e => e);
    expect(error).not.toBeInstanceOf(NetworkError);
    expect((error as Error).name).toBe('AbortError');
  });
});
