import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApi } from '../lib/vndb/resource';
import { PRODUCER_CARD, PRODUCER_DETAIL, VN_CARD } from '../lib/vndb/fields';
import type { Producer, VisualNovel } from '../lib/vndb/types';
import { LANGUAGES, PRODUCER_TYPES, languageName, producerTypeName } from '../lib/vndb/enums';
import { useTitle } from '../hooks';
import { renderDescription } from '../lib/markup';
import { useSettings } from '../store/settings';
import { PageHeader } from '../components/PageBits';
import { ExtlinkChips } from '../components/data';
import { VnCard } from '../components/VnCard';
import { Pager, Select, Skeleton, ErrorState, EmptyState } from '../components/ui';
import { useDebouncedValue } from '../hooks';
import { Reveal } from '../components/visual';
import { Icon } from '../components/icons';

const PAGE_SIZE = 48;

export default function ProducersPage() {
  useTitle('Producers');
  const [search, setSearch] = useState('');
  const [type, setType] = useState<string | null>(null);
  const [lang, setLang] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search, 300);

  const filter = useMemo(() => {
    const parts: unknown[] = [];
    if (debounced.trim()) parts.push(['search', '=', debounced.trim()]);
    if (type) parts.push(['type', '=', type]);
    if (lang) parts.push(['lang', '=', lang]);
    if (parts.length === 0) return [];
    if (parts.length === 1) return parts[0];
    return ['and', ...parts];
  }, [debounced, type, lang]);

  const body = useMemo(
    () => ({
      filters: filter,
      fields: PRODUCER_CARD,
      sort: debounced.trim() ? 'searchrank' : 'name',
      reverse: false,
      results: PAGE_SIZE,
      page,
      count: page === 1
    }),
    [filter, debounced, page]
  );
  const res = useApi<Producer>('producer', body, { label: 'producer browse' });
  const count = res.data?.count;
  const totalPages = count !== undefined ? Math.max(1, Math.ceil(count / PAGE_SIZE)) : 1;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader kana="開発者" title="Producers">
        Studios, circles and lone auteurs behind the archive.
      </PageHeader>
      <div className="card-surface flex flex-wrap items-end gap-4 px-4 py-4">
        <div className="min-w-56 flex-1">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-faint" htmlFor="prod-search">Search</label>
          <input id="prod-search" className="input" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="e.g. Key, Nitroplus, Frontwing…" />
        </div>
        <div className="w-48">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-faint">Type</label>
          <Select ariaLabel="Producer type" value={type ?? ''} onChange={(v) => { setType(v || null); setPage(1); }} options={[{ value: '', label: 'All types' }, ...Object.entries(PRODUCER_TYPES).map(([value, label]) => ({ value, label }))]} />
        </div>
        <div className="w-56">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-faint">Language</label>
          <Select ariaLabel="Producer language" value={lang ?? ''} onChange={(v) => { setLang(v || null); setPage(1); }} options={[{ value: '', label: 'All languages' }, ...Object.entries(LANGUAGES).map(([value, label]) => ({ value, label }))]} />
        </div>
      </div>

      {res.status === 'loading' && !res.data ? (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 12 }, (_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : res.status === 'error' ? (
        <ErrorState error={res.error} onRetry={res.reload} />
      ) : (res.data?.results.length ?? 0) === 0 ? (
        <EmptyState title="No producers found." />
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {res.data!.results.map((p) => (
            <Link key={`${p.id}-${p.aid ?? ''}`} to={`/p/${p.id}`} className="card-surface group flex items-center gap-3 p-4 transition-colors hover:border-brand/40">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-line bg-panel2 font-jp text-lg text-gold">
                {p.name.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-medium text-ink group-hover:text-brand">{p.name}</h3>
                <p className="truncate text-xs text-faint">
                  {producerTypeName(p.type)}
                  {p.lang ? ` · ${languageName(p.lang)}` : ''}
                  {p.original ? ` · ${p.original}` : ''}
                </p>
              </div>
              <Icon name="chevronRight" size={14} className="text-faint" />
            </Link>
          ))}
        </div>
      )}
      {totalPages > 1 ? <Pager page={page} totalPages={totalPages} onChange={setPage} /> : null}
    </div>
  );
}

export function ProducerDetailPage() {
  const { id = '' } = useParams();
  const spoilerMax = useSettings((s) => s.spoilerMax);
  const res = useApi<Producer>('producer', { filters: ['id', '=', id], fields: PRODUCER_DETAIL, results: 1 }, { label: 'producer detail' });
  const producer = res.data?.results?.[0];
  useTitle(producer ? producer.name : null);

  const vns = useApi<VisualNovel>(
    'vn',
    { filters: ['developer', '=', ['id', '=', id]], fields: VN_CARD, sort: 'rating', reverse: true, results: 48 },
    { label: 'producer vns', enabled: !!producer }
  );

  if (res.status === 'loading') return <div className="mx-auto max-w-6xl"><Skeleton className="h-48 rounded-xl" /></div>;
  if (res.status === 'error') return <ErrorState error={res.error} onRetry={res.reload} />;
  if (!producer) return <EmptyState title={`Producer ${id} not found.`} />;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Reveal className="card-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-jp text-xs tracking-[0.4em] text-brand">{producerTypeName(producer.type)}</p>
            <h1 className="mt-1 font-serif text-3xl font-semibold text-ink">{producer.name}</h1>
            {producer.original ? <p className="mt-1 font-jp text-lg text-mute">{producer.original}</p> : null}
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
              {producer.lang ? <span className="chip"><Icon name="globe" size={11} className="text-gold" /> {languageName(producer.lang)}</span> : null}
              {producer.aliases?.map((a) => (
                <span key={a} className="chip">{a}</span>
              ))}
            </div>
          </div>
          <a href={`https://vndb.org/${producer.id}`} target="_blank" rel="noopener noreferrer" className="btn-ghost py-1.5 text-xs">
            <Icon name="external" size={13} /> vndb.org/{producer.id}
          </a>
        </div>
        {producer.description ? (
          <p className="mt-4 max-w-3xl font-serif text-sm leading-7 text-mute">{renderDescription(producer.description, spoilerMax, 'prod')}</p>
        ) : null}
        <div className="mt-4"><ExtlinkChips links={producer.extlinks} /></div>
      </Reveal>

      <Reveal>
        <h2 className="section-title mb-3">Novels by {producer.name}</h2>
        {vns.status === 'loading' ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="aspect-[2/3] rounded-xl" />)}</div>
        ) : vns.status === 'error' ? (
          <ErrorState error={vns.error} onRetry={vns.reload} />
        ) : (vns.data?.results.length ?? 0) === 0 ? (
          <p className="text-sm text-faint">No visual novels linked to this producer yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {vns.data!.results.map((vn) => (
              <VnCard key={vn.id} vn={vn} />
            ))}
          </div>
        )}
      </Reveal>
    </div>
  );
}
