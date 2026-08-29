import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApi } from '../lib/vndb/resource';
import { TAG_CARD, TAG_DETAIL, VN_CARD } from '../lib/vndb/fields';
import type { Tag, VisualNovel } from '../lib/vndb/types';
import { TAG_CATEGORIES, tagCategoryName, SPOILER_LEVELS } from '../lib/vndb/enums';
import { useTitle, useDebouncedValue } from '../hooks';
import { renderDescription } from '../lib/markup';
import { useSettings } from '../store/settings';
import { PageHeader } from '../components/PageBits';
import { Pager, Select, Skeleton, ErrorState, EmptyState, Field } from '../components/ui';
import { VnCard } from '../components/VnCard';
import { Reveal } from '../components/visual';
import { Icon } from '../components/icons';
import { cls } from '../lib/utils';

const PAGE_SIZE = 60;

export default function TagsPage() {
  useTitle('Tags');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [sortVnCount, setSortVnCount] = useState(false);
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search, 300);

  const filter = useMemo(() => {
    const parts: unknown[] = [];
    if (debounced.trim()) parts.push(['search', '=', debounced.trim()]);
    if (category) parts.push(['category', '=', category]);
    if (parts.length === 0) return [];
    if (parts.length === 1) return parts[0];
    return ['and', ...parts];
  }, [debounced, category]);

  const body = useMemo(
    () => ({
      filters: filter,
      fields: TAG_CARD,
      sort: sortVnCount ? 'vn_count' : debounced.trim() ? 'searchrank' : 'name',
      reverse: sortVnCount || !!debounced.trim(), // SOD-021: vn_count & searchrank are desc-worthy
      results: PAGE_SIZE,
      page,
      count: page === 1
    }),
    [filter, sortVnCount, debounced, page]
  );
  const res = useApi<Tag>('tag', body, { label: 'tag browse' });
  const count = res.data?.count;
  const totalPages = count !== undefined ? Math.max(1, Math.ceil(count / PAGE_SIZE)) : page + (res.data?.more ? 1 : 0);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader kana="標札" title="Tags" actions={
        <label className="flex items-center gap-2 text-xs text-mute">
          <input type="checkbox" className="size-4 accent-[rgb(var(--c-brand))]" checked={sortVnCount} onChange={(e) => { setSortVnCount(e.target.checked); setPage(1); }} />
          Sort by usage
        </label>
      }>
        The community's cataloguing vocabulary — content, technical and adult descriptors.
      </PageHeader>
      <div className="card-surface flex flex-wrap items-end gap-4 px-4 py-4">
        <Field label="Tag search" className="min-w-56 flex-1">
          <input className="input" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="e.g. Time Travel, Nakige…" />
        </Field>
        <Field label="Category" className="w-52">
          <Select ariaLabel="Tag category" value={category ?? ''} onChange={(v) => { setCategory(v || null); setPage(1); }} options={[{ value: '', label: 'All categories' }, ...Object.entries(TAG_CATEGORIES).map(([value, label]) => ({ value, label }))]} />
        </Field>
      </div>

      {res.status === 'loading' && !res.data ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 15 }, (_, i) => <Skeleton key={i} className="h-11 rounded-lg" />)}</div>
      ) : res.status === 'error' ? (
        <ErrorState error={res.error} onRetry={res.reload} />
      ) : (res.data?.results.length ?? 0) === 0 ? (
        <EmptyState title="No tags found." />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {res.data!.results.map((t) => (
            <Link
              key={t.id}
              to={`/g/${t.id}`}
              className={cls(
                'card-surface group flex items-center justify-between gap-2 px-4 py-2.5 transition-colors hover:border-brand/40',
                t.category === 'ero' && 'border-brand/20'
              )}
            >
              <div className="min-w-0">
                <span className="truncate text-sm text-ink group-hover:text-brand">{t.name}</span>
                <span className="ml-2 text-[10px] uppercase tracking-wider text-faint">{tagCategoryName(t.category)}</span>
              </div>
              <span className="shrink-0 font-mono text-xs text-faint">{t.vn_count.toLocaleString()}</span>
            </Link>
          ))}
        </div>
      )}
      {totalPages > 1 ? <Pager page={page} totalPages={totalPages} onChange={setPage} /> : null}
    </div>
  );
}

export function TagDetailPage() {
  const { id = '' } = useParams();
  const spoilerMax = useSettings((s) => s.spoilerMax);
  const [page, setPage] = useState(1);
  const pageSize = useSettings((s) => s.pageSize);

  const res = useApi<Tag>('tag', { filters: ['id', '=', id], fields: TAG_DETAIL, results: 1 }, { label: 'tag detail' });
  const tag = res.data?.results?.[0];
  useTitle(tag ? `Tag: ${tag.name}` : null);

  const vns = useApi<VisualNovel>(
    'vn',
    {
      filters: ['tag', '=', [id, spoilerMax, 1]],
      fields: VN_CARD,
      sort: 'rating',
      reverse: true,
      results: pageSize,
      page,
      count: page === 1
    },
    { label: 'tag vns', enabled: !!tag }
  );
  const count = vns.data?.count;
  const totalPages = count !== undefined ? Math.max(1, Math.ceil(count / pageSize)) : 1;

  if (res.status === 'loading') return <div className="mx-auto max-w-6xl"><Skeleton className="h-40 rounded-xl" /></div>;
  if (res.status === 'error') return <ErrorState error={res.error} onRetry={res.reload} />;
  if (!tag) return <EmptyState title={`Tag ${id} not found.`} />;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Reveal className="card-surface p-6">
        <p className="font-jp text-xs tracking-[0.4em] text-brand">{tagCategoryName(tag.category)}</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold text-ink">{tag.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="chip">Applied to {tag.vn_count.toLocaleString()} novels</span>
          <span className="chip">{tag.searchable ? 'searchable' : 'not searchable'}</span>
          <span className="chip">{tag.applicable ? 'applicable' : 'unrated'}</span>
        </div>
        {tag.aliases && tag.aliases.length > 0 ? <p className="mt-2 text-xs text-faint">Also: {tag.aliases.join(', ')}</p> : null}
        {tag.description ? (
          <p className="mt-4 max-w-3xl font-serif text-sm leading-7 text-mute">{renderDescription(tag.description, spoilerMax, 'tag')}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to={`/v?tag=${tag.id}`} className="btn-ghost py-1.5 text-xs">
            <Icon name="filter" size={13} /> Open in browse with filters
          </Link>
          <span className="self-center text-[11px] text-faint">Matches show tags up to “{SPOILER_LEVELS[spoilerMax]}” (change in Tuning)</span>
        </div>
      </Reveal>
      <Reveal>
        {vns.status === 'loading' && !vns.data ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="aspect-[2/3] rounded-xl" />)}</div>
        ) : vns.status === 'error' ? (
          <ErrorState error={vns.error} onRetry={vns.reload} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {(vns.data?.results ?? []).map((vn) => (
              <VnCard key={vn.id} vn={vn} />
            ))}
          </div>
        )}
      </Reveal>
      {totalPages > 1 ? <Pager page={page} totalPages={totalPages} onChange={setPage} /> : null}
    </div>
  );
}
