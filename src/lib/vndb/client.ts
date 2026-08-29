/**
 * VNDB API v2 client.
 *
 * Guarantee set:
 *  - Serial request queue with a minimum gap (defaults to ~420ms) so the app
 *    stays well under the "200 requests / 5 minutes" and "1s execution time /
 *    minute" server limits.
 *  - Exponential backoff honoring `Retry-After` on 429s; limited retries on
 *    network failure / 5xx. Requests time out after 15s.
 *  - TTL cache (memory + sessionStorage) with in-flight request deduplication.
 *  - The auth token is ONLY attached to requests hitting *.vndb.org hosts.
 */

import type { ApiResponse, Endpoint, QueryBody } from './types';
import { joinUrl, sleep } from '../utils';
import { normalizeBooleanGroups } from './filters';

export type ApiErrorKind = 'http' | 'network' | 'timeout' | 'parse' | 'aborted';

export class ApiError extends Error {
  kind: ApiErrorKind;
  status?: number;
  retryAfter?: number;

  constructor(kind: ApiErrorKind, message: string, status?: number, retryAfter?: number) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

interface CacheEntry<T> {
  v: T;
  t: number; // timestamp stored (ms)
  ttl: number; // ms
}

class TTLCache {
  private mem = new Map<string, CacheEntry<unknown>>();
  private prefix = 'hanami.cache.v1:';
  private storageEnabled: boolean;

  constructor() {
    this.storageEnabled = typeof sessionStorage !== 'undefined';
    if (this.storageEnabled) this.gc();
  }

  private gc(): void {
    try {
      const now = Date.now();
      const dead: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (!k || !k.startsWith(this.prefix)) continue;
        try {
          const raw = sessionStorage.getItem(k);
          if (!raw) continue;
          const e = JSON.parse(raw) as CacheEntry<unknown>;
          if (now - e.t > e.ttl) dead.push(k);
        } catch {
          dead.push(k);
        }
      }
      dead.forEach((k) => sessionStorage.removeItem(k));
    } catch {
      /* storage full/blocked — degrade to memory-only */
    }
  }

  get<T>(key: string): T | null {
    const hit = this.mem.get(key);
    if (hit) {
      if (Date.now() - hit.t <= hit.ttl) return hit.v as T;
      this.mem.delete(key);
      return null;
    }
    if (!this.storageEnabled) return null;
    try {
      const raw = sessionStorage.getItem(this.prefix + key);
      if (!raw) return null;
      const e = JSON.parse(raw) as CacheEntry<T>;
      if (Date.now() - e.t > e.ttl) {
        sessionStorage.removeItem(this.prefix + key);
        return null;
      }
      this.mem.set(key, e as CacheEntry<unknown>);
      return e.v;
    } catch {
      return null;
    }
  }

  set<T>(key: string, value: T, ttl: number): void {
    if (ttl <= 0) return;
    const entry: CacheEntry<T> = { v: value, t: Date.now(), ttl };
    this.mem.set(key, entry as CacheEntry<unknown>);
    if (this.storageEnabled && ttl >= 60_000) {
      try {
        sessionStorage.setItem(this.prefix + key, JSON.stringify(entry));
      } catch {
        /* quota issues are fine: memory cache still works */
      }
    }
  }

  /** Drop every cached entry whose key starts with the given prefix. */
  invalidatePrefix(prefix: string): void {
    for (const k of Array.from(this.mem.keys())) {
      if (k.startsWith(prefix)) this.mem.delete(k);
    }
    if (!this.storageEnabled) return;
    try {
      const dead: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith(this.prefix + prefix)) dead.push(k);
      }
      dead.forEach((k) => sessionStorage.removeItem(k));
    } catch {
      /* ignore */
    }
  }

  clear(): void {
    this.mem.clear();
    if (!this.storageEnabled) return;
    try {
      const dead: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith(this.prefix)) dead.push(k);
      }
      dead.forEach((k) => sessionStorage.removeItem(k));
    } catch {
      /* ignore */
    }
  }

  get size(): number {
    return this.mem.size;
  }
}

export interface QueueEvent {
  type: 'queued' | 'start' | 'done' | 'error' | 'throttled';
  label: string;
  detail?: string;
  pending: number;
}

type QueueListener = (ev: QueueEvent) => void;

interface PendingTask<T> {
  run: () => Promise<T>;
  resolve: (v: T) => void;
  reject: (e: unknown) => void;
  label: string;
}

const DEFAULT_SPACING_MS = 420;
const MAX_QUEUE_WAIT_MS = 30_000;
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_ATTEMPTS = 3;

function stableKey(parts: unknown[]): string {
  // JSON.stringify is deterministic for our plain query objects (property
  // order is established at construction sites, never sorted from user input).
  try {
    return JSON.stringify(parts);
  } catch {
    return String(Date.now()) + Math.random();
  }
}

