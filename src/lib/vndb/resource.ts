/**
 * React data hooks on top of the VndbClient:
 *  - useApi: single-shot query keyed by args, with abort-on-unmount semantics
 *  - usePagedQuery: page-based browsing with "load more" accumulation
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ApiResponse, Endpoint, QueryBody } from './types';
import { ApiError, vndb } from './client';

export type ResourceStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ResourceState<T> {
  status: ResourceStatus;
  data: ApiResponse<T> | null;
  error: ApiError | null;
  /** true while a re-fetch is in-flight with stale data visible. */
  refreshing: boolean;
  reload: () => void;
}

/**
 * Fetches `endpoint` with `body` whenever the JSON-encoded args change.
 * Pass `enabled=false` to keep the resource idle.
 */
export function useApi<T>(
  endpoint: Endpoint,
  body: QueryBody | null,
  opts: { ttlMs?: number; label?: string; enabled?: boolean } = {}
): ResourceState<T> {
  const enabled = opts.enabled !== false && body !== null;
  const bodyJson = useMemo(() => (body ? JSON.stringify(body) : null), [body]);
  const [state, setState] = useState<Omit<ResourceState<T>, 'reload'>>({
    status: enabled ? 'loading' : 'idle',
    data: null,
    error: null,
    refreshing: false
  });
  const gen = useRef(0);

  const run = useCallback(() => {
    if (!bodyJson) return;
    const myGen = ++gen.current;
    const parsed = JSON.parse(bodyJson) as QueryBody;
    setState((s) => ({
      status: 'loading',
      data: s.data,
      error: null,
      refreshing: s.status === 'success'
    }));
    vndb
      .query<T>(endpoint, parsed, { ttlMs: opts.ttlMs, label: opts.label })
      .then((data) => {
        if (gen.current === myGen) setState({ status: 'success', data, error: null, refreshing: false });
      })
      .catch((error) => {
        if (gen.current === myGen) {
          setState({
            status: 'error',
            data: null,
            error: error instanceof ApiError ? error : new ApiError('network', String(error)),
            refreshing: false
          });
        }
      });
     
  }, [endpoint, bodyJson, opts.ttlMs, opts.label]);

  useEffect(() => {
    if (enabled) run();
    return () => {
      gen.current += 1;
    };
     
  }, [run, enabled]);

  const reload = useCallback(() => {
    vndb.clearCache();
    run();
  }, [run]);

  return { ...state, reload };
}

export interface GetState<T> {
  status: ResourceStatus;
  data: T | null;
  error: ApiError | null;
  refreshing: boolean;
  reload: () => void;
}

/** GET convenience wrapper (stats / user lookups / labels), returns raw JSON. */
export function useGet<T>(path: string | null, ttlMs: number, opts: { auth?: boolean } = {}): GetState<T> {
  const [state, setState] = useState<GetState<T>>({
    status: path ? 'loading' : 'idle',
    data: null,
    error: null,
    refreshing: false,
    reload: () => undefined
  });
  const gen = useRef(0);

  const run = useCallback(() => {
    if (!path) return;
    const myGen = ++gen.current;
    setState((s) => ({ ...s, status: 'loading', error: null, refreshing: s.status === 'success' }));
    const req = opts.auth ? vndb.getAuth<T>(path) : vndb.getCached<T>(path, ttlMs);
    req
      .then((raw) => {
        if (gen.current === myGen)
          setState((s) => ({ ...s, status: 'success', data: raw, error: null, refreshing: false }));
      })
      .catch((error) => {
        if (gen.current === myGen)
          setState((s) => ({
            ...s,
            status: 'error',
            data: null,
            error: error instanceof ApiError ? error : new ApiError('network', String(error)),
            refreshing: false
          }));
      });
     
  }, [path, ttlMs, opts.auth]);

  useEffect(() => {
    if (path) run();
    return () => {
      gen.current += 1;
    };
  }, [run, path]);

  const reload = useCallback(() => {
    vndb.clearCache();
    run();
  }, [run]);

  return { ...state, reload };
}

/**
 * Accumulating pager: fetch page 1..n of a query and merge the results.
 */
export function usePager<T>(endpoint: Endpoint, body: QueryBody | null, opts: { ttlMs?: number; label?: string } = {}) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [total, setTotal] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<ResourceStatus>('idle');
  const [error, setError] = useState<ApiError | null>(null);
  const gen = useRef(0);
  const bodyJson = useMemo(() => (body ? JSON.stringify(body) : null), [body]);

  const fetchPage = useCallback(
    async (pageNo: number, reset: boolean) => {
      if (!bodyJson) return;
      const myGen = ++gen.current;
      setStatus('loading');
      setError(null);
      try {
        const parsed = JSON.parse(bodyJson) as QueryBody;
        const res = await vndb.query<T>(
          endpoint,
          { ...parsed, page: pageNo },
          { ttlMs: opts.ttlMs, label: `${opts.label ?? endpoint} p${pageNo}` }
        );
        if (gen.current !== myGen) return;
        setItems((prev) => (reset ? res.results : [...prev, ...res.results]));
        setMore(res.more);
        setTotal(res.count);
        setPage(pageNo);
        setStatus('success');
      } catch (e) {
        if (gen.current !== myGen) return;
        setError(e instanceof ApiError ? e : new ApiError('network', String(e)));
        setStatus('error');
      }
    },
     
    [endpoint, bodyJson, opts.ttlMs, opts.label]
  );

  useEffect(() => {
    setItems([]);
    setPage(1);
    void fetchPage(1, true);
    return () => {
      gen.current += 1;
    };
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (more && status !== 'loading') void fetchPage(page + 1, false);
  }, [more, status, page, fetchPage]);

  const reload = useCallback(() => {
    vndb.clearCache();
    void fetchPage(1, true);
  }, [fetchPage]);

  return { items, more, total, status, error, loadMore, reload, loadingMore: status === 'loading' && page > 0 };
}
