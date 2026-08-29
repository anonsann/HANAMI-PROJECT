import { describe, it, expect } from 'vitest';
import { F, andAll, normalizeBooleanGroups, buildVnFilter, buildReleaseFilter, buildCharacterFilter, EMPTY_VN_FILTER, EMPTY_RELEASE_FILTER, EMPTY_CHARACTER_FILTER } from './filters';

describe('filter primitives', () => {
  it('builds predicates', () => {
    expect(F.eq('id', 'v17')).toEqual(['id', '=', 'v17']);
    expect(F.gte('rating', 80)).toEqual(['rating', '>=', 80]);
  });
  it('builds OR-for-multi-select', () => {
    expect(F.anyOf('platform', ['win', 'mac'])).toEqual(['or', ['platform', '=', 'win'], ['platform', '=', 'mac']]);
    expect(F.anyOf('platform', ['win'])).toEqual(['platform', '=', 'win']);
  });
  it('builds id OR batches', () => {
    const f = F.idsOr(['v1', 'v2', 'v3']);
    expect(f[0]).toBe('or');
    expect(f.length).toBe(4);
  });
  it('andAll collapses single and empty', () => {
    expect(andAll(null, false, undefined)).toBeNull();
    expect(andAll(null, ['id', '=', 'v1'])).toEqual(['id', '=', 'v1']);
    expect(andAll(['a', '=', 1], ['b', '=', 2])).toEqual(['and', ['a', '=', 1], ['b', '=', 2]]);
  });
  it('releasedBetween honors partial-year inclusion', () => {
    expect(F.releasedBetween(2020, 2022)).toEqual(['and', ['released', '>=', '2020'], ['released', '<', '2023']]);
    expect(F.releasedBetween(null, 2022)).toEqual(['released', '<', '2023']);
    expect(F.releasedBetween(2020, null)).toEqual(['released', '>=', '2020']);
    expect(F.releasedBetween(null, null)).toBeNull();
  });
});

describe('buildVnFilter', () => {
  it('empty state yields no filter', () => {
    expect(buildVnFilter({ ...EMPTY_VN_FILTER })).toBeNull();
  });
  it('trims search and drops it when blank', () => {
    expect(buildVnFilter({ ...EMPTY_VN_FILTER, search: '   ' })).toBeNull();
    const f = buildVnFilter({ ...EMPTY_VN_FILTER, search: '  steins;gate  ' });
    expect(f).toEqual(['search', '=', 'steins;gate']);
  });
  it('combines constraints with and', () => {
    const f = buildVnFilter({
      ...EMPTY_VN_FILTER,
      langs: ['en', 'ja'],
      platforms: ['win'],
      minRating: 70,
      tagsInc: ['g43'],
      tagsExc: ['g205'],
      tagSpoiler: 1
    })!;
    expect(f[0]).toBe('and');
    const flat = JSON.stringify(f);
    expect(flat).toContain('"lang","=","en"');
    expect(flat).toContain('"lang","=","ja"');
    expect(flat).toContain('"rating",">=",70');
    expect(flat).toContain('"dtag","=",["g43",1,0]');
    expect(flat).toContain('"tag","!=",["g205",1,0]');
  });
  it('encodes boolean "has" flags', () => {
    const f = JSON.stringify(buildVnFilter({ ...EMPTY_VN_FILTER, hasAnime: true, hasReview: true }));
    expect(f).toContain('"has_anime"');
  });
});

describe('buildReleaseFilter', () => {
  it('empty state yields no filter', () => {
    expect(buildReleaseFilter({ ...EMPTY_RELEASE_FILTER })).toBeNull();
  });
  it('builds composite filters', () => {
    const f = JSON.stringify(
      buildReleaseFilter({ ...EMPTY_RELEASE_FILTER, rtype: 'complete', minage: 15, producer: 'p7', official: true, voiced: 4 })
    );
    expect(f).toContain('"rtype","=","complete"');
    expect(f).toContain('"minage","<=",15');
    expect(f).toContain('"producer","=",["id","=","p7"]');
    expect(f).toContain('"official","=",1');
    expect(f).toContain('"voiced","=",4');
  });
});

