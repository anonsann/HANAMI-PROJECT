import { describe, it, expect } from 'vitest';
import {
  parseVndbDate,
  formatVndbDate,
  dateSortKey,
  formatRating,
  ratingTone,
  lengthDisplay,
  formatTimestamp,
  releaseYear,
  formatVote
} from './format';

describe('parseVndbDate', () => {
  it('parses full dates', () => {
    expect(parseVndbDate('2009-10-15')).toEqual({ kind: 'exact', year: 2009, month: 10, day: 15 });
  });
  it('parses month precision', () => {
    expect(parseVndbDate('2009-10')).toEqual({ kind: 'month', year: 2009, month: 10 });
  });
  it('parses year precision', () => {
    expect(parseVndbDate('2009')).toEqual({ kind: 'year', year: 2009 });
  });
  it('handles TBA and unknown', () => {
    expect(parseVndbDate('TBA')).toEqual({ kind: 'tba' });
    expect(parseVndbDate('unknown')).toEqual({ kind: 'unknown' });
    expect(parseVndbDate(null)).toEqual({ kind: 'unknown' });
    expect(parseVndbDate('not-a-date')).toEqual({ kind: 'unknown' });
  });
});

describe('formatVndbDate', () => {
  it('renders each precision', () => {
    expect(formatVndbDate('2009-10-15')).toBe('Oct 15, 2009');
    expect(formatVndbDate('2009-10')).toBe('Oct 2009');
    expect(formatVndbDate('2009')).toBe('2009');
    expect(formatVndbDate('TBA')).toBe('TBA');
    expect(formatVndbDate(null)).toBe('Unknown');
  });
});

describe('dateSortKey', () => {
  it('orders partial dates after complete ones (VNDB semantics)', () => {
    expect(dateSortKey('2022-12-31') < dateSortKey('2022')).toBe(true);
    expect(dateSortKey('2022') < dateSortKey('2023')).toBe(true);
    expect(dateSortKey('2022-05-31') < dateSortKey('2022-05')).toBe(true);
  });
  it('pushes TBA last, unknown first', () => {
    expect(dateSortKey('TBA')).toBe('9999-99-99');
    expect(dateSortKey(undefined)).toBe('0000-00-00');
  });
  it('sorts chronologically for exact dates', () => {
    const dates = ['2009-10-15', '2004-01-28', '2024-06-01', '1999-12-24'];
    const sorted = [...dates].sort((a, b) => dateSortKey(a).localeCompare(dateSortKey(b)));
    expect(sorted[0]).toBe('1999-12-24');
    expect(sorted[sorted.length - 1]).toBe('2024-06-01');
  });
});

describe('ratings', () => {
  it('formats as x.xx out of 10', () => {
    expect(formatRating(89)).toBe('8.90');
    expect(formatRating(75.5 as unknown as number)).toBe('7.55');
  });
  it('guards nulls', () => {
    expect(formatRating(null)).toBe('—');
    expect(formatRating(undefined)).toBe('—');
  });
  it('assigns tones by band', () => {
    expect(ratingTone(91)).toBe('gold');
    expect(ratingTone(75)).toBe('good');
    expect(ratingTone(61)).toBe('mid');
    expect(ratingTone(30)).toBe('low');
    expect(ratingTone(null)).toBe('none');
  });
});

describe('lengthDisplay', () => {
  it('prefers minute votes', () => {
    expect(lengthDisplay(3, 1230)).toBe('~21 h');
    expect(lengthDisplay(3, 480)).toBe('~8 h');
    expect(lengthDisplay(3, 250)).toBe('~4.2 h');
  });
  it('falls back to the length class', () => {
    expect(lengthDisplay(3, null)).toBe('Medium');
    expect(lengthDisplay(1, 0)).toBe('Very short');
  });
  it('handles absence', () => {
    expect(lengthDisplay(null, null)).toBe('Unknown');
  });
});

describe('misc formats', () => {
  it('formats unix timestamps', () => {
    const s = formatTimestamp(1_700_000_000);
    expect(s).toMatch(/2023/);
    expect(formatTimestamp(null)).toBe('—');
  });
  it('extracts release years', () => {
    expect(releaseYear('2009-10')).toBe(2009);
    expect(releaseYear('TBA')).toBeNull();
  });
  it('formats votes', () => {
    expect(formatVote(85)).toBe('8.5');
    expect(formatVote(null)).toBe('—');
  });
});
