import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VndbClient } from './client';

function makeResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
}

const PAYLOAD = { results: [{ id: 'v1', title: 'X' }], more: false };

describe('VndbClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let client: VndbClient;

  beforeEach(() => {
    fetchMock = vi.fn(async () => makeResponse(PAYLOAD));
    vi.stubGlobal('fetch', fetchMock);
    client = new VndbClient('https://api.vndb.org/kana');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('performs POST queries with JSON bodies', async () => {
    const res = await client.query<unknown>('vn', { filters: ['id', '=', 'v1'], fields: 'id,title' });
    expect(res.results).toHaveLength(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.vndb.org/kana/vn');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toMatchObject({ filters: ['id', '=', 'v1'] });
  });

  it('caches successful responses within the TTL', async () => {
    const body = { filters: [], fields: 'id', ttlKey: 'a' };
    await client.query('vn', body, { ttlMs: 60_000 });
    await client.query('vn', body, { ttlMs: 60_000 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('deduplicates identical in-flight requests', async () => {
    const body = { filters: [], fields: 'id' };
    const [a, b] = await Promise.all([
      client.query('vn', body, { ttlMs: 0 }),
      client.query('vn', body, { ttlMs: 0 })
    ]);
    expect(a).toBe(b);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('never leaks the token to non-VNDB hosts', async () => {
    client.setToken('hsoo-ybws4-j8yb9-qxkw-5obay-px8to-bfyk');
    await client.query('vn', { fields: 'id' });
    const okHeaders = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(okHeaders.Authorization).toMatch(/^Token /);

    const rogue = new VndbClient('https://api.evil.example/kana');
    rogue.setToken('hsoo-ybws4-j8yb9-qxkw-5obay-px8to-bfyk');
    await rogue.query('vn', { fields: 'id' }, { ttlMs: 0 });
    const rogueHeaders = fetchMock.mock.calls[1][1].headers as Record<string, string>;
    expect(rogueHeaders.Authorization).toBeUndefined();
  });

  it('honors Retry-After on 429 and retries', async () => {
    const healthy = async () => makeResponse(PAYLOAD);
    fetchMock
      .mockImplementationOnce(async () => makeResponse('throttled', 429, { 'Retry-After': '0' }))
      .mockImplementation(healthy);
    const res = await client.query('vn', { fields: 'id' }, { ttlMs: 0 });
    expect(res.results).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry client errors (400) and surfaces ApiError', async () => {
    fetchMock.mockImplementation(async () => makeResponse('bad filter', 400));
    await expect(client.query('vn', { filters: ['nope'], fields: 'id' }, { ttlMs: 0 })).rejects.toMatchObject({
      kind: 'http',
      status: 400
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('turns 401 into a friendly auth message', async () => {
    fetchMock.mockImplementation(async () => makeResponse('unauthorized', 401));
    await expect(client.query('ulist', { filters: [], fields: 'id' }, { ttlMs: 0 })).rejects.toMatchObject({
      status: 401,
      message: expect.stringContaining('token')
    });
  });

  it('handles 204 responses for PATCH without requiring JSON', async () => {
    fetchMock.mockImplementation(async () => new Response(null, { status: 204 }));
    await client.patch('ulist/v17', { vote: 85 });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(String(init.body))).toEqual({ vote: 85 });
  });

  it('clamps results and page into API-accepted ranges', async () => {
    await client.query('vn', { results: 5000, page: -4, fields: 'id' }, { ttlMs: 0 });
    const body = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body)) as { results: number; page: number };
    expect(body.results).toBe(100);
    expect(body.page).toBe(1);
  });

  it('maps network failures to ApiError(kind=network) after retries', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(async () => {
      throw new TypeError('fetch failed');
    });
    const promise = client.query('vn', { fields: 'id' }, { ttlMs: 0 });
    const assertion = expect(promise).rejects.toMatchObject({ kind: 'network' });
    await vi.advanceTimersByTimeAsync(30_000);
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(3); // MAX_ATTEMPTS
  });

  it('tracks the rolling request budget', async () => {
    await client.query('vn', { fields: 'id' }, { ttlMs: 0 });
    await client.query('vn', { fields: 'title' }, { ttlMs: 0 });
    expect(client.requestsInWindow()).toBeGreaterThanOrEqual(2);
  });
});
