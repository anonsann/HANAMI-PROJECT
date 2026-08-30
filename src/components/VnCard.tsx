import React from 'react';
import { Link } from 'react-router-dom';
import { cls } from '../lib/utils';
import type { VisualNovel } from '../lib/vndb/types';
import { devstatusLabel, vnLengthLabel } from '../lib/vndb/enums';
import { formatRating, formatVndbDate, lengthDisplay, releaseYear } from '../lib/format';
import { useSettings } from '../store/settings';
import { useBookmarks } from '../store/bookmarks';
import { usePalette } from '../lib/theme';
import { CoverImage, PlatformBadges, LanguageBadges } from './data';
import { Glare, TiltCard } from './visual';
import { Icon } from './icons';
import { SpotlightCard } from '../reactbits';

function displayTitle(vn: VisualNovel, preferOriginal: boolean): string {
  return preferOriginal && vn.alttitle ? vn.alttitle : vn.title;
}

export function BookmarkButton({ vn, size = 15, className }: { vn: VisualNovel; size?: number; className?: string }) {
  const has = useBookmarks((s) => s.items.some((b) => b.id === vn.id));
  const toggle = useBookmarks((s) => s.toggle);
  return (
    <button
      type="button"
      aria-pressed={has}
      aria-label={has ? 'Remove bookmark' : 'Bookmark'}
      title={has ? 'Remove bookmark' : 'Bookmark (saved locally)'}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle({
          id: vn.id,
          title: vn.title,
          alttitle: vn.alttitle ?? null,
          image: vn.image?.thumbnail ?? vn.image?.url ?? null,
          rating: vn.rating ?? null
        });
      }}
      className={cls(
        'grid size-7 place-items-center rounded-sm border border-line bg-panel/85 transition-colors',
        has ? 'text-brand' : 'text-faint hover:text-brand',
        className
      )}
    >
      <Icon name="bookmark" size={size} fill={has ? 'currentColor' : 'none'} />
    </button>
  );
}

/** Grid tile used in browse pages & rails — ReactBits SpotlightCard + tilt. */
export function VnCard({ vn, priority }: { vn: VisualNovel; priority?: boolean }) {
  const preferOriginal = useSettings((s) => s.showOriginalTitles);
  const palette = usePalette();

  return (
    <TiltCard className="h-full">
      <SpotlightCard
        className="!rounded-sm !border-line !bg-panel !p-0 h-full"
        spotlightColor={palette.isDark ? 'rgba(123, 184, 221, 0.12)' : 'rgba(26, 93, 180, 0.08)'}
      >
        <Link
          to={`/v/${vn.id}`}
          className="group relative block h-full overflow-hidden focus:outline-none"
        >
          <div className="relative">
            <Glare className="[&>*]:h-full">
              <CoverImage
                image={vn.image}
                alt={vn.title}
                eager={priority}
                sizes="(min-width:1280px) 220px, (min-width:640px) 30vw, 45vw"
                className="rounded-none border-0"
              />
            </Glare>
            <div className="absolute right-1.5 top-1.5">
              <BookmarkButton vn={vn} />
            </div>
            {vn.rating !== null && vn.rating !== undefined ? (
              <div className="absolute bottom-1.5 left-1.5 rounded-sm bg-panel/90 px-1.5 py-px font-mono text-[11px] font-semibold text-brand">
                {formatRating(vn.rating)}
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-1 p-2.5">
            <h3 className="line-clamp-2 min-h-[2.6em] text-[13px] font-medium leading-[1.3] text-ink group-hover:text-brand">
              {displayTitle(vn, preferOriginal)}
            </h3>
            <div className="flex items-center justify-between text-[11px] text-faint">
              <span>{formatVndbDate(vn.released)}</span>
              <span>
                {vn.devstatus !== undefined && vn.devstatus !== 0 ? (
                  <span className="text-warn">{devstatusLabel(vn.devstatus)}</span>
                ) : (
                  vnLengthLabel(vn.length)
                )}
              </span>
            </div>
            <PlatformBadges platforms={vn.platforms} max={3} className="mt-0.5" />
          </div>
        </Link>
      </SpotlightCard>
    </TiltCard>
  );
}

/** Horizontal row used in list view & relation sections. */
export function VnRow({
  vn,
  trailing,
  rank
}: {
  vn: VisualNovel;
  trailing?: React.ReactNode;
  rank?: number;
}) {
  const preferOriginal = useSettings((s) => s.showOriginalTitles);
  const year = releaseYear(vn.released);
  return (
    <Link
      to={`/v/${vn.id}`}
      className="card-surface group flex items-center gap-3 p-2.5 transition-colors hover:border-brand/50"
    >
      {rank !== undefined ? (
        <span
          className={cls(
            'w-7 shrink-0 text-center font-display text-base',
            rank <= 3 ? 'text-gold' : 'text-faint'
          )}
        >
          {rank}
        </span>
      ) : null}
      <CoverImage image={vn.image} alt={vn.title} className="w-11 shrink-0" eager={false} placeholderLabel={vn.title} />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[13px] font-medium text-ink group-hover:text-brand">
          {displayTitle(vn, preferOriginal)}
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-faint">
          <span>{formatVndbDate(vn.released)}</span>
          <PlatformBadges platforms={vn.platforms} max={3} />
          <LanguageBadges languages={vn.languages} max={3} />
          <span className="hidden sm:inline">{lengthDisplay(vn.length, vn.length_minutes)}</span>
          {year ? <span className="hidden md:inline">{vn.olang?.toUpperCase()}</span> : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {trailing}
        {vn.rating !== null && vn.rating !== undefined ? (
          <div className="text-right">
            <div className="font-mono text-[13px] font-semibold text-brand">{formatRating(vn.rating)}</div>
            <div className="text-[10px] text-faint">{(vn.votecount ?? 0).toLocaleString()} votes</div>
          </div>
        ) : (
          <span className="text-[11px] text-faint">Not rated</span>
        )}
        <Icon
          name="chevronRight"
          size={14}
          className="text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-brand"
        />
      </div>
    </Link>
  );
}

/** Compact tile for rails/carousels — image only. */
export function VnTile({ vn }: { vn: VisualNovel }) {
  return (
    <Link to={`/v/${vn.id}`} className="group block w-36 shrink-0 snap-start sm:w-40" title={vn.title}>
      <TiltCard max={5}>
        <div className="relative">
          <CoverImage image={vn.image} alt={vn.title} sizes="160px" />
          {vn.rating !== null && vn.rating !== undefined ? (
            <div className="absolute bottom-1.5 left-1.5 rounded-sm bg-panel/90 px-1 py-px font-mono text-[11px] font-semibold text-brand">
              {formatRating(vn.rating)}
            </div>
          ) : null}
        </div>
        <p className="mt-1.5 line-clamp-2 text-[12px] leading-snug text-mute transition-colors group-hover:text-brand">
          {vn.title}
        </p>
      </TiltCard>
    </Link>
  );
}

/** Horizontally scrollable rail. */
export function VnRail({ vns, className }: { vns: VisualNovel[]; className?: string }) {
  if (vns.length === 0) return null;
  return (
    <div className={cls('mask-fade-x -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 no-scrollbar', className)}>
      {vns.map((vn) => (
        <VnTile key={vn.id} vn={vn} />
      ))}
    </div>
  );
}
