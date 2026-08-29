/**
 * URL ⇄ filter-state serialization for the VN browse page (SOD-015/SOD-021).
 *
 * Extracted from `VnBrowsePage` so the mapping is pure and unit-testable.
 * Every `VnFilterState` field MUST appear in both directions — the URL is the
 * source of truth (see docs/BUGS.md SOD-001's prevention note). The `sort`
 * param is validated against a whitelist so malformed deep links degrade to
 * the default sort instead of surfacing an API 400.
 */

import { EMPTY_VN_FILTER, type VnFilterState } from './filters';

export interface FullState extends VnFilterState {
  tagsIncMeta: { id: string; name: string }[];
  tagsExcMeta: { id: string; name: string }[];
}

/** Sort keys the browse page can express; anything else falls back to default. */
export const SORT_PARAM_WHITELIST = [
  'rating|desc',
  'rating|asc',
  'votecount|desc',
  'released|desc',
  'released|asc',
  'title|asc',
  'title|desc',
  'searchrank|desc'
] as const;

export type SortPair = (typeof SORT_PARAM_WHITELIST)[number];

export const DEFAULT_SORT: SortPair = 'rating|desc';

/** Coerces an untrusted `sort` query param to a known key. */
export function coerceSort(v: string | null): SortPair {
  return (SORT_PARAM_WHITELIST as readonly string[]).includes(v ?? '') ? (v as SortPair) : DEFAULT_SORT;
}

/** Reads the full filter state (without display metadata) from the query string. */
export function readVnFilterState(sp: URLSearchParams): VnFilterState {
  const base: VnFilterState = { ...EMPTY_VN_FILTER };
  base.search = sp.get('search') ?? '';
  base.yearFrom = numOr(sp.get('yf'));
  base.yearTo = numOr(sp.get('yt'));
  base.minRating = numOr(sp.get('rating'));
  base.minVotecount = numOr(sp.get('votes'));
  base.lengths = (sp.get('len') ?? '')
    .split(',')
    .filter(Boolean)
    .map(Number)
    .filter((n) => n >= 1 && n <= 5);
  base.devstatus = sp.get('dev') === null ? null : numOr(sp.get('dev'));
  base.olang = sp.get('olang') || null;
  base.langs = (sp.get('lang') ?? '').split(',').filter(Boolean);
  base.platforms = (sp.get('plat') ?? '').split(',').filter(Boolean);
  base.tagsInc = (sp.get('tag') ?? '').split(',').filter(Boolean);
  base.tagsExc = (sp.get('xtag') ?? '').split(',').filter(Boolean);
  base.tagSpoiler = numOr(sp.get('tls')) ?? 0;
  base.hasAnime = sp.get('anime') === '1';
  base.hasScreenshot = sp.get('ss') === '1';
  base.hasDescription = sp.get('desc') === '1'; // SOD-015: was dropped on read
  base.hasReview = sp.get('rev') === '1';
  return base;
}

/** Writes the filter state to a fresh query string (default values omitted). */
export function writeVnFilterState(s: VnFilterState, sort: string, page: number): URLSearchParams {
  const p = new URLSearchParams();
  if (s.search.trim()) p.set('search', s.search.trim());
  if (s.yearFrom !== null) p.set('yf', String(s.yearFrom));
  if (s.yearTo !== null) p.set('yt', String(s.yearTo));
  if (s.minRating !== null) p.set('rating', String(s.minRating));
  if (s.minVotecount !== null) p.set('votes', String(s.minVotecount));
  if (s.lengths.length) p.set('len', s.lengths.join(','));
  if (s.devstatus !== null) p.set('dev', String(s.devstatus));
  if (s.olang) p.set('olang', s.olang);
  if (s.langs.length) p.set('lang', s.langs.join(','));
  if (s.platforms.length) p.set('plat', s.platforms.join(','));
  if (s.tagsInc.length) p.set('tag', s.tagsInc.join(','));
  if (s.tagsExc.length) p.set('xtag', s.tagsExc.join(','));
  if (s.tagSpoiler) p.set('tls', String(s.tagSpoiler));
  if (s.hasAnime) p.set('anime', '1');
  if (s.hasScreenshot) p.set('ss', '1');
  if (s.hasDescription) p.set('desc', '1'); // SOD-015: was dropped on write
  if (s.hasReview) p.set('rev', '1');
  if (sort !== DEFAULT_SORT) p.set('sort', sort);
  if (page > 1) p.set('page', String(page));
  return p;
}

/** Lenient numeric query-param reader ("" / junk → null). */
export function numOr(v: string | null): number | null {
  if (v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
