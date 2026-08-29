import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../lib/vndb/resource';
import { buildVnFilter, EMPTY_VN_FILTER, type VnFilterState } from '../lib/vndb/filters';
import { VN_CARD, TAG_CARD } from '../lib/vndb/fields';
import { vndb } from '../lib/vndb/client';
import type { Tag, VisualNovel } from '../lib/vndb/types';
import { cls, squeeze } from '../lib/utils';
import { useTitle } from '../hooks';
import { useSettings } from '../store/settings';
import { PageHeader } from '../components/PageBits';
import { VnFiltersPanel, type Meta } from '../components/FiltersPanel';
import { VnCard, VnRow } from '../components/VnCard';
import { Pager, Select, Skeleton, ErrorState, EmptyState } from '../components/ui';
import { Icon } from '../components/icons';

interface FullState extends VnFilterState {
  tagsIncMeta: Meta[];
  tagsExcMeta: Meta[];
}

const SORTS = [
  { value: 'rating|desc', label: 'Rating · high → low' },
  { value: 'rating|asc', label: 'Rating · low → high' },
  { value: 'votecount|desc', label: 'Popularity · most votes' },
  { value: 'released|desc', label: 'Release · newest first' },
  { value: 'released|asc', label: 'Release · oldest first' },
  { value: 'title|asc', label: 'Title · A → Z' },
  { value: 'title|desc', label: 'Title · Z → A' },
  { value: 'searchrank|desc', label: 'Search relevance' }
];

function readState(sp: URLSearchParams): FullState {
  const base: FullState = { ...EMPTY_VN_FILTER, tagsIncMeta: [], tagsExcMeta: [] };
  base.search = sp.get('search') ?? '';
  base.yearFrom = numOr(sp.get('yf'));
  base.yearTo = numOr(sp.get('yt'));
  base.minRating = numOr(sp.get('rating'));
  base.minVotecount = numOr(sp.get('votes'));
  base.lengths = (sp.get('len') ?? '').split(',').filter(Boolean).map(Number).filter((n) => n >= 1 && n <= 5);
  base.devstatus = sp.get('dev') === null ? null : numOr(sp.get('dev'));
  base.olang = sp.get('olang') || null;
  base.langs = (sp.get('lang') ?? '').split(',').filter(Boolean);
  base.platforms = (sp.get('plat') ?? '').split(',').filter(Boolean);
  base.tagsInc = (sp.get('tag') ?? '').split(',').filter(Boolean);
  base.tagsExc = (sp.get('xtag') ?? '').split(',').filter(Boolean);
  base.tagSpoiler = numOr(sp.get('tls')) ?? 0;
  base.hasAnime = sp.get('anime') === '1';
  base.hasScreenshot = sp.get('ss') === '1';
  base.hasReview = sp.get('rev') === '1';
  return base;
}

