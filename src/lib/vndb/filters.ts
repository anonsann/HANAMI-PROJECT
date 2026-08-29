/**
 * Filter construction helpers for the VNDB query language.
 * Filters are nested JSON arrays: `["and", ["search","=","x"], ...]`.
 */

export type Filter = unknown[];

export const F = {
  eq: (field: string, value: unknown): Filter => [field, '=', value],
  neq: (field: string, value: unknown): Filter => [field, '!=', value],
  gt: (field: string, value: unknown): Filter => [field, '>', value],
  gte: (field: string, value: unknown): Filter => [field, '>=', value],
  lt: (field: string, value: unknown): Filter => [field, '<', value],
  lte: (field: string, value: unknown): Filter => [field, '<=', value],
  and: (...preds: (Filter | null | undefined | false)[]): Filter => ['and', ...preds.filter(Boolean)],
  or: (...preds: (Filter | null | undefined | false)[]): Filter => ['or', ...preds.filter(Boolean)],

  id: (id: string): Filter => ['id', '=', id],
  idsOr: (ids: string[]): Filter =>
    ids.length === 1 ? ['id', '=', ids[0]] : ['or', ...ids.map((id) => ['id', '=', id])],
  search: (q: string): Filter => ['search', '=', q],
  lang: (code: string): Filter => ['lang', '=', code],
  platform: (code: string): Filter => ['platform', '=', code],
  tag: (tagId: string, spoiler = 0, minRating = 0): Filter =>
    tagId.startsWith('g') ? ['tag', '=', [tagId, spoiler, minRating]] : ['tag', '=', tagId],
  dtag: (tagId: string, spoiler = 0, minRating = 0): Filter =>
    tagId.startsWith('g') ? ['dtag', '=', [tagId, spoiler, minRating]] : ['dtag', '=', tagId],
  trait: (traitId: string, spoiler = 0): Filter =>
    traitId.startsWith('i') ? ['trait', '=', [traitId, spoiler]] : ['trait', '=', traitId],
  /** Composable OR for multi-select filters. */
  anyOf: (field: string, values: string[]): Filter =>
    values.length === 1 ? [field, '=', values[0]] : ['or', ...values.map((v) => [field, '=', v] as Filter)],
  /** Year range for `released` (partial-date aware: "2022" sorts after 2022-12-31). */
  releasedBetween: (fromYear: number | null, toYear: number | null): Filter | null => {
    if (fromYear === null && toYear === null) return null;
    const preds: Filter[] = [];
    if (fromYear !== null) preds.push(['released', '>=', String(fromYear)]);
    if (toYear !== null) preds.push(['released', '<', String(toYear + 1)]);
    return preds.length === 1 ? preds[0] : ['and', ...preds];
  }
};

/** Normalizes a possibly-empty filter tree (single child unwrap, no children). */
export function normalizeFilter(f: Filter | null): Filter | null {
  if (!f || f.length === 0) return null;
  if (f[0] === 'and' || f[0] === 'or') {
    const kids = f.slice(1).filter((k): k is Filter => Array.isArray(k) && k.length > 0);
    if (kids.length === 0) return null;
    if (kids.length === 1) return kids[0];
    return [f[0], ...kids];
  }
  return f;
}

/** Combines multiple optional filters with AND, unwrapping when possible. */
export function andAll(...preds: (Filter | null | undefined | false)[]): Filter | null {
  const list = preds.filter(Boolean) as Filter[];
  if (list.length === 0) return null;
  if (list.length === 1) return list[0];
  return ['and', ...list];
}

/* ------------------------------ VN browse model ----------------------------- */

export interface VnFilterState {
  search: string;
  yearFrom: number | null;
  yearTo: number | null;
  minRating: number | null; // 10 - 100
  minVotecount: number | null;
  lengths: number[]; // 1..5
  devstatus: number | null;
  olang: string | null;
  langs: string[];
  platforms: string[];
  tagsInc: string[]; // tag ids
  tagsExc: string[];
  tagSpoiler: number; // max spoiler level for tag matching 0..2
  hasAnime: boolean;
  hasScreenshot: boolean;
  hasDescription: boolean;
  hasReview: boolean;
}

export const EMPTY_VN_FILTER: VnFilterState = {
  search: '',
  yearFrom: null,
  yearTo: null,
  minRating: null,
  minVotecount: null,
  lengths: [],
  devstatus: null,
  olang: null,
  langs: [],
  platforms: [],
  tagsInc: [],
  tagsExc: [],
  tagSpoiler: 0,
  hasAnime: false,
  hasScreenshot: false,
  hasDescription: false,
  hasReview: false
};

