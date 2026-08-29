import { useState } from 'react';
import { useGet } from '../lib/vndb/resource';
import { vndb } from '../lib/vndb/client';
import type { DbStats } from '../lib/vndb/types';
import { range } from '../lib/utils';
import { useTitle } from '../hooks';
import { VN_LENGTHS, DEVSTATUS, languageName, platformName } from '../lib/vndb/enums';
import { PageHeader } from '../components/PageBits';
import { BarChart, DonutChart, LineChart, type SeriesPoint } from '../components/Charts';
import { CountUp, Reveal } from '../components/visual';
import { Skeleton } from '../components/ui';
import { Icon, type IconName } from '../components/icons';

interface Weave {
  byYear: SeriesPoint[];
  devstatus: SeriesPoint[];
  lengths: SeriesPoint[];
  langs: SeriesPoint[];
  platforms: SeriesPoint[];
  ratingBands: SeriesPoint[];
  releasesByYear: SeriesPoint[];
}

const ONE_DAY = 24 * 60 * 60_000;

async function countEndpoint(endpoint: 'vn' | 'release', filters: unknown, label: string): Promise<number> {
  const res = await vndb.query(
    endpoint,
    { filters, fields: '', results: 0, count: true },
    { label, ttlMs: ONE_DAY }
  );
  return res.count ?? 0;
}

const CHART_COLORS = {
  brand: 'rgb(var(--c-brand))',
  violet: 'rgb(var(--c-brand2))',
  gold: 'rgb(var(--c-gold))',
  sky: 'rgb(var(--c-sky))',
  good: 'rgb(var(--c-good))',
  warn: 'rgb(var(--c-warn))',
  bad: 'rgb(var(--c-bad))'
};