export class VndbClient {
  private baseUrl: string;
  private token: string | null = null;
  private cache = new TTLCache();
  private queue: PendingTask<unknown>[] = [];
  private running = false;
  private nextStartAt = 0;
  private inFlight = new Map<string, Promise<unknown>>();
  private listeners = new Set<QueueListener>();
  private recentRequests: number[] = [];
  private offlineNotified = false;

  constructor(baseUrl = 'https://api.vndb.org/kana') {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  setToken(token: string | null): void {
    this.token = token ? token.trim() : null;
  }

  getToken(): string | null {
    return this.token;
  }

  get isAuthenticated(): boolean {
    return this.token !== null && this.token.length > 0;
  }

  onEvent(l: QueueListener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  private emit(ev: QueueEvent): void {
    this.listeners.forEach((l) => {
      try {
        l(ev);
      } catch {
        /* listener must never break the queue */
      }
    });
  }

  /** Rolling-window request rate, displayed on the settings page. */
  requestsInWindow(windowMs = 300_000): number {
    const now = Date.now();
    this.recentRequests = this.recentRequests.filter((t) => now - t < windowMs);
    return this.recentRequests.length;
  }

  /** True when the base URL is an official VNDB host — token may be attached. */
  private maySendAuth(url: string): boolean {
    try {
      const host = new URL(url).hostname;
      return host === 'vndb.org' || host.endsWith('.vndb.org');
    } catch {
      return false;
    }
  }

  /* ------------------------------- raw fetch ------------------------------- */

  private async rawFetch<T>(
    path: string,
    init: RequestInit,
    timeoutMs = REQUEST_TIMEOUT_MS
  ): Promise<T> {
    const url = joinUrl(this.baseUrl, path);
    const controllers: AbortController[] = [];
    const timeout = setTimeout(() => {
      controllers.forEach((c) => c.abort());
    }, timeoutMs);
    controllers.push(new AbortController());

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (init.body) headers['Content-Type'] = 'application/json';
    if (this.token && this.maySendAuth(url)) headers.Authorization = `Token ${this.token}`;

    let res: Response;
    try {
      res = await fetch(url, {
        ...init,
        headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
        signal: controllers[0].signal
      });
    } catch (e) {
      clearTimeout(timeout);
      if (e instanceof DOMException && e.name === 'AbortError') {
        throw new ApiError('timeout', 'The request timed out. VNDB may be busy — please retry.');
      }
      throw new ApiError('network', 'Network error while contacting VNDB. Check your connection.');
    }
    clearTimeout(timeout);

    if (!res.ok) {
      const retryAfterRaw = res.headers.get('Retry-After');
      const retryAfter = retryAfterRaw ? Number(retryAfterRaw) : undefined;
      let msg = `VNDB returned HTTP ${res.status}`;
      try {
        const text = (await res.text()).trim();
        if (text) msg = text.length > 400 ? `${text.slice(0, 400)}…` : text;
      } catch {
        /* non-text body */
      }
      if (res.status === 401) msg = 'Invalid or expired API token. Sign in again (Settings → VNDB account).';
      if (res.status === 429) msg = 'Rate limited by VNDB — too many requests. Retrying with backoff.';
      throw new ApiError('http', msg, res.status, Number.isFinite(retryAfter) ? retryAfter : undefined);
    }

    if (res.status === 204) return undefined as T;
    try {
      return (await res.json()) as T;
    } catch {
      throw new ApiError('parse', 'Received an unreadable response from VNDB.');
    }
  }

  /* ------------------------------- queue core ------------------------------ */

  private enqueue<T>(task: Omit<PendingTask<T>, 'resolve' | 'reject'>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const full: PendingTask<T> = { ...task, resolve, reject };
      this.queue.push(full as PendingTask<unknown>);
      this.emit({ type: 'queued', label: task.label, pending: this.queue.length });
      void this.drain();
    });
  }

