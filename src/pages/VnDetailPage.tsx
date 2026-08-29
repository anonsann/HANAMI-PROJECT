import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useApi } from '../lib/vndb/resource';
import { VN_DETAIL, RELEASE_CARD, QUOTE_FULL } from '../lib/vndb/fields';
import type { Character, Quote, Release, VisualNovel, VnStaffEntry } from '../lib/vndb/types';
import { useCompare } from '../store/compare';
import { useSettings } from '../store/settings';
import { useTitle } from '../hooks';
import { renderDescription } from '../lib/markup';
import { dateSortKey, formatRating, formatVndbDate, lengthDisplay, ratingLabel, ratingTone } from '../lib/format';
import { CHARACTER_ROLE_ORDER, characterRoleName, languageName, relationName, staffRoleName, SEXES, VN_LENGTHS, devstatusLabel } from '../lib/vndb/enums';
import { cls } from '../lib/utils';
import { CoverImage, TagList, ExtlinkChips, PlatformBadges, LanguageBadges } from '../components/data';
import { RatingGauge, Reveal } from '../components/visual';
import { Tabs, Skeleton, ErrorState, EmptyState } from '../components/ui';
import { Icon } from '../components/icons';
import { BookmarkButton } from '../components/VnCard';
import { ListPanel } from '../components/ListPanel';
import { Lightbox } from '../components/Lightbox';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'characters', label: 'Characters' },
  { id: 'releases', label: 'Releases' },
  { id: 'staff', label: 'Staff & Voices' },
  { id: 'media', label: 'Media' },
  { id: 'quotes', label: 'Quotes' }
];