export default function StatsPage() {
  useTitle('Chronicle');
  const stats = useGet<DbStats>('stats', 10 * 60_000);
  const [weave, setWeave] = useState<Weave | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [weaveError, setWeaveError] = useState<string | null>(null);

  async function weaveCharts() {
    const year = new Date().getFullYear();
    const years = range(14).map((i) => year - 13 + i);

    const jobs: { key: string; run: () => Promise<{ by?: string; value: number }[]> }[] = [
      {
        key: 'years',
        run: async () =>
          Promise.all(
            years.map(async (y) => ({
              by: String(y),
              value: await countEndpoint('vn', ['and', ['released', '>=', String(y)], ['released', '<', String(y + 1)]], `count vn ${y}`)
            }))
          )
      },
      {
        key: 'relyears',
        run: async () =>
          Promise.all(
            years.map(async (y) => ({
              by: String(y),
              value: await countEndpoint('release', ['and', ['released', '>=', String(y)], ['released', '<', String(y + 1)]], `count rel ${y}`)
            }))
          )
      },
      {
        key: 'devstatus',
        run: async () =>
          Promise.all(
            [0, 1, 2].map(async (d) => ({ by: DEVSTATUS[d], value: await countEndpoint('vn', ['devstatus', '=', d], `count dev ${d}`) }))
          )
      },
      {
        key: 'lengths',
        run: async () =>
          Promise.all(
            [1, 2, 3, 4, 5].map(async (l) => ({ by: VN_LENGTHS[l], value: await countEndpoint('vn', ['length', '=', l], `count len ${l}`) }))
          )
      },
      {
        key: 'langs',
        run: async () =>
          Promise.all(
            ['en', 'ja', 'zh-Hans', 'ru', 'de', 'fr', 'es', 'ko'].map(async (c) => ({
              by: languageName(c),
              value: await countEndpoint('vn', ['lang', '=', c], `count lang ${c}`)
            }))
          )
      },
      {
        key: 'platforms',
        run: async () =>
          Promise.all(
            ['win', 'lin', 'mac', 'web', 'and', 'swi', 'psv', 'ps4'].map(async (p) => ({
              by: platformName(p),
              value: await countEndpoint('vn', ['platform', '=', p], `count plat ${p}`)
            }))
          )
      },
      {
        key: 'bands',
        run: async () => {
          const bands = [
            { label: '9.0+', lo: 90, hi: null },
            { label: '8.0 – 8.9', lo: 80, hi: 89 },
            { label: '7.0 – 7.9', lo: 70, hi: 79 },
            { label: '6.0 – 6.9', lo: 60, hi: 69 },
            { label: '5.9 & below', lo: 0, hi: 59 }
          ];
          return Promise.all(
            bands.map(async (b) => ({
              by: b.label,
              value: await countEndpoint(
                'vn',
                ['and', ['votecount', '>=', 100], ['rating', '>=', b.lo], ...(b.hi === null ? [] : [['rating', '<=', b.hi]])],
                `count band ${b.label}`
              )
            }))
          );
        }
      }
    ];

    const total = 14 * 2 + 3 + 5 + 8 + 8 + 5;
    setProgress({ done: 0, total });
    setWeaveError(null);
    const out: Weave = { byYear: [], devstatus: [], lengths: [], langs: [], platforms: [], ratingBands: [], releasesByYear: [] };

    try {
      for (const job of jobs) {
        const rows: { by?: string; value: number }[] = [];
        for (const parts of [job.run]) {
          // Query one at a time so progress is visible & the queue stays gentle.
          const all = await parts();
          rows.push(...all);
          setProgress((p) => (p ? { done: Math.min(p.total, p.done + all.length), total: p.total } : p));
        }
        const labeled = rows.map((r) => ({ label: r.by ?? '—', value: r.value }));
        if (job.key === 'years') out.byYear = labeled;
        if (job.key === 'relyears') out.releasesByYear = labeled;
        if (job.key === 'devstatus') out.devstatus = labeled.map((r, i) => ({ ...r, color: [CHART_COLORS.good, CHART_COLORS.gold, CHART_COLORS.bad][i] }));
        if (job.key === 'lengths') out.lengths = labeled;
        if (job.key === 'langs') out.langs = [...labeled].sort((a, b) => b.value - a.value);
        if (job.key === 'platforms') out.platforms = [...labeled].sort((a, b) => b.value - a.value);
        if (job.key === 'bands') out.ratingBands = labeled;
      }
      setWeave(out);
    } catch (e) {
      setWeaveError(e instanceof Error ? e.message : 'Counting failed.');
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader kana="帳簿" title="The Chronicle" actions={
        <button type="button" className="btn-ghost" onClick={() => void weaveCharts()} disabled={progress !== null}>
          <Icon name={weave ? 'refresh' : 'chart'} size={14} />
          {progress ? `Weaving… ${progress.done}/${progress.total}` : weave ? 'Re-weave' : 'Weave the charts'}
        </button>
      }>
        Constants of the VNDB cosmos — totals, growth arcs and the shape of the library itself.
        Chart data is computed from lightweight count queries and cached for 24h.
      </PageHeader>

      {stats.status === 'loading' ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({ length: 7 }, (_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : stats.data ? (
        <Reveal className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {([
            ['Visual novels', stats.data.vn, 'book'],
            ['Releases', stats.data.releases, 'disc'],
            ['Characters', stats.data.chars, 'person'],
            ['Producers', stats.data.producers, 'building'],
            ['Staff', stats.data.staff, 'pen'],
            ['Tags', stats.data.tags, 'tag'],
            ['Traits', stats.data.traits, 'sparkle']
          ] as [string, number, IconName][]).map(([label, value, icon]) => (
            <div key={label} className="card-surface relative overflow-hidden p-4">
              <Icon name={icon} size={88} className="pointer-events-none absolute -right-3 -top-3 text-panel2" aria-hidden="true" />
              <p className="font-display text-3xl text-gold">
                <CountUp value={value} />
              </p>
              <p className="mt-1 text-xs uppercase tracking-wider text-faint">{label}</p>
            </div>
          ))}
          <div className="card-surface relative overflow-hidden border-gold/30 p-4">
            <p className="font-display text-3xl text-brand text-glow">∑</p>
            <p className="mt-1 text-xs uppercase tracking-wider text-faint">
              {formatSumTotal(stats.data)}
            </p>
          </div>
        </Reveal>
      ) : null}

      {weaveError ? <div role="alert" className="card-surface border-warn/40 p-4 text-sm text-warn">{weaveError}</div> : null}
      {progress ? (
        <div className="card-surface p-4">
          <div className="h-2 overflow-hidden rounded-full bg-line/60">
            <div className="h-full rounded-full bg-gradient-to-r from-brand to-gold transition-[width]" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
          </div>
          <p className="mt-2 text-center text-xs text-faint">
            Counting the archive… queries are deduplicated, cached for a day, and paced to respect VNDB rate limits.
          </p>
        </div>
      ) : null}

      {weave ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Reveal className="card-surface p-5 lg:col-span-2">
            <h3 className="section-title mb-4 text-sm">Visual novels entering the archive, per year</h3>
            <LineChart data={weave.byYear} />
          </Reveal>
          <Reveal className="card-surface p-5">
            <h3 className="section-title mb-4 text-sm">Releases per year</h3>
            <BarChart data={weave.releasesByYear} />
          </Reveal>
          <Reveal className="card-surface p-5">
            <h3 className="section-title mb-4 text-sm">Rating bands (100+ votes)</h3>
            <BarChart data={weave.ratingBands} />
          </Reveal>
          <Reveal className="card-surface p-5">
            <h3 className="section-title mb-4 text-sm">Development status</h3>
            <DonutChart data={weave.devstatus} format={(n) => `${n.toLocaleString()}`} />
          </Reveal>
          <Reveal className="card-surface p-5">
            <h3 className="section-title mb-4 text-sm">Reading length</h3>
            <DonutChart data={weave.lengths} format={(n) => `${n.toLocaleString()}`} />
          </Reveal>
          <Reveal className="card-surface p-5 lg:col-span-2">
            <h3 className="section-title mb-4 text-sm">Language availability</h3>
            <BarChart data={weave.langs} />
          </Reveal>
          <Reveal className="card-surface p-5 lg:col-span-2">
            <h3 className="section-title mb-4 text-sm">Platform reach</h3>
            <BarChart data={weave.platforms} />
          </Reveal>
        </div>
      ) : !progress ? (
        <Reveal>
          <div className="card-surface flex flex-col items-center gap-3 p-10 text-center text-sm text-mute">
            <Icon name="chart" size={28} className="text-gold" />
            <p className="max-w-md">
              The full weave runs ~43 count-only queries (no payload data) with built-in pacing and a full-day
              cache — easy on the database, dazzling to watch.
            </p>
            <button type="button" className="btn-gold mt-1" onClick={() => void weaveCharts()}>
              <Icon name="sparkle" size={14} /> Weave the charts
            </button>
          </div>
        </Reveal>
      ) : null}
    </div>
  );
}

function formatSumTotal(s: DbStats): string {
  const total = s.vn + s.releases + s.chars + s.producers + s.staff + s.tags + s.traits;
  return `${total.toLocaleString()} records woven together`;
}
