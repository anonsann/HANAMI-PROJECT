import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApi } from '../lib/vndb/resource';
import { buildCharacterFilter, EMPTY_CHARACTER_FILTER, type CharacterFilterState } from '../lib/vndb/filters';
import { CHARACTER_CARD, CHARACTER_DETAIL } from '../lib/vndb/fields';
import type { Character } from '../lib/vndb/types';
import { useTitle, useDebouncedValue } from '../hooks';
import { renderDescription } from '../lib/markup';
import { gateSpoilers, gateSpoileredPair } from '../lib/spoiler';
import { formatVndbDate } from '../lib/format';
import { BLOOD_TYPES, CUP_SIZES, CHARACTER_ROLES, SEXES, GENDERS, SPOILER_LEVELS, characterRoleName } from '../lib/vndb/enums';
import { cls } from '../lib/utils';
import { useSettings } from '../store/settings';
import { PageHeader } from '../components/PageBits';
import { TagPicker, ChipGroup } from '../components/FiltersPanel';
import { CoverImage } from '../components/data';
import { Card, Pager, Select, Skeleton, ErrorState, EmptyState, RatingBar, Field } from '../components/ui';
import { Glare, Reveal, TiltCard } from '../components/visual';
import { Icon } from '../components/icons';

const PAGE_SIZE = 48;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CharactersPage() {
  useTitle('Characters');
  const [state, setState] = useState<CharacterFilterState & { sel: { id: string; name: string; sub?: string }[]; exc: { id: string; name: string; sub?: string }[] }>({
    ...EMPTY_CHARACTER_FILTER,
    sel: [],
    exc: []
  });
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(state.search, 300);

  function set(patch: Partial<typeof state>) {
    setState((s) => ({ ...s, ...patch }));
    setPage(1);
  }

  const filter = useMemo(() => buildCharacterFilter({ ...state, search: debouncedSearch }), [state, debouncedSearch]);
  const body = useMemo(
    () => ({
      filters: filter ?? [],
      fields: CHARACTER_CARD,
      sort: debouncedSearch.trim() ? 'searchrank' : 'id',
      reverse: !!debouncedSearch.trim(), // SOD-021: searchrank desc; id asc
      results: PAGE_SIZE,
      page,
      count: page === 1
    }),
    [filter, debouncedSearch, page]
  );
  const res = useApi<Character>('character', body, { label: 'character browse' });
  const count = res.data?.count;
  const totalPages = count !== undefined ? Math.max(1, Math.ceil(count / PAGE_SIZE)) : page + (res.data?.more ? 1 : 0);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader kana="登場人物" title="Characters" actions={
        <button type="button" className="btn-quiet text-xs" onClick={() => { setState({ ...EMPTY_CHARACTER_FILTER, sel: [], exc: [] }); setPage(1); }}>
          <Icon name="refresh" size={13} /> Reset
        </button>
      }>
        Everyone who ever said anything memorable. Filter by traits, role, and measurements.
      </PageHeader>

      <div className="card-surface grid gap-x-5 gap-y-4 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Name search">
          <input className="input" value={state.search} placeholder="e.g. Makise Kurisu…" onChange={(e) => set({ search: e.target.value })} />
        </Field>
        <Field label="Role">
          <Select ariaLabel="Character role" value={state.role ?? ''} onChange={(v) => set({ role: v || null })} options={[{ value: '', label: 'Any role' }, ...Object.entries(CHARACTER_ROLES).map(([value, label]) => ({ value, label }))]} />
        </Field>
        <Field label="Sex">
          <Select ariaLabel="Sex" value={state.sex ?? ''} onChange={(v) => set({ sex: v || null })} options={[{ value: '', label: 'Any' }, ...Object.entries(SEXES).map(([value, label]) => ({ value, label }))]} />
        </Field>
        <Field label="Gender">
          <Select ariaLabel="Gender" value={state.gender ?? ''} onChange={(v) => set({ gender: v || null })} options={[{ value: '', label: 'Any' }, ...Object.entries(GENDERS).map(([value, label]) => ({ value, label }))]} />
        </Field>
        <Field label="Blood type">
          <ChipGroup options={BLOOD_TYPES.map((b) => ({ value: b, label: b.toUpperCase() }))} selected={state.bloodType ? [state.bloodType] : []} onToggle={(v) => set({ bloodType: state.bloodType === v ? null : v })} />
        </Field>
        <Field label="Cup size">
          <Select ariaLabel="Cup size" value={state.cup ?? ''} onChange={(v) => set({ cup: v || null })} options={[{ value: '', label: 'Any' }, ...CUP_SIZES.map((c) => ({ value: c, label: c }))]} />
        </Field>
        <Field label="Height (cm)">
          <RangeInputs from={state.heightFrom} to={state.heightTo} onChange={(from, to) => set({ heightFrom: from, heightTo: to })} min={50} max={250} />
        </Field>
        <Field label="Weight (kg)">
          <RangeInputs from={state.weightFrom} to={state.weightTo} onChange={(from, to) => set({ weightFrom: from, weightTo: to })} min={20} max={250} />
        </Field>
        <Field label="Age">
          <RangeInputs from={state.ageFrom} to={state.ageTo} onChange={(from, to) => set({ ageFrom: from, ageTo: to })} min={0} max={120} />
        </Field>
        <Field label="Birthday">
          <div className="flex items-center gap-2">
            <Select ariaLabel="Birth month" className="flex-1" value={state.month === null ? '' : String(state.month)} onChange={(v) => set({ month: v === '' ? null : Number(v) })} options={[{ value: '', label: 'Any month' }, ...MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))]} />
            <input className="input w-24" type="number" min={1} max={31} placeholder="Day" value={state.day ?? ''} disabled={state.month === null} title={state.month === null ? 'Pick a month first' : undefined} onChange={(e) => set({ day: e.target.value ? Number(e.target.value) : null })} aria-label="Birth day (pick a month first)" />
          </div>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Include traits">
            <TagPicker kind="trait" selected={state.sel} onAdd={(t) => set({ traitsInc: [...state.traitsInc, t.id], sel: [...state.sel, t] })} onRemove={(id) => set({ traitsInc: state.traitsInc.filter((x) => x !== id), sel: state.sel.filter((x) => x.id !== id) })} placeholder="e.g. Twintails, Genius…" />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Trait spoiler cap">
            <Select ariaLabel="Trait spoiler cap" value={String(state.traitSpoiler)} onChange={(v) => set({ traitSpoiler: Number(v) })} options={SPOILER_LEVELS.map((label, i) => ({ value: String(i), label }))} />
          </Field>
        </div>
      </div>

      {res.status === 'loading' && !res.data ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">{Array.from({ length: 12 }, (_, i) => <Skeleton key={i} className="aspect-[4/5] rounded-xl" />)}</div>
      ) : res.status === 'error' ? (
        <ErrorState error={res.error} onRetry={res.reload} />
      ) : (res.data?.results.length ?? 0) === 0 ? (
        <EmptyState title="Nobody matches." hint="Ease the trait or measurement filters." />
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {res.data!.results.map((c) => (
            <TiltCard key={`${c.id}-${c.aid ?? ''}`} max={6}>
              <Card className="h-full overflow-hidden">
                <Link to={`/c/${c.id}`} className="group block">
                  <Glare>
                    <CoverImage image={c.image} alt={c.name} aspect="aspect-[5/6]" sizes="(min-width:768px) 180px, 30vw" className="rounded-none border-0" />
                  </Glare>
                  <div className="p-2.5">
                    <h3 className="truncate text-[13px] font-medium text-ink group-hover:text-brand">{c.name}</h3>
                    <p className="truncate text-[11px] text-faint">
                      {c.sex?.[0] ? `${SEXES[c.sex[0]] ?? ''} · ` : ''}
                      {(c.vns ?? []).length > 0 ? `${(c.vns ?? []).length} appearance${(c.vns ?? []).length > 1 ? 's' : ''}` : c.original ?? ''}
                    </p>
                  </div>
                </Link>
              </Card>
            </TiltCard>
          ))}
        </div>
      )}
      {totalPages > 1 ? <Pager page={page} totalPages={totalPages} onChange={setPage} /> : null}
    </div>
  );
}