describe('buildCharacterFilter', () => {
  it('empty state yields no filter', () => {
    expect(buildCharacterFilter({ ...EMPTY_CHARACTER_FILTER })).toBeNull();
  });
  it('encodes birthday with zero-day wildcard', () => {
    expect(buildCharacterFilter({ ...EMPTY_CHARACTER_FILTER, month: 4, day: null })).toEqual(['birthday', '=', [4, 0]]);
    expect(buildCharacterFilter({ ...EMPTY_CHARACTER_FILTER, month: 4, day: 14 })).toEqual(['birthday', '=', [4, 14]]);
  });
  it('builds trait includes/excludes with spoiler caps', () => {
    const f = JSON.stringify(
      buildCharacterFilter({ ...EMPTY_CHARACTER_FILTER, traitsInc: ['i80'], traitsExc: ['i900'], traitSpoiler: 1, heightFrom: 150, heightTo: 180 })
    );
    expect(f).toContain('"trait","=",["i80",1]');
    expect(f).toContain('"trait","!=",["i900",1]');
    expect(f).toContain('"height",">=",150');
    expect(f).toContain('"height","<=",180');
  });
});

describe('normalizeBooleanGroups (SOD-016)', () => {
  it('unwraps a single-child and', () => {
    expect(normalizeBooleanGroups(['and', ['id', '>=', 'v5']])).toEqual(['id', '>=', 'v5']);
  });
  it('unwraps a single-child or', () => {
    expect(normalizeBooleanGroups(['or', ['lang', '=', 'ja']])).toEqual(['lang', '=', 'ja']);
  });
  it('keeps genuine multi-child groups', () => {
    const f = ['and', ['lang', '=', 'ja'], ['platform', '=', 'win']];
    expect(normalizeBooleanGroups(f)).toEqual(f);
  });
  it('recurses into nested groups', () => {
    const f = ['and', ['or', ['lang', '=', 'ja']], ['id', '>=', 'v5']];
    expect(normalizeBooleanGroups(f)).toEqual(['and', ['lang', '=', 'ja'], ['id', '>=', 'v5']]);
  });
  it('drops empty groups produced by all-false children', () => {
    expect(normalizeBooleanGroups(['and', ['and'], ['id', '=', 'v1']])).toEqual(['id', '=', 'v1']);
  });
  it('returns non-array filters untouched', () => {
    expect(normalizeBooleanGroups([])).toEqual([]);
  });
});

describe('single-predicate filter construction (SOD-016)', () => {
  it('F.and with one predicate is normalized to the predicate itself', () => {
    expect(F.and(['lang', '=', 'ja'])).toEqual(['lang', '=', 'ja']);
  });
  it('F.or with one predicate is normalized to the predicate itself', () => {
    expect(F.or(['lang', '=', 'ja'])).toEqual(['lang', '=', 'ja']);
  });
  it('F.and with several predicates keeps the group', () => {
    expect(F.and(['lang', '=', 'ja'], ['lang', '=', 'en'])).toEqual([
      'and',
      ['lang', '=', 'ja'],
      ['lang', '=', 'en']
    ]);
  });
});

describe('buildVnFilter single-language case (SOD-016)', () => {
  it('a lone language filter compiles to a plain predicate, not a 1-child and', () => {
    const f = buildVnFilter({ ...EMPTY_VN_FILTER, langs: ['ja'] });
    expect(f).toEqual(['lang', '=', 'ja']);
  });
  it('andAll output never contains 1-child boolean groups', () => {
    const f = andAll(['search', '=', 'x'], F.and(['lang', '=', 'ja']));
    const bad: unknown[] = [];
    const walk = (node: unknown): void => {
      if (!Array.isArray(node)) return;
      if ((node[0] === 'and' || node[0] === 'or') && node.length === 2) bad.push(node);
      node.slice(1).forEach(walk);
    };
    walk(f);
    expect(bad).toEqual([]);
  });
});
