import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { vndb } from '../lib/vndb/client';
import { useApi } from '../lib/vndb/resource';
import { F } from '../lib/vndb/filters';
import type { VisualNovel } from '../lib/vndb/types';
import { useCompare } from '../store/compare';
import { useSettings } from '../store/settings';
import { useTitle, useDebouncedValue } from '../hooks';
import { formatVndbDate, lengthDisplay, ratingLabel } from '../lib/format';
import { cls } from '../lib/utils';
import { PageHeader } from '../components/PageBits';
import { CoverImage, TagList } from '../components/data';
import { GlowBox, Magnetize, RatingGauge, Reveal, TiltCard } from '../components/visual';
import { RadarChart } from '../components/Charts';
import { Skeleton, ErrorState, EmptyState } from '../components/ui';
import { Icon } from '../components/icons';

const COMPARE_FIELDS =
  'title,alttitle,released,image{url,thumbnail,sexual,violence,dims},rating,votecount,average,length,length_minutes,olang,languages,platforms,devstatus,developers{name},tags{id,name,rating,spoiler}';

export default function ComparePage() {
  useTitle('Compare');
  const compare = useCompare();
  const spoilerMax = useSettings((s) => s.spoilerMax);
  const [tableMode, setTableMode] = useState(true);

  const body = useMemo(
    () =>
      compare.ids.length > 0
        ? { filters: F.idsOr(compare.ids), fields: COMPARE_FIELDS, results: compare.ids.length }
        : null,
    [compare.ids]
  );
  const res = useApi<VisualNovel>('vn', body, { label: 'compare', enabled: compare.ids.length > 0 });

  const vns = useMemo(
    () => compare.ids.map((id) => res.data?.results.find((v) => v.id === id)).filter((v): v is VisualNovel => !!v),
    [res.data, compare.ids]
  );

  const dims = useMemo(() => buildRadar(vns), [vns]);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader kana="対比" title="Column Duel" actions={
        <div className="flex items-center gap-3">
          {compare.ids.length > 0 ? (
            <button type="button" className="btn-quiet text-xs" onClick={compare.clear}>
              <Icon name="trash" size={13} /> Clear tray
            </button>
          ) : null}
          {compare.ids.length >= 2 ? (
            <ModeToggle tableMode={tableMode} onChange={setTableMode} />
          ) : null}
        </div>
      }>
        Place up to four novels side by side. Add titles below, or from any novel page (“Compare”).
      </PageHeader>

      <VnPicker
        selected={compare.ids}
        onAdd={(id) => compare.toggle(id)}
        onRemove={compare.remove}
      />

      {compare.ids.length < 2 ? (
        <EmptyState
          icon="scale"
          title="The duel needs a second blade."
          hint="Pick at least two visual novels to compare their fate lines."
        />
      ) : res.status === 'loading' || !res.data ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {compare.ids.map((id) => (
            <Skeleton key={id} className="h-72 rounded-xl" />
          ))}
        </div>
      ) : res.status === 'error' ? (
        <ErrorState error={res.error} onRetry={res.reload} />
      ) : vns.length >= 2 ? (
        <>
          <Reveal>
            {dims.series.length > 0 ? (
              <GlowBox className="h-full">
              <div className="grid gap-6 border border-line bg-panel p-5 md:grid-cols-[minmax(0,320px)_1fr] md:items-center">
                <RadarChart series={dims.series} />
                <div>
                  <h2 className="mb-2 font-display text-[15px] font-semibold text-brand2">Normalized fate lines</h2>
                  <p className="max-w-lg text-[13px] text-mute">
                    Each axis is scaled to the strongest contender in the tray: rating, vote count,
                    reading time, language reach and platform breadth.
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-3">
                    {vns.map((v, i) => (
                      <li key={v.id} className="flex items-center gap-2 text-sm">
                        <span className="inline-block size-2.5 rounded-full" style={{ background: dims.colors[i % dims.colors.length] }} />
                        <span className="max-w-40 truncate">{v.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              </GlowBox>
            ) : null}
          </Reveal>

          {tableMode ? (
            <div className="card-surface overflow-x-auto">
              <table className="table-zen min-w-[640px]">
                <thead>
                  <tr>
                    <th aria-label="Metric" />
                    {vns.map((v) => (
                      <th key={v.id} className="!text-left normal-case">
                        <Link to={`/v/${v.id}`} className="text-sm font-serif text-ink hover:text-brand">
                          {v.title}
                        </Link>
                        <p className="font-mono text-[10px] font-normal text-faint">{v.id}</p>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <ComparisonRow label="Rating" best={(v) => v.rating ?? 0} render={(v) => (v.rating ? `${(v.rating / 10).toFixed(2)}/10` : '—')} vns={vns} tone="gold" />
                  <ComparisonRow label="Community voice" best={(v) => v.votecount ?? 0} render={(v) => `${(v.votecount ?? 0).toLocaleString()} votes`} vns={vns} />
                  <ComparisonRow label="Reading time" best={(v) => v.length_minutes ?? 0} render={(v) => lengthDisplay(v.length, v.length_minutes)} vns={vns} />
                  <ComparisonRow label="Release" best={() => 0} render={(v) => formatVndbDate(v.released)} vns={vns} />
                  <ComparisonRow label="Languages" best={(v) => v.languages?.length ?? 0} render={(v) => v.languages?.join(' · ').toUpperCase() || '—'} vns={vns} />
                  <ComparisonRow label="Platforms" best={(v) => v.platforms?.length ?? 0} render={(v) => v.platforms?.join(' · ').toUpperCase() || '—'} vns={vns} />
                  <ComparisonRow label="Developer" best={() => 0} render={(v) => v.developers?.map((d) => d.name).join(', ') || '—'} vns={vns} />
                </tbody>
              </table>
            </div>
          ) : (
            <div className={`grid gap-4 ${vns.length > 2 ? 'md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' : 'md:grid-cols-2'}`}>
              {vns.map((v) => (
                <TiltCard key={v.id} max={5}>
                <div className="card-surface h-full space-y-3 p-4">
                  <div className="flex gap-3">
                    <CoverImage image={v.image} alt={v.title} className="w-20 shrink-0" />
                    <div className="min-w-0">
                      <Link to={`/v/${v.id}`} className="line-clamp-2 font-serif font-semibold text-ink hover:text-brand">{v.title}</Link>
                      <p className="mt-1 text-xs text-faint">{ratingLabel(v.rating)} · {formatVndbDate(v.released)}</p>
                    </div>
                  </div>
                  <RatingGauge rating={v.rating ?? null} size={86} label={`${(v.votecount ?? 0).toLocaleString()} votes`} />
                  <TagList tags={(v.tags ?? []).filter((t) => t.rating >= 2).slice(0, 8)} max={8} maxSpoiler={spoilerMax} compact />
                </div>
                </TiltCard>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

/* ----------------------------- Helper components ----------------------------- */

/** Magnetic pill toggle between the table and card views. */
function ModeToggle({ tableMode, onChange }: { tableMode: boolean; onChange: (v: boolean) => void }) {
  return (
    <Magnetize strength={12}>
      <div className="flex rounded-sm border border-line bg-panel p-0.5" role="group" aria-label="Compare view">
        <button
          type="button"
          aria-pressed={tableMode}
          onClick={() => onChange(true)}
          className={cls('rounded-sm px-2.5 py-1 text-[12px]', tableMode ? 'bg-brand/15 text-brand' : 'text-faint hover:text-ink')}
        >
          Table
        </button>
        <button
          type="button"
          aria-pressed={!tableMode}
          onClick={() => onChange(false)}
          className={cls('rounded-sm px-2.5 py-1 text-[12px]', !tableMode ? 'bg-brand/15 text-brand' : 'text-faint hover:text-ink')}
        >
          Cards
        </button>
      </div>
    </Magnetize>
  );
}

function ComparisonRow({
  label,
  vns,
  best,
  render,
  tone
}: {
  label: string;
  vns: VisualNovel[];
  best: (v: VisualNovel) => number;
  render: (v: VisualNovel) => React.ReactNode;
  tone?: 'gold';
}) {
  const bestValue = Math.max(...vns.map(best));
  return (
    <tr>
      <td className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-faint">{label}</td>
      {vns.map((v) => {
        const isBest = best(v) === bestValue && bestValue > 0;
        return (
          <td key={v.id} className={cls('text-sm', isBest ? (tone === 'gold' ? 'font-semibold text-gold' : 'font-semibold text-good') : 'text-mute')}>
            {render(v)}
            {isBest ? <Icon name="sparkle" size={11} className="ml-1 inline-block text-gold" /> : null}
          </td>
        );
      })}
    </tr>
  );
}

function buildRadar(vns: VisualNovel[]) {
  const colors = ['rgb(var(--c-brand))', 'rgb(var(--c-sky))', 'rgb(var(--c-gold))', 'rgb(var(--c-good))'];
  if (vns.length < 2) return { series: [], colors };
  const metric = (fn: (v: VisualNovel) => number) => {
    const vals = vns.map(fn);
    const max = Math.max(1e-9, ...vals);
    return vals.map((x) => x / max);
  };
  const mRating = metric((v) => v.rating ?? 0);
  const mVotes = metric((v) => Math.log10((v.votecount ?? 0) + 1));
  const mLen = metric((v) => v.length_minutes ?? 0);
  const mLang = metric((v) => v.languages?.length ?? 0);
  const mPlat = metric((v) => v.platforms?.length ?? 0);
  const series = vns.map((v, i) => ({
    name: v.title,
    color: colors[i % colors.length],
    values: [
      { label: 'Rating', value: mRating[i] },
      { label: 'Votes', value: mVotes[i] },
      { label: 'Length', value: mLen[i] },
      { label: 'Langs', value: mLang[i] },
      { label: 'Platforms', value: mPlat[i] }
    ]
  }));
  return { series, colors };
}

function VnPicker({ selected, onAdd, onRemove }: { selected: string[]; onAdd: (id: string) => void; onRemove: (id: string) => void }) {
  const [q, setQ] = useState('');
  const [options, setOptions] = useState<VisualNovel[]>([]);
  const [busy, setBusy] = useState(false);
  const debounced = useDebouncedValue(q, 280);

  React.useEffect(() => {
    const query = debounced.trim();
    if (query.length < 2) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    setBusy(true);
    vndb
      .query<VisualNovel>(
        'vn',
        { filters: F.search(query), fields: 'title,alttitle,released,rating,image{url,thumbnail,sexual,violence}', results: 6, sort: 'searchrank' },
        { label: 'compare search' }
      )
      .then((r) => {
        if (!cancelled) setOptions(r.results);
        setBusy(false);
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
        setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  return (
    <div className="card-surface space-y-2 px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <Icon name="scale" size={15} className="text-brand" />
        <span className="text-sm font-medium">Tray</span>
        {selected.map((id) => (
          <span key={id} className="chip">
            <Link to={`/v/${id}`} className="hover:text-brand">{id}</Link>
            <button type="button" onClick={() => onRemove(id)} aria-label={`Remove ${id} from comparison`} className="text-faint hover:text-bad">
              <Icon name="x" size={11} />
            </button>
          </span>
        ))}
        {selected.length === 0 ? <span className="text-xs text-faint">empty — add novels via search or their “Compare” button</span> : null}
      </div>
      <div className="relative">
        <input
          className="input"
          placeholder="Search a novel to add…"
          value={q}
          disabled={selected.length >= 4}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search a visual novel to compare"
        />
        {debounced.trim().length >= 2 && options.length > 0 && selected.length < 4 ? (
          <div className="absolute inset-x-0 top-full z-30 mt-1 divide-y divide-line overflow-hidden rounded-lg border border-line bg-panel shadow-lift">
            {options.map((o) => (
              <button
                key={o.id}
                type="button"
                disabled={selected.includes(o.id)}
                onClick={() => {
                  onAdd(o.id);
                  setQ('');
                  setOptions([]);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-panel2 disabled:opacity-40"
              >
                <span className="truncate text-sm text-ink">{o.title}</span>
                <span className="ml-auto shrink-0 text-[11px] text-faint">{formatVndbDate(o.released)}</span>
              </button>
            ))}
          </div>
        ) : null}
        {busy ? <p className="mt-1 text-[11px] text-faint">Searching…</p> : null}
        {selected.length >= 4 ? <p className="mt-1 text-[11px] text-warn">Tray is full — remove a novel to add another.</p> : null}
      </div>
    </div>
  );
}
