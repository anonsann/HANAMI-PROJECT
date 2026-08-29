/**
 * Date & presentation format utilities for VNDB data shapes.
 */

import { vnLengthLabel } from './vndb/enums';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export type ParsedDate =
  | { kind: 'exact'; year: number; month: number; day: number }
  | { kind: 'month'; year: number; month: number }
  | { kind: 'year'; year: number }
  | { kind: 'tba' }
  | { kind: 'unknown' };

/** Parses VNDB "YYYY-MM-DD" | "YYYY-MM" | "YYYY" | "TBA" release dates. */
export function parseVndbDate(s: string | null | undefined): ParsedDate {
  if (!s || s === 'unknown') return { kind: 'unknown' };
  if (s.toUpperCase() === 'TBA') return { kind: 'tba' };
  const m = s.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
  if (!m) return { kind: 'unknown' };
  const year = Number(m[1]);
  if (m[2] === undefined) return { kind: 'year', year };
  const month = Number(m[2]);
  if (m[3] === undefined) return { kind: 'month', year, month };
  return { kind: 'exact', year, month, day: Number(m[3]) };
}

export function formatVndbDate(s: string | null | undefined): string {
  const p = parseVndbDate(s);
  switch (p.kind) {
    case 'exact':
      return `${MONTHS[p.month - 1]} ${p.day}, ${p.year}`;
    case 'month':
      return `${MONTHS[p.month - 1]} ${p.year}`;
    case 'year':
      return String(p.year);
    case 'tba':
      return 'TBA';
    default:
      return 'Unknown';
  }
}

export function releaseYear(s: string | null | undefined): number | null {
  const p = parseVndbDate(s);
  return p.kind === 'exact' || p.kind === 'month' || p.kind === 'year' ? p.year : null;
}

/**
 * Sortable key honoring VNDB partial-date ordering:
 * "2022" sorts AFTER "2022-12-31", "2022-05" after "2022-05-31".
 */
export function dateSortKey(s: string | null | undefined): string {
  const p = parseVndbDate(s);
  switch (p.kind) {
    case 'exact':
      return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
    case 'month':
      return `${p.year}-${String(p.month).padStart(2, '0')}-99`;
    case 'year':
      return `${p.year}-99-99`;
    case 'tba':
      return '9999-99-99';
    default:
      return '0000-00-00';
  }
}

const CURRENT_YEAR = new Date().getFullYear();

/** "3 years ago"-ish age label for releasing year. */
export function yearAgoLabel(year: number | null): string | null {
  if (year === null) return null;
  const diff = CURRENT_YEAR - year;
  if (diff < 0) return `in ${-diff}y`;
  if (diff === 0) return 'this year';
  if (diff === 1) return '1 year ago';
  return `${diff} years ago`;
}

/** VNDB rating is 10..100; display as 1.0–10.0 with a color band. */
export function formatRating(rating: number | null | undefined): string {
  if (rating === null || rating === undefined) return '—';
  return (rating / 10).toFixed(2);
}

export function ratingTone(rating: number | null | undefined): 'gold' | 'good' | 'mid' | 'low' | 'none' {
  if (rating === null || rating === undefined) return 'none';
  const r = rating / 10;
  if (r >= 8) return 'gold';
  if (r >= 7) return 'good';
  if (r >= 5.5) return 'mid';
  return 'low';
}

export function ratingLabel(rating: number | null | undefined): string {
  if (rating === null || rating === undefined) return 'Not rated';
  const r = rating / 10;
  if (r >= 9) return 'Masterpiece';
  if (r >= 8) return 'Excellent';
  if (r >= 7) return 'Great';
  if (r >= 6) return 'Decent';
  if (r >= 5) return 'So-so';
  if (r >= 3) return 'Weak';
  return 'Appalling';
}

/** Play-time label preferring length_minutes, falling back to the 1..5 enum. */
export function lengthDisplay(length: number | null | undefined, minutes: number | null | undefined): string {
  if (minutes !== null && minutes !== undefined && minutes > 0) {
    const h = minutes / 60;
    const rounded = h >= 10 ? Math.round(h) : Math.round(h * 10) / 10;
    return `~${rounded} h`;
  }
  return vnLengthLabel(length);
}

export function formatTimestamp(ts: number | null | undefined): string {
  if (!ts) return '—';
  const d = new Date(ts * 1000);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Formats vote (10..100) like "8.5". */
export function formatVote(vote: number | null | undefined): string {
  if (vote === null || vote === undefined) return '—';
  return (vote / 10).toFixed(1);
}

/** "8.5" slider label for vote values. */
export function voteToSlider(vote: number): number {
  return vote / 10;
}
