import React from 'react';
import { Link } from 'react-router-dom';
import { useApi, useGet } from '../lib/vndb/resource';
import { QUOTE_FULL, VN_CARD } from '../lib/vndb/fields';
import type { DbStats, Quote, VisualNovel } from '../lib/vndb/types';
import { mulberry32 } from '../lib/utils';
import { useTitle } from '../hooks';
import {
  AmbientBackground,
  CountUp,
  DialogueBox,
  FloatHeading,
  GradientHeading,
  Magnetize,
  PageTitle,
  RatingGauge,
  Reveal,
  Rotating,
  Shiny,
  SlideIn,
  StarButton,
  Typewriter
} from '../components/visual';
import { VnRailSection } from '../components/PageBits';
import { Card, ErrorState, Skeleton } from '../components/ui';
import { Carousel } from '../reactbits';

const TAGLINES = [
  'Every visual novel, one winding river of stories.',
  'Four hundred thousand pages of fate, indexed.',
  'Your pocket shrine to the visual novel craft.',
  'From doujin dreams to masterpieces — shelved, rated, remembered.',
  'The cherry blossoms fall at five centimeters per second; the archive never sleeps.'
];

const ROTATING = ['search', 'shelve', 'compare', 'remember'];

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
    return out;
  }, [picks.data]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* --------------------------------- Hero --------------------------------- */}
      <Reveal>
        <section className="vndb-box relative overflow-hidden">
          <AmbientBackground variant="aurora" className="opacity-60" />
          <div className="vndb-box-title relative">
            <span>視覚小説の帳 — The Visual Novel Archive</span>
            <Shiny className="text-[10px] normal-case tracking-normal text-brand">live from api.vndb.org</Shiny>
          </div>
          <div className="vndb-box-body relative px-5 py-10 sm:px-8 sm:py-14">
            <p className="font-jp text-[11px] uppercase tracking-[0.45em] text-faint">hanami · 花見</p>
            <PageTitle className="mt-1.5 text-4xl leading-tight text-brand2 sm:text-6xl">HANAMI</PageTitle>
            <div className="mt-3 flex flex-wrap items-baseline gap-x-2 font-display text-lg text-brand sm:text-2xl">
              <span>Read it.</span>
              <Rotating words={ROTATING} className="text-brand underline decoration-dotted underline-offset-4" />
              <span>Repeat.</span>
            </div>
            <p className="mt-4 max-w-xl text-[13px] leading-relaxed text-mute">
              <Typewriter phrases={TAGLINES} />
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Magnetize strength={18}>
                <StarButton className="inline-block">
                  <Link to="/v" className="btn-primary m-px inline-flex">
                    <span aria-hidden="true">▸</span> Begin the journey
                  </Link>
                </StarButton>
              </Magnetize>
              <Magnetize strength={14}>
                <Link to="/random" className="btn-gold">
                  Spin fate
                </Link>
              </Magnetize>
              <Link to="/about" className="btn-quiet text-[12px]">
                What is this shrine?
              </Link>
            </div>

            {/* Stats strip */}
            <div className="mt-9 grid grid-cols-3 gap-2 sm:grid-cols-6">
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
                  className="card-surface px-2.5 py-2 text-center transition-colors hover:border-brand/60"
                >
                  <div className="font-display text-lg font-semibold text-brand">
                    {value !== undefined ? <CountUp value={value} /> : <span className="text-line">·</span>}
                  </div>
                  <div className="mt-0.5 text-[10px] uppercase tracking-wider text-faint">{label}</div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      {/* ------------------------------ Random quote ----------------------------- */}
      <Reveal>
        {quote.status === 'loading' ? (
          <Skeleton className="h-28 rounded-sm" />
        ) : q ? (
          <DialogueBox
            name={
              <>
                {q.character?.name ?? 'Whisper'} · <span className="text-faint">{q.vn?.title ?? 'unknown novel'}</span>
              </>
            }
            nameIcon="quote"
            footer={
              <button type="button" onClick={quote.reload} className="btn-quiet -my-1 px-0 text-[12px]">
                Another voice
              </button>
            }
          >
            <p className="text-[15px] italic leading-8">“{q.quote}”</p>
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

      {/* ---------------------------- Today's picks carousel --------------------- */}
      <SlideIn className="space-y-3">
        <FloatHeading className="mb-1">Today’s picks</FloatHeading>
        {daily.length > 0 ? (
          <Carousel
            baseWidth={460}
            autoplay
            autoplayDelay={4200}
            pauseOnHover
            loop
            round={false}
            items={daily.map((vn) => ({
              title: vn.title,
              description: vn.released ? `${vn.released}${vn.rating != null ? ` · ${(vn.rating / 10).toFixed(2)}` : ''}` : '',
              id: Number(vn.id.slice(1)) || 0,
              icon: (
                <Link to={`/v/${vn.id}`} className="btn-ghost px-2 py-1 text-[12px]">
                  Open
                </Link>
              )
            }))}
          />
        ) : (
          <div className="flex gap-3 overflow-hidden">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="aspect-[3/4] w-40 shrink-0 rounded-sm" />
            ))}
          </div>
        )}
      </SlideIn>

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
        <Card className="p-5">
          <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
            <RatingGauge rating={90} size={120} label="bayesian" />
            <div className="space-y-2">
              <GradientHeading className="text-lg">A river, not a wall</GradientHeading>
              <p className="max-w-2xl text-[13px] leading-relaxed text-mute">
                Hanami is a fully open-source client for VNDB — the community-run visual novel database. Browse every
                novel, character, release, producer and staff credit; curate your shelf with your VNDB account; spin
                the roulette when indecision strikes. All data flows live from api.vndb.org and belongs to its
                contributors.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Link to="/stats" className="btn-ghost text-[12px]">
                  Database chronicle
                </Link>
                <Link to="/compare" className="btn-ghost text-[12px]">
                  Compare novels
                </Link>
                <Link to="/list" className="btn-ghost text-[12px]">
                  Your shelf
                </Link>
              </div>
            </div>
          </div>
        </Card>
      </Reveal>

      {quote.status === 'error' ? <ErrorState title="Could not load the archive" error={quote.error} onRetry={quote.reload} /> : null}
    </div>
  );
}
