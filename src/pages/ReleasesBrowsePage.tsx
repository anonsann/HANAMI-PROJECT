import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../lib/vndb/resource';
import { buildReleaseFilter, EMPTY_RELEASE_FILTER, type ReleaseFilterState } from '../lib/vndb/filters';
import { RELEASE_CARD } from '../lib/vndb/fields';
import type { Release } from '../lib/vndb/types';
import { dateSortKey, formatVndbDate, formatRating } from '../lib/format';
import { LANGUAGES, PLATFORMS, VOICED, MINAGES } from '../lib/vndb/enums';
import { useTitle } from '../hooks';
import { useSettings } from '../store/settings';
import { PageHeader } from '../components/PageBits';
import { Magnetize, SlideIn } from '../components/visual';
import { ChipGroup } from '../components/FiltersPanel';
import { CoverImage, PlatformBadges, LanguageBadges } from '../components/data';
import { Pager, Select, Skeleton, ErrorState, EmptyState, Toggle, Field } from '../components/ui';
import { commonToggle, numOrNull } from '../lib/pageUtils';
import { Icon } from '../components/icons';

export default function ReleasesBrowsePage() {
  useTitle('Releases');
  const pageSize = useSettings((s) => s.pageSize);
  const [state, setState] = useState<ReleaseFilterState>({ ...EMPTY_RELEASE_FILTER });
  const [page, setPage] = useState(1);

  const filter = useMemo(() => buildReleaseFilter(state), [state]);
  const body = useMemo(
    () => ({
      filters: filter ?? [],
      fields: RELEASE_CARD,
      sort: state.search.trim() ? 'searchrank' : 'released',
      reverse: true,
      results: pageSize,
      page,
      count: page === 1
    }),
    [filter, state.search, pageSize, page]
  );
  const res = useApi<Release>('release', body, { label: 'release browse' });
  const count = res.data?.count;
  const totalPages = count !== undefined ? Math.max(1, Math.ceil(count / pageSize)) : page + (res.data?.more ? 1 : 0);

  function set(patch: Partial<ReleaseFilterState>) {
    setState((s) => ({ ...s, ...patch }));
    setPage(1);
  }

  const rows = useMemo(() => [...(res.data?.results ?? [])].sort((a, b) => dateSortKey(b.released).localeCompare(dateSortKey(a.released))), [res.data]);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader kana="発売" title="Releases" actions={
        <button type="button" className="btn-quiet text-xs" onClick={() => { setState({ ...EMPTY_RELEASE_FILTER }); setPage(1); }}>
          <Icon name="refresh" size={13} /> Reset filters
        </button>
      }>
        Every physical and digital edition — trials, partials and complete releases across all languages and platforms.
      </PageHeader>

      <div className="card-surface grid gap-x-5 gap-y-4 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Search">
          <input className="input" value={state.search} onChange={(e) => set({ search: e.target.value })} placeholder="Edition title…" />
        </Field>
        <Field label="Release year">
          <div className="flex items-center gap-2">
            <input className="input" type="number" placeholder="From" value={state.yearFrom ?? ''} onChange={(e) => set({ yearFrom: numOrNull(e.target.value) })} aria-label="From year" />
            <span className="text-faint">–</span>
            <input className="input" type="number" placeholder="To" value={state.yearTo ?? ''} onChange={(e) => set({ yearTo: numOrNull(e.target.value) })} aria-label="To year" />
          </div>
        </Field>
        <Field label="Type">
          <Select ariaLabel="Release type" value={state.rtype ?? ''} onChange={(v) => set({ rtype: v || null })} options={[{ value: '', label: 'Any type' }, { value: 'complete', label: 'Complete' }, { value: 'partial', label: 'Partial' }, { value: 'trial', label: 'Trial' }]} />
        </Field>
        <Field label="Age rating (max)">
          <Select ariaLabel="Maximum age rating" value={state.minage === null ? '' : String(state.minage)} onChange={(v) => set({ minage: v === '' ? null : Number(v) })} options={[{ value: '', label: 'Any rating' }, ...MINAGES.map((m) => ({ value: String(m), label: `${m}+ or below` }))]} />
        </Field>
        <Field label="Special">
          <div className="flex flex-row flex-wrap gap-x-4 gap-y-2 pt-1">
            <Toggle checked={state.freeware} onChange={(v) => set({ freeware: v })} label="Freeware" />
            <Toggle checked={state.official} onChange={(v) => set({ official: v })} label="Official" />
            <Toggle checked={state.patch} onChange={(v) => set({ patch: v })} label="Patches" />
          </div>
        </Field>
        <Field label="Voicing">
          <Select ariaLabel="Voicing" value={state.voiced === null ? '' : String(state.voiced)} onChange={(v) => set({ voiced: v === '' ? null : Number(v) })} options={[{ value: '', label: 'Any' }, ...VOICED.slice(1).map((label, i) => ({ value: String(i + 1), label }))]} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Languages">
            <ChipGroup
              options={Object.entries(LANGUAGES).slice(0, 14).map(([value, label]) => ({ value, label }))}
              selected={state.langs}
              onToggle={(v) => set({ langs: commonToggle(state.langs, v) })}
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Platforms">
            <ChipGroup
              options={Object.entries(PLATFORMS).slice(0, 16).map(([value, label]) => ({ value, label }))}
              selected={state.platforms}
              onToggle={(v) => set({ platforms: commonToggle(state.platforms, v) })}
            />
          </Field>
        </div>
      </div>

      {res.status === 'loading' && !res.data ? (
        <ul className="space-y-2.5">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</ul>
      ) : res.status === 'error' ? (
        <ErrorState error={res.error} onRetry={res.reload} />
      ) : rows.length === 0 ? (
        <EmptyState title="No editions match." hint="Broaden the filters — 'official' or year ranges hide fan releases." />
      ) : (
        <SlideIn>
        <ul className="space-y-2.5">
          {rows.map((r) => {
            const front = (r.images ?? []).find((i) => i.type === 'pkgfront') ?? r.images?.[0];
            const vns = r.vns ?? [];
            return (
              <li key={r.id}>
                <Link to={`/r/${r.id}`} className="card-surface group flex gap-3 p-3 transition-colors hover:border-brand/40">
                  <CoverImage image={front} alt={r.title} className="w-16 shrink-0" placeholderLabel={r.title} />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-medium text-ink group-hover:text-brand">{r.title}</h3>
                    <p className="mt-0.5 text-xs text-faint">
                      {formatVndbDate(r.released)}
                      {r.minage !== null && r.minage !== undefined ? ` · ${r.minage}+` : ''}
                      {r.freeware ? ' · freeware' : ''}
                      {r.patch ? ' · patch' : ''}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <PlatformBadges platforms={r.platforms} max={6} />
                      <LanguageBadges languages={(r.languages ?? []).map((l) => l.lang)} max={5} />
                    </div>
                    {vns.length > 0 ? (
                      <p className="mt-1 truncate text-[11px] text-faint">
                        for {vns.map((v) => v.title ?? v.id).join(' · ')} {vns.some((v) => v.rating) ? `· ★ ${formatRating(vns.find((v) => v.rating)?.rating)}` : ''}
                      </p>
                    ) : null}
                  </div>
                  <Icon name="chevronRight" size={14} className="self-center text-faint" />
                </Link>
              </li>
            );
          })}
        </ul>
        </SlideIn>
      )}

      {count !== undefined && totalPages > 1 ? (
        <Pager page={page} totalPages={totalPages} onChange={setPage} />
      ) : res.data?.more ? (
        <div className="flex justify-center">
          <Magnetize strength={14}>
            <button type="button" className="btn-ghost" onClick={() => setPage((p) => p + 1)}>
              <Icon name="plus" size={15} /> Next page
            </button>
          </Magnetize>
        </div>
      ) : null}
    </div>
  );
}
