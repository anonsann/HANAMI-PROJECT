import { useState } from 'react';
import { cls } from '../lib/utils';
import { shouldBlurImage, nsfwReason } from '../lib/spoiler';
import { useSettings } from '../store/settings';
import { Icon } from './icons';
import type { Extlink, VImage, VnTagEntry } from '../lib/vndb/types';
import { platformName, languageName, RELATIONS } from '../lib/vndb/enums';
import { RatingBar } from './ui';

/* ---------------------------------- Cover ----------------------------------- */

export function CoverImage({
  image,
  alt,
  className,
  imgClassName,
  aspect = 'aspect-[3/4]',
  sizes,
  eager,
  placeholderLabel
}: {
  image: VImage | null | undefined;
  alt: string;
  className?: string;
  imgClassName?: string;
  aspect?: string;
  sizes?: string;
  eager?: boolean;
  placeholderLabel?: string;
}) {
  const nsfw = useSettings((s) => s.nsfw);
  const [revealed, setRevealed] = useState(false);
  const [broken, setBroken] = useState(false);
  const blur = shouldBlurImage(image, nsfw) && !revealed;
  const reason = nsfwReason(image, nsfw);

  if (!image?.url || broken) {
    return (
      <div
        className={cls(
          'flex items-center justify-center overflow-hidden rounded-lg border border-line bg-panel2/80',
          aspect,
          className
        )}
      >
        <div className="flex flex-col items-center gap-2 p-4 text-center text-faint">
          <Icon name="image" size={26} />
          <span className="line-clamp-2 max-w-[90%] font-serif text-xs italic">{placeholderLabel ?? alt}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cls('group/cover relative overflow-hidden rounded-lg bg-panel2', aspect, className)}>
      <img
        src={image.thumbnail ?? image.url}
        alt={blur ? `${alt} (content hidden)` : alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        sizes={sizes}
        width={image.thumbnail_dims?.[0] ?? image.dims?.[0]}
        height={image.thumbnail_dims?.[1] ?? image.dims?.[1]}
        onError={() => setBroken(true)}
        className={cls(
          'size-full object-cover object-top transition duration-300',
          blur ? 'scale-110 blur-xl saturate-50' : 'group-hover/cover:scale-[1.04]',
          imgClassName
        )}
      />
      {blur ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setRevealed(true);
          }}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 bg-canvas/40 text-xs text-ink/90 backdrop-blur-[2px] transition-opacity"
          aria-label={`Reveal hidden image (${reason ?? 'NSFW'})`}
        >
          <Icon name="eyeOff" size={20} />
          <span>{reason ?? 'Hidden'}</span>
          <span className="text-[10px] uppercase tracking-wider text-faint">click to reveal</span>
        </button>
      ) : null}
    </div>
  );
}

/* ------------------------------ Platform badges ------------------------------ */

export function PlatformBadges({ platforms, max = 4, className }: { platforms?: string[]; max?: number; className?: string }) {
  if (!platforms || platforms.length === 0) return null;
  const shown = platforms.slice(0, max);
  return (
    <span className={cls('inline-flex flex-wrap items-center gap-1', className)} aria-label={`Platforms: ${platforms.map(platformName).join(', ')}`}>
      {shown.map((p) => (
        <span
          key={p}
          title={platformName(p)}
          className="rounded border border-line bg-panel2/90 px-1.5 py-px font-mono text-[10px] uppercase tracking-wide text-mute"
        >
          {p}
        </span>
      ))}
      {platforms.length > max ? <span className="text-[10px] text-faint">+{platforms.length - max}</span> : null}
    </span>
  );
}

export function LanguageBadges({ languages, max = 4, className }: { languages?: string[]; max?: number; className?: string }) {
  if (!languages || languages.length === 0) return null;
  const shown = languages.slice(0, max);
  return (
    <span className={cls('inline-flex flex-wrap items-center gap-1', className)} aria-label={`Languages: ${languages.map(languageName).join(', ')}`}>
      {shown.map((l) => (
        <span
          key={l}
          title={languageName(l)}
          className="rounded-full border border-line bg-panel2/90 px-2 py-px text-[10px] text-mute"
        >
          {l.toUpperCase()}
        </span>
      ))}
      {languages.length > max ? <span className="text-[10px] text-faint">+{languages.length - max}</span> : null}
    </span>
  );
}

