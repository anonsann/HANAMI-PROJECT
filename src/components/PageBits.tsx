import React from 'react';
import { cls } from '../lib/utils';
import { useApi } from '../lib/vndb/resource';
import { VN_CARD } from '../lib/vndb/fields';
import type { VisualNovel } from '../lib/vndb/types';
import { ChapterMarker, Reveal } from './visual';
import { VnRail } from './VnCard';
import { Skeleton, ErrorState } from './ui';

export function PageHeader({
  kana,
  title,
  children,
  actions
}: {
  kana: string;
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="font-jp text-sm tracking-[0.5em] text-brand">{kana}</p>
        <h1 className="mt-1 font-display text-2xl tracking-[0.12em] text-ink sm:text-3xl">{title}</h1>
        {children ? <div className="mt-2 max-w-2xl text-sm text-mute">{children}</div> : null}
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
    <Reveal className={cls('space-y-3', className)}>
      <ChapterMarker kana={kana} title={title} subtitle={subtitle} />
      {res.status === 'loading' && !res.data ? (
        <div className="flex gap-3 overflow-hidden">
          {[160, 150, 170, 155, 165, 150].map((w, i) => (
            <Skeleton key={i} className="aspect-[3/4] shrink-0 rounded-lg" style={{ width: w } as React.CSSProperties} />
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
