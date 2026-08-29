import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApi } from '../lib/vndb/resource';
import { STAFF_CARD, STAFF_DETAIL, VN_CARD, CHARACTER_CARD } from '../lib/vndb/fields';
import type { Character, Staff, VisualNovel } from '../lib/vndb/types';
import { languageName, LANGUAGES, STAFF_ROLES } from '../lib/vndb/enums';
import { useTitle, useDebouncedValue } from '../hooks';
import { renderDescription } from '../lib/markup';
import { useSettings } from '../store/settings';
import { PageHeader } from '../components/PageBits';
import { CoverImage, ExtlinkChips } from '../components/data';
import { VnCard } from '../components/VnCard';
import { Pager, Select, Skeleton, ErrorState, EmptyState, Toggle, Field } from '../components/ui';
import { Reveal } from '../components/visual';
import { Icon } from '../components/icons';

const PAGE_SIZE = 48;

export default function StaffPage() {
  useTitle('Staff');
  const [search, setSearch] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [lang, setLang] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [mainOnly, setMainOnly] = useState(true);
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search, 300);

  const filter = useMemo(() => {
    const parts: unknown[] = [];
    if (debounced.trim()) parts.push(['search', '=', debounced.trim()]);
    if (gender) parts.push(['gender', '=', gender]);
    if (lang) parts.push(['lang', '=', lang]);
    if (role) parts.push(['role', '=', role]);
    if (mainOnly) parts.push(['ismain', '=', 1]);
    if (parts.length === 0) return [];
    if (parts.length === 1) return parts[0];
    return ['and', ...parts];
  }, [debounced, gender, lang, role, mainOnly]);

  const body = useMemo(
    () => ({
      filters: filter,
      fields: `${STAFF_CARD},ismain`,
      sort: debounced.trim() ? 'searchrank' : 'name',
      reverse: false,
      results: PAGE_SIZE,
      page,
      count: page === 1
    }),
    [filter, debounced, page]
  );
  const res = useApi<Staff>('staff', body, { label: 'staff browse' });
  // The same main entry can repeat across aliases — dedupe by id when ismain is on.
  const rows = useMemo(() => {
    const seen = new Set<string>();
    return (res.data?.results ?? []).filter((s) => {
      const key = mainOnly ? s.id : `${s.id}/${s.aid}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [res.data, mainOnly]);
  const count = res.data?.count;
  const totalPages = count !== undefined ? Math.max(1, Math.ceil(count / PAGE_SIZE)) : page + (res.data?.more ? 1 : 0);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader kana="製作者" title="Staff & Voices">
        Scenario writers, artists, composers and the voices behind the characters.
      </PageHeader>
      <div className="card-surface grid gap-x-5 gap-y-4 px-4 py-4 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Name search">
          <input className="input" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="e.g. Maeda Jun, Yui Sakakibara…" />
        </Field>
        <Field label="Role">
          <Select ariaLabel="Role" value={role ?? ''} onChange={(v) => { setRole(v || null); setPage(1); }} options={[{ value: '', label: 'Any role' }, { value: 'seiyuu', label: 'Voice actor' }, ...Object.entries(STAFF_ROLES).map(([value, label]) => ({ value, label }))]} />
        </Field>
        <Field label="Gender">
          <Select ariaLabel="Gender" value={gender ?? ''} onChange={(v) => { setGender(v || null); setPage(1); }} options={[{ value: '', label: 'Any' }, { value: 'f', label: 'Female' }, { value: 'm', label: 'Male' }]} />
        </Field>
        <Field label="Language">
          <Select ariaLabel="Language" value={lang ?? ''} onChange={(v) => { setLang(v || null); setPage(1); }} options={[{ value: '', label: 'Any' }, ...Object.entries(LANGUAGES).map(([value, label]) => ({ value, label }))]} />
        </Field>
        <div className="flex items-end pb-1">
          <Toggle checked={mainOnly} onChange={(v) => { setMainOnly(v); setPage(1); }} label="Main names only" />
        </div>
      </div>

      {res.status === 'loading' && !res.data ? (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 12 }, (_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : res.status === 'error' ? (
        <ErrorState error={res.error} onRetry={res.reload} />
      ) : rows.length === 0 ? (
        <EmptyState title="No staff found." />
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((s) => (
            <Link key={`${s.id}-${s.aid ?? 'm'}`} to={`/s/${s.id}`} className="card-surface group flex items-center gap-3 p-4 transition-colors hover:border-brand/40">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-line bg-panel2 font-jp text-lg text-sky">
                {s.name.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-medium text-ink group-hover:text-brand">{s.name}</h3>
                <p className="truncate text-xs text-faint">
                  {s.gender === 'f' ? 'Female' : s.gender === 'm' ? 'Male' : ''}
                  {s.lang ? `${s.gender ? ' · ' : ''}${languageName(s.lang)}` : ''}
                  {s.original ? ` · ${s.original}` : ''}
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

export function StaffDetailPage() {
  const { id = '' } = useParams();
  const spoilerMax = useSettings((s) => s.spoilerMax);
  const res = useApi<Staff>(
    'staff',
    { filters: ['and', ['ismain', '=', 1], ['id', '=', id]], fields: STAFF_DETAIL, results: 1 },
    { label: 'staff detail' }
  );
  const staff = res.data?.results?.[0];
  useTitle(staff ? staff.name : null);

  const vns = useApi<VisualNovel>(
    'vn',
    { filters: ['staff', '=', ['id', '=', id]], fields: VN_CARD, sort: 'rating', reverse: true, results: 48 },
    { label: 'staff vns', enabled: !!staff }
  );
  const chars = useApi<Character>(
    'character',
    { filters: ['seiyuu', '=', ['id', '=', id]], fields: CHARACTER_CARD, results: 48 },
    { label: 'staff characters', enabled: !!staff }
  );

  if (res.status === 'loading') return <div className="mx-auto max-w-6xl"><Skeleton className="h-48 rounded-xl" /></div>;
  if (res.status === 'error') return <ErrorState error={res.error} onRetry={res.reload} />;
  if (!staff) return <EmptyState title={`Staff ${id} not found.`} />;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Reveal className="card-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-jp text-xs tracking-[0.4em] text-brand">
              {staff.gender === 'f' ? '彼女の筆' : staff.gender === 'm' ? '彼の筆' : '筆'}
            </p>
            <h1 className="mt-1 font-serif text-3xl font-semibold text-ink">{staff.name}</h1>
            {staff.original ? <p className="mt-1 font-jp text-lg text-mute">{staff.original}</p> : null}
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
              {staff.lang ? <span className="chip"><Icon name="globe" size={11} className="text-gold" /> {languageName(staff.lang)}</span> : null}
              {staff.gender ? <span className="chip">{staff.gender === 'f' ? 'Female' : 'Male'}</span> : null}
            </div>
          </div>
          <a href={`https://vndb.org/${staff.id}`} target="_blank" rel="noopener noreferrer" className="btn-ghost py-1.5 text-xs">
            <Icon name="external" size={13} /> vndb.org/{staff.id}
          </a>
        </div>
        {staff.aliases && staff.aliases.length > 1 ? (
          <div className="mt-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-faint">Known as</p>
            <div className="flex flex-wrap gap-1.5">
              {staff.aliases
                .filter((a) => !a.ismain)
                .map((a) => (
                  <span key={a.aid} className="chip" title={a.latin ?? undefined}>
                    {a.latin && a.latin !== a.name ? `${a.name} (${a.latin})` : a.name}
                  </span>
                ))}
            </div>
          </div>
        ) : null}
        {staff.description ? (
          <p className="mt-4 max-w-3xl font-serif text-sm leading-7 text-mute">{renderDescription(staff.description, spoilerMax, 'staff')}</p>
        ) : null}
        <div className="mt-4"><ExtlinkChips links={staff.extlinks} /></div>
      </Reveal>

      <Reveal>
        <h2 className="section-title mb-3">Credits</h2>
        {vns.status === 'loading' ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="aspect-[2/3] rounded-xl" />)}</div>
        ) : vns.status === 'error' ? (
          <ErrorState error={vns.error} onRetry={vns.reload} />
        ) : (vns.data?.results.length ?? 0) === 0 ? (
          <p className="text-sm text-faint">No visual novel credits found.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {vns.data!.results.map((vn) => (
              <VnCard key={vn.id} vn={vn} />
            ))}
          </div>
        )}
      </Reveal>

      {(chars.data?.results.length ?? 0) > 0 || chars.status === 'loading' ? (
        <Reveal>
          <h2 className="section-title mb-3">Voiced characters</h2>
          {chars.status === 'loading' ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="aspect-[4/5] rounded-xl" />)}</div>
          ) : chars.status === 'error' ? null : (
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
        </Reveal>
      ) : null}
    </div>
  );
}