/* --------------------------------- Tag chips --------------------------------- */

export function TagList({
  tags,
  max = 12,
  maxSpoiler,
  compact
}: {
  tags: VnTagEntry[];
  max?: number;
  maxSpoiler: number;
  compact?: boolean;
}) {
  const [showHidden, setShowHidden] = useState(false);

  const visible = tags.filter((t) => (t.spoiler ?? 0) <= maxSpoiler);
  const hidden = tags.filter((t) => (t.spoiler ?? 0) > maxSpoiler);
  const shown = visible.slice(0, max);

  const chip = (t: VnTagEntry, dimmed = false) => (
    <a
      key={`${t.id}-${t.lie ? 'l' : 'n'}`}
      href={`/g/${t.id}`}
      title={t.description ?? t.name}
      className={cls(
        'chip transition-colors hover:border-brand/60 hover:text-brand',
        (t.rating ?? 0) >= 2 ? 'text-ink' : '',
        dimmed && 'opacity-75',
        compact && 'px-2 py-px text-[11px]'
      )}
      style={
        (t.rating ?? 0) >= 2
          ? { borderColor: 'rgb(var(--c-brand) / .5)', boxShadow: 'inset 0 0 0 1px rgb(var(--c-brand) / .2)' }
          : undefined
      }
    >
      {t.name}
      {t.lie ? <span className="text-[10px] text-gold" title="Marked as misleading / joke vote">±</span> : null}
      <span className="font-mono text-[10px] text-faint">{(t.rating ?? 0).toFixed(1)}</span>
    </a>
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {shown.map((t) => chip(t))}
      {visible.length > max ? <span className="text-xs text-faint">+{visible.length - max} more</span> : null}
      {hidden.length > 0 ? (
        <>
          <button type="button" className="btn-quiet px-2 py-0.5 text-xs" onClick={() => setShowHidden((v) => !v)}>
            <Icon name={showHidden ? 'eyeOff' : 'eye'} size={14} />
            {showHidden ? 'Hide' : 'Show'} {hidden.length} spoiler tag{hidden.length > 1 ? 's' : ''}
          </button>
          {showHidden ? hidden.map((t) => chip(t, true)) : null}
        </>
      ) : null}
    </div>
  );
}

/* ---------------------------------- Extlinks --------------------------------- */

export function ExtlinkChips({ links, max = 8 }: { links?: Extlink[]; max?: number }) {
  if (!links || links.length === 0) return null;
  const shown = links.slice(0, max);
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((l) => (
        <a
          key={`${l.name ?? ''}-${l.url}`}
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          className="chip transition-colors hover:border-sky/50 hover:text-sky"
        >
          <Icon name="external" size={11} className="text-faint" />
          {l.label ?? l.name ?? l.url}
        </a>
      ))}
    </div>
  );
}

/* --------------------------------- Relations --------------------------------- */

export function RelationChips({ relations }: { relations: { id: string; relation: string; title?: string; relation_official?: boolean }[] }) {
  if (!relations.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {relations.map((r) => (
        <li key={`${r.id}-${r.relation}`}>
          <a href={`/v/${r.id}`} className="chip transition-colors hover:border-brand/60 hover:text-brand" title={`${RELATIONS[r.relation] ?? r.relation}${r.relation_official ? '' : ' (unofficial)'}`}>
            <span className="font-semibold text-gold/90">{RELATIONS[r.relation] ?? r.relation}</span>
            {r.title ?? r.id}
          </a>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------ Rating chip box ------------------------------ */

export function RatingChip({ rating, className }: { rating: number | null | undefined; className?: string }) {
  return (
    <div
      className={cls(
        'rounded-lg border px-2 py-1 text-center backdrop-blur-sm',
        rating !== null && rating !== undefined
          ? 'border-gold/40 bg-canvas/70'
          : 'border-line bg-canvas/70',
        className
      )}
    >
      {rating !== null && rating !== undefined ? (
        <span className="font-mono text-sm font-semibold text-gold text-glow-gold">{(rating / 10).toFixed(2)}</span>
      ) : (
        <span className="text-xs text-faint">—</span>
      )}
    </div>
  );
}

export function InlineRatingBar(props: { rating: number | null | undefined; votes?: number | null }) {
  return <RatingBar {...props} />;
}
