import { describe, it, expect } from 'vitest';
import { readVnFilterState, writeVnFilterState, SORT_PARAM_WHITELIST, type SortPair } from './vnFilterUrl';

describe('readVnFilterState', () => {
  it('returns the empty filter for an empty query', () => {
    const s = readVnFilterState(new URLSearchParams(''));
    expect(s.search).toBe('');
    expect(s.hasAnime).toBe(false);
    expect(s.hasDescription).toBe(false);
    expect(s.tagsInc).toEqual([]);
  });
  it('parses all documented params', () => {
    const s = readVnFilterState(new URLSearchParams('search=fate&yf=2020&yt=2024&rating=70&votes=100&len=1,3&dev=1&olang=ja&lang=en,ja&plat=win&tag=g43&xtag=g205&tls=1&anime=1&ss=1&desc=1&rev=1'));
    expect(s.search).toBe('fate');
    expect(s.yearFrom).toBe(2020);
    expect(s.yearTo).toBe(2024);
    expect(s.minRating).toBe(70);
    expect(s.minVotecount).toBe(100);
    expect(s.lengths).toEqual([1, 3]);
    expect(s.devstatus).toBe(1);
    expect(s.olang).toBe('ja');
    expect(s.langs).toEqual(['en', 'ja']);
    expect(s.platforms).toEqual(['win']);
    expect(s.tagsInc).toEqual(['g43']);
    expect(s.tagsExc).toEqual(['g205']);
    expect(s.tagSpoiler).toBe(1);
    expect(s.hasAnime).toBe(true);
    expect(s.hasScreenshot).toBe(true);
    expect(s.hasDescription).toBe(true);
    expect(s.hasReview).toBe(true);
  });
  it('ignores junk numbers and out-of-range lengths', () => {
    const s = readVnFilterState(new URLSearchParams('rating=abc&len=0,7,3'));
    expect(s.minRating).toBeNull();
    expect(s.lengths).toEqual([3]);
  });
});

describe('writeVnFilterState', () => {
  it('round-trips every field including hasDescription (SOD-015)', () => {
    const p = writeVnFilterState(
      {
        ...readVnFilterState(new URLSearchParams('')),
        search: 'clannad',
        minRating: 80,
        hasDescription: true
      },
      'searchrank|desc',
      2
    );
    expect(p.get('desc')).toBe('1');
    expect(p.get('sort')).toBe('searchrank|desc');
    expect(p.get('page')).toBe('2');
    const back = readVnFilterState(p);
    expect(back.hasDescription).toBe(true);
    expect(back.search).toBe('clannad');
  });
  it('omits default sort and page 1', () => {
    const p = writeVnFilterState({ ...readVnFilterState(new URLSearchParams('')) }, 'rating|desc', 1);
    expect(p.get('sort')).toBeNull();
    expect(p.get('page')).toBeNull();
    expect(String(p)).toBe('');
  });
});

describe('sort param whitelist (SOD-021 guard)', () => {
  it('contains the shipped sort keys', () => {
    expect(SORT_PARAM_WHITELIST).toContain('rating|desc');
    expect(SORT_PARAM_WHITELIST).toContain('searchrank|desc');
  });
  it('is exported as a plain array of strings', () => {
    const allStrings = SORT_PARAM_WHITELIST.every((s) => typeof s === 'string');
    expect(allStrings).toBe(true);
  });
  it('SortPair can be narrowed from the whitelist', () => {
    const v: string = 'votecount|desc';
    expect(SORT_PARAM_WHITELIST.includes(v as SortPair)).toBe(true);
  });
});
