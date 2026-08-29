import React from 'react';
import { Link } from 'react-router-dom';
import { useApi, useGet } from '../lib/vndb/resource';
import { QUOTE_FULL, VN_CARD } from '../lib/vndb/fields';
import type { DbStats, Quote, VisualNovel } from '../lib/vndb/types';
import { mulberry32, unique } from '../lib/utils';
import { useTitle } from '../hooks';
import { Typewriter, DialogueBox, Reveal, CountUp, RatingGauge } from '../components/visual';
import { VnRailSection } from '../components/PageBits';
import { VnRail } from '../components/VnCard';
import { Skeleton } from '../components/ui';
import { Icon } from '../components/icons';

const TAGLINES = [
  'Every visual novel, one winding river of stories.',
  'Four hundred thousand pages of fate, indexed.',
  'Your pocket shrine to the visual novel craft.',
  'From doujin dreams to masterpieces — shelved, rated, remembered.',
  'The cherry blossoms fall at five centimeters per second; the archive never sleeps.'
];

export default function HomePage() {
  useTitle(null);
  const year = new Date().getFullYear();

  const stats = useGet<DbStats>('stats', 10 * 60_000);
  const quote = useApi<Quote>(
    'quote',
    { filters: ['random', '=', 1], fields: QUOTE_FULL, results: 1 },
    { label: 'random quote', ttlMs: 0 }
  );
  const q = quote.data?.results?.[0];

  const picks = useApi<VisualNovel>(
    'vn',
    {
      filters: ['and', ['votecount', '>=', 450], ['rating', '>=', 75]],
      fields: VN_CARD,
      sort: 'rating',
      reverse: true,
      results: 100
    },
    { label: 'daily picks' }
  );
  const daily = React.useMemo(() => {
    const all = picks.data?.results ?? [];
    if (all.length === 0) return [];
    const day = Math.floor(Date.now() / 86_400_000);
    const rng = mulberry32(day);
    const copy = [...all];
    const out: VisualNovel[] = [];
    while (copy.length > 0 && out.length < 6) {
      out.push(copy.splice(Math.floor(rng() * copy.length), 1)[0]);
    }
    return unique(out.map((v) => v.id)).length === out.length ? out : out;
  }, [picks.data]);

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      {/* --------------------------------- Hero --------------------------------- */}
      <section className="relative overflow-hidden rounded-2xl border border-brand/25 shadow-lift">
        <div className="absolute inset-0">
          <img
            src="/art/hero.jpg"
            alt=""
            aria-hidden="true"
            className="size-full object-cover opacity-45"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-canvas/95 via-canvas/70 to-canvas/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-canvas/95 via-transparent to-canvas/40" />
        </div>
        <div className="relative px-6 py-14 sm:px-12 sm:py-20">
          <p className="animate-fade-up font-jp text-sm tracking-[0.6em] text-gold text-glow-gold">視覚小説の帳</p>
          <h1 className="animate-fade-up mt-3 font-display text-4xl tracking-[0.10em] text-ink text-glow sm:text-6xl" style={{ animationDelay: '90ms' }}>
            HANAMI
          </h1>
          <p className="mt-4 max-w-xl font-serif text-lg text-mute animate-fade-up" style={{ animationDelay: '160ms' }}>
            <Typewriter phrases={TAGLINES} />
          </p>
          <div className="mt-8 flex flex-wrap gap-3 animate-fade-up" style={{ animationDelay: '240ms' }}>
            <Link to="/v" className="btn-primary">
              <Icon name="book" size={17} /> Begin the journey
            </Link>
            <Link to="/random" className="btn-gold">
              <Icon name="dice" size={17} /> Spin fate
            </Link>
            <Link to="/about" className="btn-quiet text-sm">What is this shrine?</Link>
          </div>
          {/* Stats strip */}
          <div className="mt-10 grid grid-cols-3 gap-3 sm:grid-cols-6 animate-fade-up" style={{ animationDelay: '320ms' }}>
            {(
              [
                ['Visual novels', stats.data?.vn, '/v'],
                ['Releases', stats.data?.releases, '/r'],
                ['Characters', stats.data?.chars, '/c'],
                ['Producers', stats.data?.producers, '/p'],
                ['Staff', stats.data?.staff, '/s'],
                ['Tags', stats.data?.tags, '/g']
              ] as [string, number | undefined, string][]
            ).map(([label, value, to]) => (
              <Link
                key={label}
                to={to}
                className="card-surface px-3 py-2.5 text-center transition-colors hover:border-brand/50"
              >
                <div className="font-display text-xl text-gold">
                  {value !== undefined ? <CountUp value={value} /> : <span className="text-line">·</span>}
                </div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-faint">{label}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------ Random quote ----------------------------- */}
      <Reveal>
        {quote.status === 'loading' ? (
          <Skeleton className="h-28 rounded-xl" />
        ) : q ? (
          <DialogueBox
            name={
              <>
                {q.character?.name ?? 'Whisper'} · <span className="text-faint">{q.vn?.title ?? 'unknown novel'}</span>
              </>
            }
            nameIcon="quote"
            footer={
              <button type="button" onClick={quote.reload} className="btn-quiet -my-1 px-0 text-xs">
                <Icon name="refresh" size={13} /> Another voice
              </button>
            }
          >
            <p className="text-lg italic leading-8">“{q.quote}”</p>
          </DialogueBox>
        ) : null}
      </Reveal>

      {/* --------------------------------- Rails -------------------------------- */}
      <VnRailSection
        kana="頂"
        title="Critically Acclaimed"
        subtitle="Bayesian hall of fame — the sharpened consensus of the community"
        filters={['and', ['votecount', '>=', 400]]}
        sort="rating"
        results={14}
      />

      <VnRailSection
        kana="旬"
        title="Recent Favorites"
        subtitle="What readers keep voting for, these last four years"
        filters={['and', ['released', '>=', `${year - 4}`], ['votecount', '>=', 80]]}
        sort="votecount"
        results={14}
      />

      <Reveal className="space-y-3">
        <h2 className="section-title flex items-center gap-3">
          <span className="font-jp text-sm tracking-widest text-brand normal-case">・暦の一冊</span> Today’s picks
        </h2>
        {daily.length > 0 ? (
          <VnRail vns={daily} />
        ) : (
          <div className="flex gap-3 overflow-hidden">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="aspect-[3/4] w-40 shrink-0 rounded-lg" />
            ))}
          </div>
        )}
      </Reveal>

      <VnRailSection
        kana="新"
        title="Fresh Ink"
        subtitle="The newest releases to surface in the archive"
        filters={['and', ['released', '<=', 'today'], ['devstatus', '=', 0]]}
        sort="released"
        results={14}
      />

      <VnRailSection
        kana="夢"
        title="Works in Progress"
        subtitle="Stories still being written — keep an eye on the horizon"
        filters={['and', ['devstatus', '=', 1], ['votecount', '>=', 150]]}
        sort="votecount"
        results={14}
      />

      {/* ------------------------------ Rating explainer ------------------------- */}
      <Reveal>
        <div className="card-surface grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-center">
          <RatingGauge rating={90} size={120} label="bayesian" />
          <div className="space-y-2">
            <h2 className="section-title">A river, not a wall</h2>
            <p className="max-w-2xl text-sm leading-relaxed text-mute">
              Hanami is a fully open-source client for VNDB — the community-run visual novel database. Browse
              every novel, character, release, producer and staff credit; curate your shelf with your VNDB
              account; spin the roulette when indecision strikes. All data flows live from api.vndb.org and
              belongs to its contributors.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link to="/stats" className="btn-ghost text-xs">
                <Icon name="chart" size={14} /> Database chronicle
              </Link>
              <Link to="/compare" className="btn-ghost text-xs">
                <Icon name="scale" size={14} /> Compare novels
              </Link>
              <Link to="/list" className="btn-ghost text-xs">
                <Icon name="list" size={14} /> Your shelf
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