function numOr(v: string | null): number | null {
  if (v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function writeState(s: FullState, sort: string, page: number): URLSearchParams {
  const p = new URLSearchParams();
  if (s.search.trim()) p.set('search', s.search.trim());
  if (s.yearFrom !== null) p.set('yf', String(s.yearFrom));
  if (s.yearTo !== null) p.set('yt', String(s.yearTo));
  if (s.minRating !== null) p.set('rating', String(s.minRating));
  if (s.minVotecount !== null) p.set('votes', String(s.minVotecount));
  if (s.lengths.length) p.set('len', s.lengths.join(','));
  if (s.devstatus !== null) p.set('dev', String(s.devstatus));
  if (s.olang) p.set('olang', s.olang);
  if (s.langs.length) p.set('lang', s.langs.join(','));
  if (s.platforms.length) p.set('plat', s.platforms.join(','));
  if (s.tagsInc.length) p.set('tag', s.tagsInc.join(','));
  if (s.tagsExc.length) p.set('xtag', s.tagsExc.join(','));
  if (s.tagSpoiler) p.set('tls', String(s.tagSpoiler));
  if (s.hasAnime) p.set('anime', '1');
  if (s.hasScreenshot) p.set('ss', '1');
  if (s.hasReview) p.set('rev', '1');
  if (sort !== 'rating|desc') p.set('sort', sort);
  if (page > 1) p.set('page', String(page));
  return p;
}

export default function VnBrowsePage() {
  useTitle('Visual Novels');
  const [params, setParams] = useSearchParams();
  const pageSize = useSettings((s) => s.pageSize);
  const density = useSettings((s) => s.density);
  const [view, setView] = useState<'grid' | 'list'>(density === 'compact' ? 'list' : 'grid');

  const state = useMemo(() => readState(params), [params]);
  const sort = params.get('sort') ?? 'rating|desc';
  const page = Math.max(1, numOr(params.get('page')) ?? 1);

  const [meta, setMeta] = useState<Record<string, Meta>>({});

  // Resolve tag ids from the URL into display names once.
  React.useEffect(() => {
    const ids = [...state.tagsInc, ...state.tagsExc].filter((id) => !meta[id]);
    if (ids.length === 0) return;
    let cancelled = false;
    vndb
      .query<Tag>('tag', { filters: ids.length === 1 ? ['id', '=', ids[0]] : ['or', ...ids.map((id) => ['id', '=', id])], fields: TAG_CARD, results: Math.min(100, ids.length) }, { label: 'resolve tags' })
      .then((res) => {
        if (cancelled) return;
        setMeta((m) => {
          const next = { ...m };
          res.results.forEach((t) => (next[t.id] = { id: t.id, name: t.name }));
          ids.forEach((id) => {
            if (!next[id]) next[id] = { id, name: id };
          });
          return next;
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const fullState: FullState = useMemo(
    () => ({
      ...state,
      tagsIncMeta: state.tagsInc.map((id) => meta[id] ?? { id, name: id }),
      tagsExcMeta: state.tagsExc.map((id) => meta[id] ?? { id, name: id })
    }),
    [state, meta]
  );

  const [rawSortField, sortDirRaw] = sort.split('|') as [string, string];
  const sortDir = sortDirRaw === 'asc' ? 'asc' : 'desc';
  const hasSearch = squeeze(state.search).length > 0;
  // `searchrank` is only meaningful when a search filter is present.
  const sortField = !hasSearch && rawSortField === 'searchrank' ? 'rating' : rawSortField;
  const filter = useMemo(() => buildVnFilter(state), [state]);

  const body = useMemo(
    () => ({
      filters: filter ?? [],
      fields: VN_CARD,
      sort: sortField,
      reverse: sortDir === 'asc' ? false : true,
      results: pageSize,
      page,
      count: page === 1
    }),
    [filter, sortField, sortDir, pageSize, page]
  );

  const res = useApi<VisualNovel>('vn', body, { label: 'vn browse' });
  const count = res.data?.count;
  const totalPages = count !== undefined ? Math.max(1, Math.ceil(count / pageSize)) : page + (res.data?.more ? 1 : 0);

  function commit(next: FullState, nextSort = sort, nextPage = 1) {
    setParams(writeState(next, nextSort, nextPage), { replace: !hasSearch });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        kana="視覚小説"
        title="Visual Novels"
        actions={
          <div className="flex items-center gap-2">
            <Select ariaLabel="Sort order" value={sort} onChange={(v) => commit(state, v, 1)} options={SORTS} />
            <div className="flex rounded-lg border border-line bg-panel/60 p-0.5" role="group" aria-label="View mode">
              <button type="button" aria-label="Grid view" aria-pressed={view === 'grid'} onClick={() => setView('grid')} className={cls('rounded-md p-1.5', view === 'grid' ? 'bg-brand/20 text-brand' : 'text-faint hover:text-ink')}>
                <Icon name="grid" size={15} />
              </button>
              <button type="button" aria-label="List view" aria-pressed={view === 'list'} onClick={() => setView('list')} className={cls('rounded-md p-1.5', view === 'list' ? 'bg-brand/20 text-brand' : 'text-faint hover:text-ink')}>
                <Icon name="rows" size={15} />
              </button>
            </div>
          </div>
        }
      >
        Every visual novel in the archive, filterable down to the last ribbon of metadata.{' '}
        Combine languages, platforms, tags, ratings and more.
      </PageHeader>

      <VnFiltersPanel state={fullState} onChange={(s) => commit(s, sort, 1)} onReset={() => commit({ ...EMPTY_VN_FILTER, tagsIncMeta: [], tagsExcMeta: [] }, 'rating|desc', 1)} total={count} />

      {res.status === 'loading' && !res.data ? (
        view === 'grid' ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {Array.from({ length: 12 }, (_, i) => (
              <Skeleton key={i} className="aspect-[2/3.4] rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        )
      ) : res.status === 'error' ? (
        <ErrorState error={res.error} onRetry={res.reload} />
      ) : (res.data?.results.length ?? 0) === 0 ? (
        <EmptyState
          title="No pages turned up."
          hint="Loosen the filters — a tag, a year, a platform — and the archive will answer."
        />
      ) : (
        <>
          {view === 'grid' ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
              {res.data!.results.map((vn, i) => (
                <VnCard key={vn.id} vn={vn} priority={i < 6} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {res.data!.results.map((vn, i) => (
                <VnRow key={vn.id} vn={vn} rank={(page - 1) * pageSize + i + 1} />
              ))}
            </div>
          )}
          {count !== undefined && totalPages > 1 ? (
            <Pager page={page} totalPages={totalPages} onChange={(p) => commit(state, sort, p)} />
          ) : res.data?.more ? (
            <div className="flex justify-center">
              <button type="button" className="btn-ghost" onClick={() => commit(state, sort, page + 1)}>
                <Icon name="plus" size={15} /> Next page
              </button>
            </div>
          ) : null}
        </>
      )}

      {res.refreshing ? <p className="text-center text-xs text-faint">Refreshing…</p> : null}
    </div>
  );
}