export default function VnDetailPage() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab')! : 'overview';

  const res = useApi<VisualNovel>(
    'vn',
    { filters: ['id', '=', id], fields: VN_DETAIL, results: 1 },
    { label: 'vn detail' }
  );
  const vn = res.data?.results?.[0];
  useTitle(vn ? vn.title : null);

  if (res.status === 'loading' && !res.data) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="grid gap-6 md:grid-cols-[260px_1fr]">
          <Skeleton className="aspect-[3/4] rounded-xl" />
          <div className="space-y-3 pt-4">
            <Skeleton className="h-8 w-2/3 rounded" />
            <Skeleton className="h-4 w-1/2 rounded" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }
  if (res.status === 'error') return <ErrorState error={res.error} onRetry={res.reload} />;
  if (!vn) {
    return (
      <EmptyState
        title={`No visual novel named “${id}”.`}
        hint="The archive has no entry under this id — it may have been merged or deleted."
        action={
          <Link to="/v" className="btn-ghost mt-2">
            <Icon name="arrowLeft" size={15} /> Back to the archive
          </Link>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Hero vn={vn} />
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="hidden lg:block">
            <Reveal>
              <CoverImage image={vn.image} alt={vn.title} eager />
            </Reveal>
          </div>
          <MetaPanel vn={vn} />
        </aside>
        <section className="min-w-0">
          <Tabs tabs={TABS} active={tab} onChange={(id) => setParams(id === 'overview' ? {} : { tab: id }, { replace: true })} />
          <div className="pt-5">
            {tab === 'overview' ? <OverviewTab vn={vn} /> : null}
            {tab === 'characters' ? <CharactersTab vnId={vn.id} /> : null}
            {tab === 'releases' ? <ReleasesTab vnId={vn.id} /> : null}
            {tab === 'staff' ? <StaffTab vn={vn} /> : null}
            {tab === 'media' ? <MediaTab vn={vn} /> : null}
            {tab === 'quotes' ? <QuotesTab vnId={vn.id} /> : null}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ----------------------------------- Hero ----------------------------------- */

function Hero({ vn }: { vn: VisualNovel }) {
  const compare = useCompare();
  const inCompare = compare.ids.includes(vn.id);
  const tone = ratingTone(vn.rating);

  return (
    <Reveal className="card-surface relative overflow-hidden p-5 sm:p-7">
      {vn.image?.url ? (
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
          <img src={vn.image.thumbnail ?? vn.image.url} alt="" className="size-full scale-125 object-cover object-top opacity-[0.12] blur-2xl" />
          <div className="absolute inset-0 bg-gradient-to-t from-panel/95 via-panel/70 to-panel/40" />
        </div>
      ) : null}
      <div className="relative flex flex-col gap-6 md:flex-row">
        <div className="w-40 shrink-0 sm:w-48 lg:hidden">
          <CoverImage image={vn.image} alt={vn.title} eager />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-jp text-xs tracking-[0.4em] text-brand">{vn.olang === 'ja' ? '日本の物語' : 'visual novel'}</p>
              <h1 className="mt-1 font-serif text-2xl font-semibold leading-tight text-ink sm:text-3xl">{vn.title}</h1>
              {vn.alttitle ? <p className={cls('mt-1 text-lg text-mute', /[぀-ヿ㐀-䶿一-鿿豈-﫿]/.test(vn.alttitle) ? 'font-jp' : 'font-serif')}>{vn.alttitle}</p> : null}
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-mute">
                <span className="flex items-center gap-1">
                  <Icon name="calendar" size={13} className="text-gold" /> {formatVndbDate(vn.released)}
                </span>
                {vn.devstatus !== undefined && vn.devstatus !== 0 ? (
                  <span className="rounded-full border border-warn/40 bg-warn/10 px-2 py-px text-warn">{devstatusLabel(vn.devstatus)}</span>
                ) : null}
                <span className="flex items-center gap-1">
                  <Icon name="clock" size={13} className="text-gold" /> {lengthDisplay(vn.length, vn.length_minutes)}
                  {vn.length_votes ? <span className="text-faint">({vn.length_votes.toLocaleString()} votes)</span> : null}
                </span>
                {vn.olang ? (
                  <span className="flex items-center gap-1">
                    <Icon name="globe" size={13} className="text-gold" /> {languageName(vn.olang)}
                    {vn.languages && vn.languages.length > 1 ? ` + ${vn.languages.length - 1}` : ''}
                  </span>
                ) : null}
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {(vn.developers ?? []).map((d) => (
                  <Link key={d.id} to={`/p/${d.id}`} className="chip border-gold/40 text-gold transition-colors hover:bg-gold/10">
                    <Icon name="building" size={11} /> {d.name}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <RatingGauge rating={vn.rating} size={116} label={`${(vn.votecount ?? 0).toLocaleString()} votes`} />
              <span className={cls('text-xs font-semibold', tone === 'gold' ? 'text-gold' : tone === 'good' ? 'text-good' : tone === 'mid' ? 'text-sky' : 'text-faint')}>
                {ratingLabel(vn.rating)}
              </span>
              {vn.average !== null && vn.average !== undefined && vn.rating !== undefined && vn.average !== vn.rating ? (
                <span className="text-[10px] text-faint">raw {formatRating(vn.average)}</span>
              ) : null}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <BookmarkButton vn={vn} className="border-brand/40" />
            <button
              type="button"
              onClick={() => compare.toggle(vn.id)}
              aria-pressed={inCompare}
              className={cls('btn-ghost py-1.5 text-xs', inCompare && 'border-brand/60 text-brand')}
            >
              <Icon name="scale" size={14} /> {inCompare ? 'In comparison' : 'Compare'}
            </button>
            <a className="btn-ghost py-1.5 text-xs" href={`https://vndb.org/${vn.id}`} target="_blank" rel="noopener noreferrer">
              <Icon name="external" size={14} /> vndb.org/{vn.id}
            </a>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

/* --------------------------------- Meta panel -------------------------------- */

function MetaPanel({ vn }: { vn: VisualNovel }) {
  return (
    <aside className="space-y-4">
      <ListPanel vnId={vn.id} vnTitle={vn.title} />
      <div className="card-surface space-y-3 px-4 py-4 text-sm">
        {vn.platforms && vn.platforms.length > 0 ? (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-faint">Platforms</p>
            <PlatformBadges platforms={vn.platforms} max={20} />
          </div>
        ) : null}
        {vn.languages && vn.languages.length > 0 ? (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-faint">Languages</p>
            <LanguageBadges languages={vn.languages} max={24} />
          </div>
        ) : null}
        {vn.length ? (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-faint">Length class</p>
            <p className="text-mute">{VN_LENGTHS[vn.length]}</p>
          </div>
        ) : null}
        {vn.aliases && vn.aliases.length > 0 ? (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-faint">Also known as</p>
            <ul className="space-y-0.5 text-mute">
              {vn.aliases.map((a) => (
                <li key={a} className="text-xs leading-5">{a}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <ExtlinkChips links={vn.extlinks} max={10} />
      </div>
    </aside>
  );
}

/* --------------------------------- Overview ---------------------------------- */

function OverviewTab({ vn }: { vn: VisualNovel }) {
  const spoilerMax = useSettings((s) => s.spoilerMax);
  const tags = useMemo(() => [...(vn.tags ?? [])].sort((a, b) => b.rating - a.rating), [vn.tags]);
  const relations = useMemo(() => [...(vn.relations ?? [])].sort((a, b) => cmpRel(a.relation) - cmpRel(b.relation)), [vn.relations]);

  return (
    <div className="space-y-6">
      {vn.description ? (
        <Reveal className="card-surface px-5 py-4">
          <p className="font-serif text-[15px] leading-7 text-ink/95">{renderDescription(vn.description, spoilerMax, 'desc')}</p>
        </Reveal>
      ) : (
        <p className="text-sm text-faint">No description on record.</p>
      )}

      {tags.length > 0 ? (
        <Reveal>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-faint">Tags</h3>
          <TagList tags={tags} max={30} maxSpoiler={spoilerMax} />
        </Reveal>
      ) : null}

      {relations.length > 0 ? (
        <Reveal>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-faint">Related novels</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {relations.map((r) => (
              <Link key={`${r.id}-${r.relation}`} to={`/v/${r.id}`} className="card-surface group flex items-center gap-2.5 p-2 transition-colors hover:border-brand/40">
                <CoverImage image={r.image} alt={r.title ?? r.id} className="w-12 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-gold">{relationName(r.relation)}</p>
                  <p className="truncate text-xs font-medium text-ink group-hover:text-brand">{r.title ?? r.id}</p>
                  <p className="text-[10px] text-faint">
                    {formatVndbDate(r.released)} {r.rating ? `· ${formatRating(r.rating)}` : ''}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Reveal>
      ) : null}
    </div>
  );
}

function cmpRel(r: string): number {
  const order = ['seq', 'preq', 'set', 'alt', 'char', 'side', 'par', 'ser', 'fan', 'orig'];
  const i = order.indexOf(r);
  return i === -1 ? order.length : i;
}

/* -------------------------------- Characters --------------------------------- */

function CharactersTab({ vnId }: { vnId: string }) {
  const spoilerMax = useSettings((s) => s.spoilerMax);
  const res = useApi<Character>(
    'character',
    {
      filters: ['vn', '=', ['id', '=', vnId]],
      fields: 'name,original,image{url,dims,sexual,violence},sex,blood_type,height,vns{id,role,spoiler}',
      results: 100,
      sort: 'id'
    },
    { label: 'vn characters' }
  );
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const rows = useMemo(() => {
    const list = res.data?.results ?? [];
    const best = new Map<string, Character>();
    for (const c of list) {
      if (!best.has(c.id)) best.set(c.id, c);
    }
    return [...best.values()]
      .map((c) => {
        const rel = (c.vns ?? []).filter((v) => v.id === vnId)[0];
        return { char: c, role: rel?.role ?? 'appears', spoiler: rel?.spoiler ?? 0 };
      })
      .sort((a, b) => (CHARACTER_ROLE_ORDER[a.role] ?? 9) - (CHARACTER_ROLE_ORDER[b.role] ?? 9) || a.char.name.localeCompare(b.char.name));
  }, [res.data, vnId]);

  if (res.status === 'loading') {
    return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="aspect-[4/5] rounded-xl" />)}</div>;
  }
  if (res.status === 'error') return <ErrorState error={res.error} onRetry={res.reload} />;
  if (rows.length === 0) return <EmptyState title="No cast recorded." hint="This novel's dramatis personae is still being written into the database." />;

  return (
    <div className="space-y-4">
      {res.data?.more ? <p className="text-xs text-warn">Showing the first 100 characters for this novel.</p> : null}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {rows.map(({ char, role, spoiler }) => {
          const hidden = spoiler > spoilerMax && !revealed.has(char.id);
          return (
            <div key={char.id} className="card-surface group relative overflow-hidden">
              <div className="relative">
                <CoverImage image={char.image} alt={char.name} aspect="aspect-[5/5.5]" sizes="(min-width:768px) 220px, 40vw" className="rounded-none border-0" />
                {hidden ? (
                  <button
                    type="button"
                    onClick={() => setRevealed((s) => new Set(s).add(char.id))}
                    className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 bg-canvas/85 text-xs text-faint"
                    aria-label="Reveal spoiler character"
                  >
                    <Icon name="eyeOff" size={20} className="text-brand" />
                    Spoiler character
                    <span className="text-[10px] uppercase tracking-wider">click to reveal</span>
                  </button>
                ) : null}
              </div>
              <div className="space-y-1 p-2.5">
                {hidden ? (
                  <p className="truncate text-sm text-faint">？</p>
                ) : (
                  <Link to={`/c/${char.id}`} className="block truncate text-sm font-medium text-ink hover:text-brand">
                    {char.name}
                  </Link>
                )}
                {!hidden && char.original ? <p className="truncate font-jp text-xs text-faint">{char.original}</p> : null}
                <div className="flex items-center justify-between">
                  <span
                    className={cls(
                      'rounded-full px-2 py-px text-[10px]',
                      role === 'main' ? 'bg-gold/15 text-gold' : role === 'primary' ? 'bg-brand/15 text-brand' : 'bg-panel2 text-faint'
                    )}
                  >
                    {hidden ? '…' : characterRoleName(role)}
                  </span>
                  {!hidden && char.sex?.[0] ? <span className="text-[10px] text-faint">{SEXES[char.sex[0]] ?? ''}</span> : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* --------------------------------- Releases ---------------------------------- */

function ReleasesTab({ vnId }: { vnId: string }) {
  const res = useApi<Release>(
    'release',
    { filters: ['vn', '=', ['id', '=', vnId]], fields: RELEASE_CARD, results: 100, sort: 'id' },
    { label: 'vn releases' }
  );

  const rows = useMemo(() => [...(res.data?.results ?? [])].sort((a, b) => dateSortKey(a.released).localeCompare(dateSortKey(b.released))), [res.data]);

  if (res.status === 'loading') return <div className="space-y-2">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;
  if (res.status === 'error') return <ErrorState error={res.error} onRetry={res.reload} />;
  if (rows.length === 0) return <EmptyState title="No releases on record." />;

  return (
    <ul className="space-y-2.5">
      {rows.map((r) => {
        const devs = (r.producers ?? []).filter((p) => p.developer);
        const pubs = (r.producers ?? []).filter((p) => p.publisher);
        const front = (r.images ?? []).find((i) => i.type === 'pkgfront') ?? r.images?.[0];
        return (
          <li key={r.id}>
            <Link to={`/r/${r.id}`} className="card-surface group flex gap-3 p-3 transition-colors hover:border-brand/40">
              <CoverImage image={front} alt={r.title} className="w-14 shrink-0" aspect="aspect-[3/4]" placeholderLabel={r.title} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h3 className="truncate text-sm font-medium text-ink group-hover:text-brand">{r.title}</h3>
                  {r.official ? <span className="rounded border border-good/50 bg-good/10 px-1.5 py-px text-[10px] text-good">official</span> : null}
                  {r.patch ? <span className="rounded border border-sky/50 bg-sky/10 px-1.5 py-px text-[10px] text-sky">patch</span> : null}
                  {r.freeware ? <span className="rounded border border-gold/50 bg-gold/10 px-1.5 py-px text-[10px] text-gold">freeware</span> : null}
                  {r.minage !== null && r.minage !== undefined ? <span className="rounded border border-bad/50 bg-bad/10 px-1.5 py-px text-[10px] text-bad">{r.minage}+</span> : null}
                </div>
                <p className="mt-0.5 text-xs text-faint">{formatVndbDate(r.released)}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-mute">
                  <PlatformBadges platforms={r.platforms} max={5} />
                  <LanguageBadges languages={(r.languages ?? []).map((l) => l.lang)} max={4} />
                  {r.uncensored === true ? <span title="Uncensored">×mosaic</span> : null}
                  {devs.length > 0 ? <span>dev: {devs.map((d) => d.name).join(', ')}</span> : null}
                  {pubs.length > 0 ? <span>pub: {pubs.map((p) => p.name).join(', ')}</span> : null}
                </div>
              </div>
              <Icon name="chevronRight" size={14} className="self-center text-faint" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/* ----------------------------------- Staff ----------------------------------- */

function StaffTab({ vn }: { vn: VisualNovel }) {
  const byRole = useMemo(() => {
    const map = new Map<string, VnStaffEntry[]>();
    for (const s of vn.staff ?? []) {
      const list = map.get(s.role) ?? [];
      list.push(s);
      map.set(s.role, list);
    }
    return [...map.entries()];
  }, [vn.staff]);

  const va = vn.va ?? [];
  const editions = new Map((vn.editions ?? []).map((e) => [e.eid, e]));

  if (byRole.length === 0 && va.length === 0) {
    return <EmptyState title="No credits recorded." />;
  }

  return (
    <div className="space-y-6">
      {byRole.map(([role, people]) => (
        <div key={role}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gold">{staffRoleName(role)}</h3>
          <ul className="flex flex-wrap gap-1.5">
            {people.map((p) => {
              const edition = p.eid !== null && p.eid !== undefined ? editions.get(p.eid) : undefined;
              return (
                <li key={`${p.id}-${p.aid ?? ''}-${p.eid ?? 'o'}`}>
                  <Link to={`/s/${p.id}`} className="chip transition-colors hover:border-brand/60 hover:text-brand">
                    {p.name}
                    {p.note ? <span className="text-faint">· {p.note}</span> : null}
                    {edition?.name ? <span className="text-sky">[{edition.name}]</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {va.length > 0 ? (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gold">Voice cast</h3>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {va.map((v, i) => (
              <li key={`${v.staff?.id}-${v.character?.id}-${i}`} className="card-surface flex items-center justify-between gap-3 px-3 py-2 text-sm">
                {v.character ? (
                  <Link to={`/c/${v.character.id}`} className="min-w-0 truncate text-ink hover:text-brand">
                    {v.character.name}
                  </Link>
                ) : (
                  <span className="text-faint">unknown role</span>
                )}
                {v.staff ? (
                  <Link to={`/s/${v.staff.id}`} className="shrink-0 text-mute hover:text-sky">
                    <span className="text-[10px] uppercase tracking-wider text-faint">voiced by </span>
                    {v.staff.name}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/* ----------------------------------- Media ----------------------------------- */

function MediaTab({ vn }: { vn: VisualNovel }) {
  const shots = (vn.screenshots ?? []).filter((s) => s.url);
  const [lightbox, setLightbox] = useState<number | null>(null);

  if (shots.length === 0) return <EmptyState title="No screenshots on record." hint="Media for this novel hasn't been archived yet." />;

  return (
    <div>
      <p className="mb-3 text-xs text-faint">{shots.length} screenshot{shots.length > 1 ? 's' : ''} · tap to enlarge</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {shots.map((s, i) => (
          <button key={s.id ?? i} type="button" onClick={() => setLightbox(i)} className="group text-left" aria-label={`Screenshot ${i + 1}`}>
            <CoverImage image={s} alt={`${vn.title} screenshot ${i + 1}`} aspect="aspect-video" sizes="(min-width:768px) 25vw, 45vw" />
          </button>
        ))}
      </div>
      {lightbox !== null ? (
        <Lightbox
          items={shots.map((s, i) => ({ src: s.url!, alt: `${vn.title} · screenshot ${i + 1}` }))}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onNavigate={(i) => setLightbox(i)}
        />
      ) : null}
    </div>
  );
}

/* ----------------------------------- Quotes ----------------------------------- */

function QuotesTab({ vnId }: { vnId: string }) {
  const res = useApi<Quote>(
    'quote',
    { filters: ['vn', '=', ['id', '=', vnId]], fields: QUOTE_FULL, results: 25, sort: 'score', reverse: true },
    { label: 'vn quotes' }
  );

  if (res.status === 'loading') return <div className="space-y-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;
  if (res.status === 'error') return <ErrorState error={res.error} onRetry={res.reload} />;
  const quotes = res.data?.results ?? [];
  if (quotes.length === 0) return <EmptyState title="No memorable lines archived." />;

  return (
    <ol className="space-y-3">
      {quotes.map((q, i) => (
        <li key={`${q.id}-${i}`} className="card-surface relative px-5 py-4">
          <span className="absolute left-3 top-3 font-serif text-2xl text-brand/40">“</span>
          <p className="font-serif italic leading-7 text-ink">{q.quote}</p>
          <div className="mt-2 flex items-center justify-between text-xs text-faint">
            <span>
              {q.character?.id ? (
                <Link to={`/c/${q.character.id}`} className="link-fancy">
                  — {q.character.name}
                </Link>
              ) : null}
            </span>
            {q.score !== null && q.score !== undefined ? <span className="chip">score {q.score}</span> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