  private async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      while (this.queue.length > 0) {
        const task = this.queue.shift()!;
        const wait = this.nextStartAt - Date.now();
        if (wait > 0) await sleep(wait);
        this.recentRequests.push(Date.now());
        this.nextStartAt = Date.now() + DEFAULT_SPACING_MS;
        this.emit({ type: 'start', label: task.label, pending: this.queue.length });
        try {
          const result = await task.run();
          task.resolve(result);
          this.emit({ type: 'done', label: task.label, pending: this.queue.length });
        } catch (e) {
          task.reject(e);
          this.emit({
            type: 'error',
            label: task.label,
            detail: e instanceof Error ? e.message : String(e),
            pending: this.queue.length
          });
        }
      }
    } finally {
      this.running = false;
    }
  }

  /* ------------------------------ public APIs ------------------------------ */

  /**
   * POST query against a database endpoint, with caching + deduplication.
   * `ttlMs` 0 disables caching (default used for user-list data).
   */
  async query<T>(
    endpoint: Endpoint,
    body: QueryBody,
    opts: { ttlMs?: number; label?: string; signal?: AbortSignal } = {}
  ): Promise<ApiResponse<T>> {
    const safeBody: QueryBody = { ...body };
    // SOD-016: collapse single-child/empty boolean groups — the kana contract
    // defines and/or as taking "two or more" predicates, and the rewrite is
    // always semantically neutral.
    if (safeBody.filters !== undefined && safeBody.filters !== null) {
      safeBody.filters = normalizeBooleanGroups(safeBody.filters);
    }
    if (safeBody.results !== undefined) {
      safeBody.results = Math.max(0, Math.min(100, Math.floor(safeBody.results)));
    }
    if (safeBody.page !== undefined) {
      safeBody.page = Math.max(1, Math.min(10_000, Math.floor(safeBody.page)));
    }
    const key = stableKey(['post', endpoint, safeBody, this.token ? 'auth' : 'anon']);
    const ttl = opts.ttlMs ?? 5 * 60_000;
    const label = opts.label ?? `POST /${endpoint}`;

    if (ttl > 0) {
      const cached = this.cache.get<ApiResponse<T>>(key);
      if (cached) return cached;
    }
    const inflight = this.inFlight.get(key);
    if (inflight) return inflight as Promise<ApiResponse<T>>;

    const promise = this.enqueue<ApiResponse<T>>({
      label,
      run: () => this.withRetry(() => this.rawFetch<ApiResponse<T>>(endpoint, { method: 'POST', body: JSON.stringify(safeBody) }))
    });

    this.inFlight.set(key, promise);
    try {
      const result = await promise;
      if (ttl > 0) this.cache.set(key, result, ttl);
      return result;
    } finally {
      this.inFlight.delete(key);
    }
  }

  /** Authenticated GET (authinfo / ulist_labels). Never cached. */
  async getAuth<T>(path: string): Promise<T> {
    const label = `GET /${path}`;
    return this.enqueue<T>({
      label,
      run: () => this.withRetry(() => this.rawFetch<T>(path, { method: 'GET' }))
    });
  }

  /** Anonymous GET with caching (stats, schema, user lookup). */
  async getCached<T>(path: string, ttlMs: number): Promise<T> {
    const key = stableKey(['get', path]);
    const cached = this.cache.get<T>(key);
    if (cached) return cached;
    const inflight = this.inFlight.get(key);
    if (inflight) return inflight as Promise<T>;
    const promise = this.enqueue<T>({
      label: `GET /${path.split('?')[0]}`,
      run: () => this.withRetry(() => this.rawFetch<T>(path, { method: 'GET' }))
    });
    this.inFlight.set(key, promise);
    try {
      const result = await promise;
      this.cache.set(key, result, ttlMs);
      return result;
    } finally {
      this.inFlight.delete(key);
    }
  }

  /** PATCH /ulist/<id>, PATCH /rlist/<id> — returns nothing (204). */
  async patch(path: string, body: Record<string, unknown>): Promise<void> {
    await this.enqueue<void>({
      label: `PATCH /${path}`,
      run: async () => {
        await this.withRetry(() => this.rawFetch<void>(path, { method: 'PATCH', body: JSON.stringify(body) }), 2);
      }
    });
    // A write may affect labels/votes anywhere — drop all cached reads.
    this.cache.clear();
  }

  /** DELETE /ulist/<id>, DELETE /rlist/<id> — returns nothing (204). */
  async del(path: string): Promise<void> {
    await this.enqueue<void>({
      label: `DELETE /${path}`,
      run: () => this.rawFetch<void>(path, { method: 'DELETE' })
    });
    this.cache.invalidatePrefix('');
  }

  clearCache(): void {
    this.cache.clear();
  }

  cacheSize(): number {
    return this.cache.size;
  }

  /* ------------------------------- retry core ------------------------------ */

  private async withRetry<T>(fn: () => Promise<T>, maxAttempts = MAX_ATTEMPTS): Promise<T> {
    let attempt = 0;
    let last: unknown;
    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        return await fn();
      } catch (e) {
        last = e;
        if (e instanceof ApiError) {
          if (e.status === 401 || e.status === 400 || e.status === 404) throw e;
          if (e.kind === 'timeout' || e.kind === 'network' || e.status === 429 || (e.status !== undefined && e.status >= 500)) {
            if (attempt < maxAttempts) {
              const base = e.status === 429 ? (e.retryAfter ?? 5) * 1000 : 800 * 2 ** (attempt - 1);
              const wait = Math.min(base, MAX_QUEUE_WAIT_MS);
              if (e.status === 429) {
                this.emit({ type: 'throttled', label: 'rate-limit', detail: `waiting ${Math.ceil(wait / 1000)}s`, pending: this.queue.length });
              }
              await sleep(wait);
              continue;
            }
          }
        }
        throw e;
      }
    }
    throw last;
  }

  /** Notify-once helper for offline states. */
  noteOffline(cb?: () => void): void {
    if (!this.offlineNotified && typeof navigator !== 'undefined' && !navigator.onLine) {
      this.offlineNotified = true;
      cb?.();
    }
  }
}

/** Shared singleton — settings page mutates base URL / token through here. */
export const vndb = new VndbClient();
