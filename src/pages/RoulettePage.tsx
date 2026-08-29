import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { vndb, ApiError } from '../lib/vndb/client';
import { VN_CARD } from '../lib/vndb/fields';
import type { VisualNovel } from '../lib/vndb/types';
import { formatRating, formatVndbDate } from '../lib/format';
import { useTitle, useInterval } from '../hooks';
import { useSettings } from '../store/settings';
import { PageHeader } from '../components/PageBits';
import { CoverImage } from '../components/data';
import { RatingGauge, DialogueBox } from '../components/visual';
import { Icon } from '../components/icons';
import { Skeleton } from '../components/ui';

type Stage = 'idle' | 'spinning' | 'revealed' | 'error';

interface RoulettePrefs {
  minRating: number | null;
  minVotes: number;
  yearFrom: number | null;
}

export default function RoulettePage() {
  useTitle('Roulette');
  const maxTries = 8;
  const [prefs, setPrefs] = useState<RoulettePrefs>({ minRating: 70, minVotes: 100, yearFrom: null });
  const [stage, setStage] = useState<Stage>('idle');
  const [picked, setPicked] = useState<VisualNovel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [strip, setStrip] = useState<VisualNovel[]>([]);
  const prefersOriginal = useSettings((s) => s.showOriginalTitles);
  const historyRef = useRef<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);

  // Preload covers for the slot-machine strip from a light query.
  useEffect(() => {
    vndb
      .query<VisualNovel>(
        'vn',
        { filters: ['and', ['votecount', '>=', 900]], fields: VN_CARD, sort: 'rating', reverse: true, results: 40 },
        { label: 'roulette strip' }
      )
      .then((r) => setStrip(r.results.filter((v) => v.image?.url)))
      .catch(() => setStrip([]));
  }, []);

  const [flashIdx, setFlashIdx] = useState(0);
  useInterval(
    () => {
      if (strip.length > 0) setFlashIdx((i) => (i + 1) % strip.length);
    },
    stage === 'spinning' ? 90 : null
  );

  const spin = useCallback(async () => {
    setStage('spinning');
    setPicked(null);
    setError(null);
    const delay = new Promise((r) => setTimeout(r, 1400));
    try {
      // Step 1: find the current upper id bound (cached 2h, see API "Random entry").
      const top = await vndb.query<VisualNovel>(
        'vn',
        { filters: [], fields: 'id', sort: 'id', reverse: true, results: 1 },
        { label: 'roulette bounds', ttlMs: 2 * 60 * 60_000 }
      );
      const maxNum = Number((top.results[0]?.id ?? 'v1').replace(/\D/g, '')) || 1;

      const extra: unknown[] = [];
      if (prefs.minRating !== null) extra.push(['rating', '>=', prefs.minRating]);
      if (prefs.minVotes > 0) extra.push(['votecount', '>=', prefs.minVotes]);
      if (prefs.yearFrom !== null) extra.push(['released', '>=', String(prefs.yearFrom)]);
      if (historyRef.current.length > 0) {
        extra.push(['and', ...historyRef.current.map((h) => ['id', '!=', h])]);
      }

      let result: VisualNovel | null = null;
      for (let attempt = 0; attempt < maxTries && !result; attempt++) {
        const guess = Math.max(1, Math.floor(Math.random() * maxNum));
        const filters = ['and', ['id', '>=', `v${guess}`], ...extra];
        const res = await vndb.query<VisualNovel>(
          'vn',
          { filters, fields: VN_CARD, sort: 'id', reverse: false, results: 1 },
          { label: 'roulette pick', ttlMs: 0 }
        );
        // `more`-based walk forward if the guess-anchored fetch found nothing.
        result = res.results[0] ?? null;
      }
      await delay;
      if (!result) {
        setStage('error');
        setError('Fate found nothing matching these dials at this moment — loosen the constraints and spin again.');
        return;
      }
      historyRef.current = [...historyRef.current, result.id].slice(-12);
      setHistory([...historyRef.current]);
      setPicked(result);
      setStage('revealed');
    } catch (e) {
      await delay;
      setStage('error');
      setError(e instanceof ApiError ? e.message : 'The roulette jammed. Spin again.');
    }
  }, [prefs]);

  const flash = strip.length > 0 ? strip[flashIdx] : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader kana="運命" title="Fate Roulette">
        When indecision strikes, let the archive decide. The wheel selects uniformly among ids and walks
        forward — mirrors VNDB's documented random-entry strategy.
      </PageHeader>

      <div className="card-surface flex flex-wrap items-end gap-4 px-5 py-4">
        <label className="text-xs">
          <span className="mb-1 block font-semibold uppercase tracking-wider text-faint">Min rating</span>
          <select
            className="input w-36"
            value={prefs.minRating === null ? '' : String(prefs.minRating)}
            onChange={(e) => setPrefs((p) => ({ ...p, minRating: e.target.value ? Number(e.target.value) : null }))}
          >
            <option value="" className="bg-panel">Anything</option>
            {[50, 60, 70, 75, 80, 85].map((r) => (
              <option key={r} value={r} className="bg-panel">
                ≥ {(r / 10).toFixed(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="mb-1 block font-semibold uppercase tracking-wider text-faint">Min votes</span>
          <select className="input w-36" value={String(prefs.minVotes)} onChange={(e) => setPrefs((p) => ({ ...p, minVotes: Number(e.target.value) }))}>
            {[0, 50, 100, 250, 500].map((r) => (
              <option key={r} value={r} className="bg-panel">
                {r === 0 ? 'Any' : `≥ ${r}`}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="mb-1 block font-semibold uppercase tracking-wider text-faint">Released after</span>
          <input
            className="input w-32"
            type="number"
            min={1980}
            placeholder="Any"
            value={prefs.yearFrom ?? ''}
            onChange={(e) => setPrefs((p) => ({ ...p, yearFrom: e.target.value ? Number(e.target.value) : null }))}
          />
        </label>
        <button type="button" className="btn-primary ml-auto px-8 py-2.5 text-base" onClick={() => void spin()} disabled={stage === 'spinning'}>
          <Icon name="dice" size={18} /> {stage === 'spinning' ? 'The wheel turns…' : 'Spin fate'}
        </button>
      </div>

      {stage === 'spinning' ? (
        <div className="card-surface flex flex-col items-center gap-4 p-10">
          <div className="flex gap-2 overflow-hidden">
            {[0, 1, 2, 3].map((off) => {
              const vn = strip.length ? strip[(flashIdx + off * 7) % strip.length] : null;
              return (
                <div key={off} className="w-28 opacity-90 transition-all duration-100" style={{ transform: `scale(${1 - off * 0.08}) translateY(${off * 4}px)` }}>
                  {vn ? <CoverImage image={vn.image} alt="…" /> : <Skeleton className="aspect-[3/4] rounded-lg" />}
                </div>
              );
            })}
          </div>
          {flash ? <p className="animate-fade-in font-serif text-sm text-mute">{prefersOriginal && flash.alttitle ? flash.alttitle : flash.title}</p> : <p className="text-sm text-faint">Shuffling the archive…</p>}
        </div>
      ) : null}

      {stage === 'error' && error ? (
        <div role="alert" className="card-surface border-warn/40 p-6 text-center text-sm text-warn">{error}</div>
      ) : null}

      {stage === 'revealed' && picked ? (
        <dialog open className="static m-0 block w-full bg-transparent p-0">
          <div className="card-surface overflow-hidden border-gold/40 shadow-glow-gold animate-fade-up">
            <div className="flex flex-col gap-6 p-6 sm:flex-row sm:p-8">
              <div className="w-44 shrink-0 sm:w-52">
                <CoverImage image={picked.image} alt={picked.title} eager />
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <p className="font-jp text-xs tracking-[0.5em] text-gold">選ばれた物語</p>
                <Link to={`/v/${picked.id}`} className="block font-serif text-2xl font-semibold leading-snug text-ink hover:text-brand">
                  {picked.title}
                </Link>
                {picked.alttitle ? <p className="font-jp text-mute">{picked.alttitle}</p> : null}
                <div className="flex flex-wrap items-center gap-3 text-xs text-faint">
                  <span>{formatVndbDate(picked.released)}</span>
                  {picked.rating !== null && picked.rating !== undefined ? <span className="font-mono text-gold">{formatRating(picked.rating)}</span> : null}
                  <span>{(picked.votecount ?? 0).toLocaleString()} votes</span>
                </div>
                <div className="flex items-center gap-4">
                  <RatingGauge rating={picked.rating ?? null} size={92} />
                  <DialogueBox name="Destiny" nameIcon="sparkle" className="flex-1">
                    Fate whispers: this one. Read it when the rain comes.
                  </DialogueBox>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Link to={`/v/${picked.id}`} className="btn-primary">
                    <Icon name="book" size={15} /> Open the story
                  </Link>
                  <button type="button" className="btn-gold" onClick={() => void spin()}>
                    <Icon name="refresh" size={14} /> Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        </dialog>
      ) : null}

      {history.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-faint">
          <span className="flex items-center gap-1"><Icon name="history" size={13} /> Past spins:</span>
          {history.map((h) => (
            <Link key={h} to={`/v/${h}`} className="chip hover:text-brand">{h}</Link>
          ))}
          <button type="button" className="btn-quiet px-1" onClick={() => { historyRef.current = []; setHistory([]); }}>
            clear
          </button>
        </div>
      ) : null}
    </div>
  );
}
