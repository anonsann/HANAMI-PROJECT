import React, { useMemo, useState } from 'react';
import { cls } from '../lib/utils';
import { vndb } from '../lib/vndb/client';
import { TAG_CARD, TRAIT_CARD } from '../lib/vndb/fields';
import type { Tag, Trait } from '../lib/vndb/types';
import type { VnFilterState } from '../lib/vndb/filters';
import { useDebouncedValue } from '../hooks';
import { COMMON_LANGUAGES, COMMON_PLATFORMS, LANGUAGES, PLATFORMS, VN_LENGTHS, SPOILER_LEVELS, tagCategoryName } from '../lib/vndb/enums';
import { useSettings } from '../store/settings';
import { Icon } from './icons';
import { Select, Toggle } from './ui';

/* ------------------------------ Chip multi-select ---------------------------- */

export function ChipGroup({
  options,
  selected,
  onToggle,
  className
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cls('flex flex-wrap gap-1.5', className)}>
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(o.value)}
            className={cls(
              'rounded-full border px-2.5 py-1 text-xs transition-colors',
              on ? 'border-brand/70 bg-brand/15 text-brand' : 'border-line bg-panel/60 text-mute hover:text-ink'
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------------- Tag picker -------------------------------- */

export function TagPicker({
  selected,
  onAdd,
  onRemove,
  placeholder = 'Add tag…',
  kind = 'tag'
}: {
  selected: { id: string; name: string; sub?: string }[];
  onAdd: (t: { id: string; name: string; sub?: string }) => void;
  onRemove: (id: string) => void;
  placeholder?: string;
  kind?: 'tag' | 'trait';
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<{ id: string; name: string; sub?: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const debounced = useDebouncedValue(q, 250);

  React.useEffect(() => {
    const query = debounced.trim();
    if (query.length < 2) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    setBusy(true);
    const run = async () => {
      try {
        if (kind === 'tag') {
          const res = await vndb.query<Tag>(
            'tag',
            { filters: ['search', '=', query], fields: TAG_CARD, sort: 'vn_count', reverse: true, results: 8 },
            { label: 'tag suggest' }
          );
          if (!cancelled)
            setOptions(
              res.results.map((t) => ({ id: t.id, name: t.name, sub: `${tagCategoryName(t.category)} · ${t.vn_count.toLocaleString()} VNs` }))
            );
        } else {
          const res = await vndb.query<Trait>(
            'trait',
            { filters: ['search', '=', query], fields: TRAIT_CARD, sort: 'char_count', reverse: true, results: 8 },
            { label: 'trait suggest' }
          );
          if (!cancelled)
            setOptions(
              res.results.map((t) => ({
                id: t.id,
                name: t.name,
                sub: `${t.group_name ?? 'Trait'} · ${t.char_count.toLocaleString()} chars`
              }))
            );
        }
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setBusy(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [debounced, kind]);

  const selectedIds = useMemo(() => new Set(selected.map((s) => s.id)), [selected]);

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1.5">
        {selected.map((s) => (
          <span key={s.id} className="chip group" title={s.sub}>
            {s.name}
            <button type="button" onClick={() => onRemove(s.id)} aria-label={`Remove ${s.name}`} className="text-faint hover:text-bad">
              <Icon name="x" size={11} />
            </button>
          </span>
        ))}
      </div>
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        placeholder={placeholder}
        className="input mt-1.5"
        aria-label={placeholder}
      />
      {open && debounced.trim().length >= 2 ? (
        <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-line bg-panel shadow-lift">
          {busy ? (
            <p className="px-3 py-2.5 text-xs text-faint">Searching…</p>
          ) : options.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-faint">No {kind === 'tag' ? 'tags' : 'traits'} found.</p>
          ) : (
            options.map((o) => (
              <button
                key={o.id}
                type="button"
                disabled={selectedIds.has(o.id)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onAdd(o);
                  setQ('');
                  setOptions([]);
                }}
                className="flex w-full flex-col px-3 py-2 text-left transition-colors hover:bg-panel2 disabled:opacity-40"
              >
                <span className="text-sm text-ink">{o.name}</span>
                {o.sub ? <span className="text-[11px] text-faint">{o.sub}</span> : null}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------- VN filter UI ------------------------------- */

const CURRENT_YEAR = new Date().getFullYear();

export function VnFiltersPanel({
  state,
  onChange,
  onReset,
  total
}: {
  state: VnFilterState & { tagsIncMeta: Meta[]; tagsExcMeta: Meta[] };
  onChange: (next: VnFilterState & { tagsIncMeta: Meta[]; tagsExcMeta: Meta[] }) => void;
  onReset: () => void;
  total?: number;
}) {
  const spoilerMax = useSettings((s) => s.spoilerMax);
  const set = (patch: Partial<typeof state>) => onChange({ ...state, ...patch });
  const [open, setOpen] = useState(false);

  const toggleIn = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <div className="card-surface overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Icon name="filter" size={15} className="text-brand" />
          Filters
          {total !== undefined ? <span className="rounded-full bg-panel2 px-2 py-0.5 text-xs text-faint">{total.toLocaleString()} found</span> : null}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-quiet px-2 py-1 text-xs" onClick={onReset}>
            Reset
          </button>
          <button
            type="button"
            className="btn-quiet p-1 lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="Toggle filter panel"
          >
            <Icon name={open ? 'chevronUp' : 'chevronDown'} size={16} />
          </button>
        </div>
      </div>
      <div className={cls('grid gap-x-5 gap-y-4 px-4 py-4 sm:grid-cols-2 lg:grid-cols-3', !open && 'hidden lg:grid')}>
        <div className="sm:col-span-2 lg:col-span-1">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-faint" htmlFor="vnf-search">
            Title search
          </label>
          <input
            id="vnf-search"
            value={state.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="e.g. steins;gate, ひぐらし…"
            className="input"
          />
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-faint">Release year</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              className="input"
              placeholder="From"
              min={1980}
              max={CURRENT_YEAR + 3}
              value={state.yearFrom ?? ''}
              onChange={(e) => set({ yearFrom: e.target.value ? Number(e.target.value) : null })}
              aria-label="Year from"
            />
            <span className="text-faint">–</span>
            <input
              type="number"
              className="input"
              placeholder="To"
              min={1980}
              max={CURRENT_YEAR + 3}
              value={state.yearTo ?? ''}
              onChange={(e) => set({ yearTo: e.target.value ? Number(e.target.value) : null })}
              aria-label="Year to"
            />
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-faint">Original language</span>
          <Select
            ariaLabel="Original language"
            value={state.olang ?? ''}
            onChange={(v) => set({ olang: v || null })}
            options={[{ value: '', label: 'Any original language' }, ...Object.entries(LANGUAGES).map(([value, label]) => ({ value, label }))]}
          />
        </div>

        <div className="sm:col-span-2">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-faint">Available languages</span>
          <ChipGroup
            options={COMMON_LANGUAGES.map((c) => ({ value: c, label: LANGUAGES[c] ?? c }))}
            selected={state.langs}
            onToggle={(v) => set({ langs: toggleIn(state.langs, v) })}
          />
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-faint">Platforms</span>
          <ChipGroup
            options={COMMON_PLATFORMS.map((c) => ({ value: c, label: PLATFORMS[c] ?? c }))}
            selected={state.platforms}
            onToggle={(v) => set({ platforms: toggleIn(state.platforms, v) })}
          />
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-faint">Length</span>
          <ChipGroup
            options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: VN_LENGTHS[n] }))}
            selected={state.lengths.map(String)}
            onToggle={(v) => set({ lengths: toggleIn(state.lengths.map(String), v).map(Number) })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-faint" htmlFor="vnf-rating">
              Min rating
            </label>
            <input
              id="vnf-rating"
              type="number"
              className="input"
              placeholder="Any"
              min={10}
              max={100}
              step={1}
              value={state.minRating ?? ''}
              onChange={(e) => {
                const v = e.target.value ? Number(e.target.value) : null;
                set({ minRating: v !== null ? Math.max(10, Math.min(100, v)) : null });
              }}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-faint" htmlFor="vnf-votes">
              Min votes
            </label>
            <input
              id="vnf-votes"
              type="number"
              className="input"
              placeholder="Any"
              min={0}
              step={10}
              value={state.minVotecount ?? ''}
              onChange={(e) => set({ minVotecount: e.target.value ? Math.max(0, Number(e.target.value)) : null })}
            />
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-faint">Development status</span>
          <Select
            ariaLabel="Development status"
            value={state.devstatus === null ? '' : String(state.devstatus)}
            onChange={(v) => set({ devstatus: v === '' ? null : Number(v) })}
            options={[
              { value: '', label: 'Any status' },
              { value: '0', label: 'Finished' },
              { value: '1', label: 'In development' },
              { value: '2', label: 'Cancelled' }
            ]}
          />
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-faint">Has…</span>
          <div className="flex flex-col gap-2">
            <Toggle checked={state.hasAnime} onChange={(v) => set({ hasAnime: v })} label="Anime adaptation" />
            <Toggle checked={state.hasScreenshot} onChange={(v) => set({ hasScreenshot: v })} label="Screenshots" />
            <Toggle checked={state.hasDescription} onChange={(v) => set({ hasDescription: v })} label="Description" />
            <Toggle checked={state.hasReview} onChange={(v) => set({ hasReview: v })} label="Reviews" />
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-faint">Include tags</span>
          <TagPicker
            selected={state.tagsIncMeta}
            onAdd={(t) => set({ tagsInc: [...state.tagsInc, t.id], tagsIncMeta: [...state.tagsIncMeta, t] })}
            onRemove={(id) => set({ tagsInc: state.tagsInc.filter((x) => x !== id), tagsIncMeta: state.tagsIncMeta.filter((x) => x.id !== id) })}
            placeholder="e.g. Mystery, Time Travel…"
          />
        </div>
        <div>
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-faint">Exclude tags</span>
          <TagPicker
            selected={state.tagsExcMeta}
            onAdd={(t) => set({ tagsExc: [...state.tagsExc, t.id], tagsExcMeta: [...state.tagsExcMeta, t] })}
            onRemove={(id) => set({ tagsExc: state.tagsExc.filter((x) => x !== id), tagsExcMeta: state.tagsExcMeta.filter((x) => x.id !== id) })}
            placeholder="Never show me…"
          />
        </div>
        <div>
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-faint">Tag matching spoiler cap</span>
          <Select
            ariaLabel="Tag spoiler level"
            value={String(state.tagSpoiler ?? spoilerMax)}
            onChange={(v) => set({ tagSpoiler: Number(v) })}
            options={SPOILER_LEVELS.map((label, i) => ({ value: String(i), label }))}
          />
        </div>
      </div>
    </div>
  );
}

export interface Meta {
  id: string;
  name: string;
  sub?: string;
}