/** Serializes the UI filter state to a VNDB query filter. */
export function buildVnFilter(s: VnFilterState): Filter | null {
  return andAll(
    s.search.trim() ? F.search(s.search.trim()) : null,
    F.releasedBetween(s.yearFrom, s.yearTo),
    s.minRating !== null ? F.gte('rating', s.minRating) : null,
    s.minVotecount !== null ? F.gte('votecount', s.minVotecount) : null,
    s.lengths.length > 0 ? F.anyOf('length', s.lengths.map(String)) : null,
    s.devstatus !== null ? F.eq('devstatus', s.devstatus) : null,
    s.olang ? F.eq('olang', s.olang) : null,
    s.langs.length > 0 ? F.and(...s.langs.map((l) => F.lang(l))) : null,
    s.platforms.length > 0 ? F.and(...s.platforms.map((p) => F.platform(p))) : null,
    s.tagsInc.length > 0 ? F.and(...s.tagsInc.map((t) => F.dtag(t, s.tagSpoiler))) : null,
    // Exclusion is expressed with `!=` (the same form the site's advanced search emits).
    s.tagsExc.length > 0 ? F.and(...s.tagsExc.map((t) => ['tag', '!=', [t, s.tagSpoiler, 0]] as Filter)) : null,
    s.hasAnime ? F.eq('has_anime', 1) : null,
    s.hasScreenshot ? F.eq('has_screenshot', 1) : null,
    s.hasDescription ? F.eq('has_description', 1) : null,
    s.hasReview ? F.eq('has_review', 1) : null
  );
}

/* ------------------------------ Release browse ------------------------------ */

export interface ReleaseFilterState {
  search: string;
  yearFrom: number | null;
  yearTo: number | null;
  langs: string[];
  platforms: string[];
  rtype: string | null; // complete/partial/trial
  minage: number | null;
  freeware: boolean;
  doujinOnly: boolean;
  official: boolean;
  patch: boolean;
  voiced: number | null;
  producer: string | null; // producer id
}

export const EMPTY_RELEASE_FILTER: ReleaseFilterState = {
  search: '',
  yearFrom: null,
  yearTo: null,
  langs: [],
  platforms: [],
  rtype: null,
  minage: null,
  freeware: false,
  doujinOnly: false,
  official: false,
  patch: false,
  voiced: null,
  producer: null
};

export function buildReleaseFilter(s: ReleaseFilterState): Filter | null {
  return andAll(
    s.search.trim() ? F.search(s.search.trim()) : null,
    F.releasedBetween(s.yearFrom, s.yearTo),
    s.langs.length > 0 ? F.and(...s.langs.map((l) => F.lang(l))) : null,
    s.platforms.length > 0 ? F.and(...s.platforms.map((p) => F.platform(p))) : null,
    s.rtype ? F.eq('rtype', s.rtype) : null,
    s.minage !== null ? F.lte('minage', s.minage) : null,
    s.freeware ? F.eq('freeware', 1) : null,
    s.official ? F.eq('official', 1) : null,
    s.patch ? F.eq('patch', 1) : null,
    s.voiced !== null ? F.eq('voiced', s.voiced) : null,
    s.producer ? ['producer', '=', ['id', '=', s.producer]] : null
  );
}

/* ----------------------------- Character browse ----------------------------- */

export interface CharacterFilterState {
  search: string;
  role: string | null;
  sex: string | null;
  gender: string | null;
  bloodType: string | null;
  heightFrom: number | null;
  heightTo: number | null;
  weightFrom: number | null;
  weightTo: number | null;
  ageFrom: number | null;
  ageTo: number | null;
  cup: string | null;
  month: number | null;
  day: number | null;
  traitsInc: string[];
  traitsExc: string[];
  traitSpoiler: number;
}

export const EMPTY_CHARACTER_FILTER: CharacterFilterState = {
  search: '',
  role: null,
  sex: null,
  gender: null,
  bloodType: null,
  heightFrom: null,
  heightTo: null,
  weightFrom: null,
  weightTo: null,
  ageFrom: null,
  ageTo: null,
  cup: null,
  month: null,
  day: null,
  traitsInc: [],
  traitsExc: [],
  traitSpoiler: 0
};

export function buildCharacterFilter(s: CharacterFilterState): Filter | null {
  const preds: (Filter | null)[] = [
    s.search.trim() ? F.search(s.search.trim()) : null,
    s.role ? F.eq('role', s.role) : null,
    s.sex ? F.eq('sex', s.sex) : null,
    s.gender ? F.eq('gender', s.gender) : null,
    s.bloodType ? F.eq('blood_type', s.bloodType) : null,
    s.heightFrom !== null ? F.gte('height', s.heightFrom) : null,
    s.heightTo !== null ? F.lte('height', s.heightTo) : null,
    s.weightFrom !== null ? F.gte('weight', s.weightFrom) : null,
    s.weightTo !== null ? F.lte('weight', s.weightTo) : null,
    s.ageFrom !== null ? F.gte('age', s.ageFrom) : null,
    s.ageTo !== null ? F.lte('age', s.ageTo) : null,
    s.cup ? F.eq('cup', s.cup) : null,
    s.month !== null ? F.eq('birthday', [s.month, s.day ?? 0]) : null,
    s.traitsInc.length > 0 ? F.and(...s.traitsInc.map((t) => F.trait(t, s.traitSpoiler))) : null,
    s.traitsExc.length > 0 ? F.and(...s.traitsExc.map((t) => ['trait', '!=', [t, s.traitSpoiler]] as Filter)) : null
  ];
  return andAll(...preds);
}
