import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApi } from '../lib/vndb/resource';
import { TRAIT_CARD, TRAIT_DETAIL, CHARACTER_CARD } from '../lib/vndb/fields';
import type { Character, Trait } from '../lib/vndb/types';
import { useTitle, useDebouncedValue } from '../hooks';
import { renderDescription } from '../lib/markup';
import { useSettings } from '../store/settings';
import { PageHeader } from '../components/PageBits';
import { CoverImage } from '../components/data';
import { Pager, Skeleton, ErrorState, EmptyState, Field } from '../components/ui';
import { Reveal } from '../components/visual';
import { Icon } from '../components/icons';
import { cls } from '../lib/utils';
import { guessTotalPages } from '../lib/pageUtils';

const PAGE_SIZE = 60;

export default function TraitsPage() {
  useTitle('Traits');
  const [search, setSearch] = useState('');
  const [sortChars, setSortChars] = useState(true);
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search, 300);

  const body = useMemo(
    () => ({
      filters: debounced.trim() ? ['search', '=', debounced.trim()] : [],
      fields: TRAIT_CARD,
      sort: sortChars ? 'char_count' : debounced.trim() ? 'searchrank' : 'name',
      reverse: sortChars || !!debounced.trim(), // SOD-021: char_count & searchrank are desc-worthy
      results: PAGE_SIZE,
      page,
      count: page === 1
    }),
    [debounced, sortChars, page]
  );
  const res = useApi<Trait>('trait', body, { label: 'trait browse' });
  const count = res.data?.count;
  const totalPages = count !== undefined ? Math.max(1, Math.ceil(count / PAGE_SIZE)) : guessTotalPages(page, res.data?.more ?? false);

  // Group by trait group for a pleasing directory layout.
  const groups = useMemo(() => {
    const map = new Map<string, Trait[]>();
    (res.data?.results ?? []).forEach((t) => {
      const g = t.group_name ?? 'Miscellaneous';
      const list = map.get(g) ?? [];
      list.push(t);
      map.set(g, list);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [res.data]);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader kana="特性" title="Traits" actions={
        <label className="flex items-center gap-2 text-xs text-mute">
          <input type="checkbox" className="size-4 accent-[rgb(var(--c-brand))]" checked={sortChars} onChange={(e) => { setSortChars(e.target.checked); setPage(1); }} />
          Sort by usage
        </label>
      }>
        Character traits — hair, eyes, personality, roles and everything in between, grouped by family.
      </PageHeader>
      <div className="card-surface px-4 py-4">
        <Field label="Trait search">
          <input className="input" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="e.g. Twintails, Half-sister, Glasses…" />
        </Field>
      </div>

      {res.status === 'loading' && !res.data ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 15 }, (_, i) => <Skeleton key={i} className="h-11 rounded-lg" />)}</div>
      ) : res.status === 'error' ? (
        <ErrorState error={res.error} onRetry={res.reload} />
      ) : groups.length === 0 ? (
        <EmptyState title="No traits found." />
      ) : (
        <div className="space-y-5">
          {groups.map(([group, traits]) => (
            <Reveal key={group}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gold">{group}</h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {traits.map((t) => (
                  <Link
                    key={t.id}
                    to={`/i/${t.id}`}
                    className={cls('card-surface group flex items-center justify-between gap-2 px-4 py-2.5 transition-colors hover:border-brand/40', t.sexual && 'border-brand/20')}
                  >
                    <span className="min-w-0 truncate text-sm text-ink group-hover:text-brand">{t.name}</span>
                    <span className="shrink-0 font-mono text-xs text-faint">{t.char_count.toLocaleString()}</span>
                  </Link>
                ))}
              </div>
            </Reveal>
          ))}
        </div>
      )}
      {totalPages > 1 ? <Pager page={page} totalPages={totalPages} onChange={setPage} /> : null}
    </div>
  );
}

export function TraitDetailPage() {
  const { id = '' } = useParams();
  const spoilerMax = useSettings((s) => s.spoilerMax);
  const [page, setPage] = useState(1);

  const res = useApi<Trait>('trait', { filters: ['id', '=', id], fields: TRAIT_DETAIL, results: 1 }, { label: 'trait detail' });
  const trait = res.data?.results?.[0];
  useTitle(trait ? `Trait: ${trait.name}` : null);

  const chars = useApi<Character>(
    'character',
    { filters: ['trait', '=', [id, spoilerMax]], fields: CHARACTER_CARD, sort: 'id', results: 48, page },
    { label: 'trait characters', enabled: !!trait }
  );

  if (res.status === 'loading') return <div className="mx-auto max-w-6xl"><Skeleton className="h-40 rounded-xl" /></div>;
  if (res.status === 'error') return <ErrorState error={res.error} onRetry={res.reload} />;
  if (!trait) return <EmptyState title={`Trait ${id} not found.`} />;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Reveal className="card-surface p-6">
        <p className="font-jp text-xs tracking-[0.4em] text-brand">{trait.group_name ?? 'Trait'}</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold text-ink">{trait.name}</h1>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="chip">{trait.char_count.toLocaleString()} characters</span>
          {trait.sexual ? <span className="chip border-brand/40 text-brand">sexual trait</span> : null}
        </div>
        {trait.aliases && trait.aliases.length > 0 ? <p className="mt-2 text-xs text-faint">Also: {trait.aliases.join(', ')}</p> : null}
        {trait.description ? (
          <p className="mt-4 max-w-3xl font-serif text-sm leading-7 text-mute">{renderDescription(trait.description, spoilerMax, 'trait')}</p>
        ) : null}
      </Reveal>
      <Reveal>
        <h2 className="section-title mb-3">Characters with this trait</h2>
        {chars.status === 'loading' && !chars.data ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="aspect-[4/5] rounded-xl" />)}</div>
        ) : chars.status === 'error' ? (
          <ErrorState error={chars.error} onRetry={chars.reload} />
        ) : (chars.data?.results.length ?? 0) === 0 ? (
          <p className="text-sm text-faint">No characters currently match this trait.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {chars.data!.results.map((c) => (
              <Link key={c.id} to={`/c/${c.id}`} className="card-surface group overflow-hidden transition-shadow hover:shadow-lift">
                <CoverImage image={c.image} alt={c.name} aspect="aspect-[5/6]" className="rounded-none border-0" />
                <div className="p-2.5">
                  <h3 className="truncate text-sm font-medium text-ink group-hover:text-brand">{c.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        )}
        {chars.data?.more ? (
          <div className="mt-4 flex justify-center">
            <button type="button" className="btn-ghost" onClick={() => setPage((p) => p + 1)}>
              <Icon name="plus" size={14} /> Next page
            </button>
          </div>
        ) : null}
      </Reveal>
    </div>
  );
}
