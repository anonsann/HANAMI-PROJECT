import React from 'react';
import { cls } from '../lib/utils';
import { useApi } from '../lib/vndb/resource';
import { VN_CARD } from '../lib/vndb/fields';
import type { VisualNovel } from '../lib/vndb/types';
import { ChapterMarker, Reveal, Scramble, Shiny } from './visual';
import { VnRail } from './VnCard';
import { Skeleton, ErrorState } from './ui';

/** Standard page header: kana eyebrow + animated title + optional actions. */
export function PageHeader({
  kana,
  title,
  children,
  actions
}: {
  kana?: string;
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
      <div className="min-w-0">
        {kana ? <Shiny className="mb-1 text-[10px] text-brand">{kana}</Shiny> : null}
        <h1 className="font-display text-xl font-semibold text-brand2 sm:text-2xl">
          <Scramble text={title} />
        </h1>
        {children ? <div className="mt-1.5 max-w-2xl text-[13px] text-mute">{children}</div> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** A horizontally scrolling rail fed by a VN query. */
export function VnRailSection({
  kana,
  title,
  subtitle,
  filters,
  sort,
  reverse = true,
  results = 14,
  className
}: {
  kana: string;
  title: string;
  subtitle?: string;
  filters: unknown;
  sort: string;
  reverse?: boolean;
  results?: number;
  className?: string;
}) {
  const body = React.useMemo(
    () => ({ filters, fields: VN_CARD, sort, reverse, results }),
    [filters, sort, reverse, results]
  );
  const res = useApi<VisualNovel>('vn', body, { label: `rail ${title}` });

  return (
    <Reveal className={cls('space-y-2.5', className)}>
      <ChapterMarker kana={kana} title={title} subtitle={subtitle} />
      {res.status === 'loading' && !res.data ? (
        <div className="flex gap-3 overflow-hidden">
          {[160, 150, 170, 155, 165, 150].map((w, i) => (
            <Skeleton key={i} className="aspect-[3/4] shrink-0 rounded-sm" style={{ width: w } as React.CSSProperties} />
          ))}
        </div>
      ) : res.status === 'error' ? (
        <ErrorState title={`Could not load “${title}”`} error={res.error} onRetry={res.reload} />
      ) : (
        <VnRail vns={res.data?.results ?? []} />
      )}
    </Reveal>
  );
}