function RangeInputs({ from, to, onChange, min, max }: { from: number | null; to: number | null; onChange: (f: number | null, t: number | null) => void; min: number; max: number }) {
  const cap = (n: number | null) => (n === null ? null : Math.max(min, Math.min(max, Math.round(n))));
  return (
    <div className="flex items-center gap-2">
      <input className="input" type="number" placeholder="Min" min={min} max={max} value={from ?? ''} onChange={(e) => onChange(cap(e.target.value ? Number(e.target.value) : null), to)} aria-label="Minimum" />
      <span className="text-faint">–</span>
      <input className="input" type="number" placeholder="Max" min={min} max={max} value={to ?? ''} onChange={(e) => onChange(from, cap(e.target.value ? Number(e.target.value) : null))} aria-label="Maximum" />
    </div>
  );
}

export function CharacterDetailPage() {
  const { id = '' } = useParams();
  const spoilerMax = useSettings((s) => s.spoilerMax);
  const res = useApi<Character>('character', { filters: ['id', '=', id], fields: CHARACTER_DETAIL, results: 1 }, { label: 'character detail' });
  const c = res.data?.results?.[0];
  useTitle(c ? c.name : null);
  const [showSpoilerRows, setShowSpoilerRows] = useState(false);

  const visibleTraits = useMemo(() => gateSpoilers(c?.traits ?? [], spoilerMax), [c, spoilerMax]);
  const traitGroups = useMemo(() => {
    const map = new Map<string, typeof visibleTraits>();
    visibleTraits.forEach((t) => {
      const g = t.group_name ?? 'Traits';
      const list = map.get(g) ?? [];
      list.push(t);
      map.set(g, list);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [visibleTraits]);

  const vns = c?.vns ?? [];
  const visibleVns = vns.filter((v) => (v.spoiler ?? 0) <= spoilerMax);
  const hiddenVns = vns.filter((v) => (v.spoiler ?? 0) > spoilerMax);
  const sex = gateSpoileredPair(c?.sex, spoilerMax);
  const gender = gateSpoileredPair(c?.gender, spoilerMax);

  if (res.status === 'loading') return <div className="mx-auto max-w-5xl"><Skeleton className="h-72 rounded-xl" /></div>;
  if (res.status === 'error') return <ErrorState error={res.error} onRetry={res.reload} />;
  if (!c) return <EmptyState title={`Character ${id} not found.`} />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Reveal className="card-surface p-6">
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="w-44 shrink-0">
            <CoverImage image={c.image} alt={c.name} eager aspect="aspect-[5/6]" />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-jp text-xs tracking-[0.4em] text-brand">登場人物</p>
                <h1 className="mt-1 font-serif text-3xl font-semibold text-ink">{c.name}</h1>
                {c.original ? <p className="mt-1 font-jp text-lg text-mute">{c.original}</p> : null}
              </div>
              <a href={`https://vndb.org/${c.id}`} target="_blank" rel="noopener noreferrer" className="btn-ghost py-1.5 text-xs">
                <Icon name="external" size={13} /> vndb.org/{c.id}
              </a>
            </div>
            {c.aliases && c.aliases.length > 0 ? (
              <p className="text-xs text-faint">Also known as: {c.aliases.join(', ')}</p>
            ) : null}
            <table className="table-zen max-w-lg">
              <tbody>
                {([
                  ['Sex', sex ? SEXES[sex] ?? sex : null],
                  ['Gender', gender ? GENDERS[gender] ?? gender : null],
                  ['Age', c.age !== null && c.age !== undefined ? `${c.age} years` : null],
                  ['Birthday', c.birthday ? `${MONTHS[c.birthday[0] - 1] ?? c.birthday[0]} ${c.birthday[1]}` : null],
                  ['Blood type', c.blood_type ? c.blood_type.toUpperCase() : null],
                  ['Height', c.height !== null && c.height !== undefined ? `${c.height} cm` : null],
                  ['Weight', c.weight !== null && c.weight !== undefined ? `${c.weight} kg` : null],
                  [
                    'Measurements',
                    c.bust !== null && c.bust !== undefined
                      ? `B${c.bust} · W${c.waist ?? '?'} · H${c.hips ?? '?'}${c.cup ? ` (${c.cup})` : ''}`
                      : null
                  ]
                ] as [string, string | null][]).map(([k, v]) => (
                  <tr key={k}>
                    <td className="w-32 text-xs uppercase tracking-wider text-faint">{k}</td>
                    <td className={cls('text-sm', v ? 'text-mute' : 'text-faint')}>{v ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {c.description ? (
          <p className="mt-5 max-w-3xl font-serif text-sm leading-7 text-mute">{renderDescription(c.description, spoilerMax, 'char')}</p>
        ) : null}
      </Reveal>

      {traitGroups.length > 0 ? (
        <Reveal className="space-y-3">
          <h2 className="section-title">Traits</h2>
          {traitGroups.map(([group, traits]) => (
            <div key={group}>
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-faint">{group}</h3>
              <div className="flex flex-wrap gap-1.5">
                {traits.map((t) => (
                  <Link key={`${t.id}-${t.lie ? 'l' : 'n'}`} to={`/i/${t.id}`} className="chip transition-colors hover:border-brand/60 hover:text-brand">
                    {t.name}
                    {t.lie ? <span className="text-gold" title="Misleading vote">±</span> : null}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </Reveal>
      ) : null}

      <Reveal className="space-y-3">
        <h2 className="section-title">Appearances</h2>
        {visibleVns.length === 0 && hiddenVns.length === 0 ? (
          <p className="text-sm text-faint">No recorded appearances.</p>
        ) : (
          <ul className="space-y-2">
            {visibleVns.map((v) => (
              <li key={`${v.id}-${v.release?.id ?? 'all'}`}>
                <Link to={`/v/${v.id}`} className="card-surface group flex items-center gap-3 p-2.5 transition-colors hover:border-brand/40">
                  <CoverImage image={v.image} alt={v.title ?? v.id} className="w-12 shrink-0" placeholderLabel={v.title ?? v.id} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink group-hover:text-brand">{v.title ?? v.id}</p>
                    <p className="text-xs text-faint">{formatVndbDate(v.released)}</p>
                  </div>
                  <span
                    className={cls(
                      'shrink-0 rounded-full px-2 py-0.5 text-[10px]',
                      v.role === 'main' ? 'bg-gold/15 text-gold' : v.role === 'primary' ? 'bg-brand/15 text-brand' : 'bg-panel2 text-faint'
                    )}
                  >
                    {characterRoleName(v.role ?? 'appears')}
                  </span>
                  {v.rating !== null && v.rating !== undefined ? (
                    <div className="hidden w-28 shrink-0 sm:block">
                      <RatingBar rating={v.rating} />
                    </div>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {hiddenVns.length > 0 ? (
          <div>
            <button type="button" className="btn-ghost py-1.5 text-xs" onClick={() => setShowSpoilerRows((v) => !v)}>
              <Icon name={showSpoilerRows ? 'eyeOff' : 'eye'} size={13} />
              {showSpoilerRows ? 'Hide' : 'Reveal'} {hiddenVns.length} spoiler appearance{hiddenVns.length > 1 ? 's' : ''}
            </button>
            {showSpoilerRows ? (
              <ul className="mt-2 space-y-2 opacity-85">
                {hiddenVns.map((v) => (
                  <li key={`${v.id}-${v.release?.id ?? 'all'}`} className="card-surface flex items-center gap-3 p-2.5">
                    <div className="min-w-0 flex-1">
                      <Link to={`/v/${v.id}`} className="truncate text-sm font-medium text-ink hover:text-brand">
                        {v.title ?? v.id}
                      </Link>
                    </div>
                    <span className="rounded-full bg-bad/15 px-2 py-0.5 text-[10px] text-bad">spoiler {v.spoiler}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </Reveal>
    </div>
  );
}
