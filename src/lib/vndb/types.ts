/**
 * VNDB API v2 ("Kana") type definitions.
 * Mirrors https://api.vndb.org/kana — field names verified against the spec.
 */

export type Vndbid = string;

/** Generic VNDB image object (VN covers & screenshots, character art, release package scans). */
export interface VImage {
  id: string;
  url: string;
  dims?: [number, number];
  thumbnail?: string;
  thumbnail_dims?: [number, number];
  /** Average sexual content vote, 0..2 */
  sexual?: number;
  /** Average violence vote, 0..2 */
  violence?: number;
  votecount?: number;
}

export interface Extlink {
  url: string;
  label?: string;
  name?: string;
  id?: string | number | null;
}

export interface VnTitle {
  lang: string;
  title: string;
  latin?: string | null;
  official?: boolean;
  main?: boolean;
}

export interface VnRelation {
  id: Vndbid;
  relation: string;
  relation_official?: boolean;
  title?: string;
  /** Only present when requested via relations.* */
  alttitle?: string | null;
  released?: string | null;
  rating?: number | null;
  votecount?: number | null;
  image?: VImage | null;
}

export interface VnTagEntry {
  id: Vndbid;
  rating: number; // 0..3
  spoiler: 0 | 1 | 2;
  lie?: boolean;
  // tag fields:
  name?: string;
  aliases?: string[];
  description?: string;
  category?: 'cont' | 'ero' | 'tech';
  searchable?: boolean;
  applicable?: boolean;
  vn_count?: number;
}

export interface VnDeveloper extends Partial<Producer> {
  id: Vndbid;
  name: string;
}

export interface VnEdition {
  eid: number;
  lang?: string | null;
  name?: string;
  official?: boolean;
}

export interface VnStaffEntry extends Partial<Staff> {
  id: Vndbid;
  aid?: number;
  eid: number | null;
  role: string;
  note?: string | null;
  name?: string;
}

export interface VnVaEntry {
  note?: string | null;
  staff?: Partial<Staff> & { id: Vndbid };
  character?: Partial<Character> & { id: Vndbid };
}

export interface VnScreenshotEntry extends VImage {
  release?: { id: Vndbid };
}

export interface VisualNovel {
  id: Vndbid;
  title: string;
  alttitle?: string | null;
  titles?: VnTitle[];
  aliases?: string[];
  olang?: string;
  devstatus?: 0 | 1 | 2;
  released?: string | null;
  languages?: string[];
  platforms?: string[];
  image?: VImage | null;
  length?: number | null;
  length_minutes?: number | null;
  length_votes?: number | null;
  description?: string | null;
  average?: number | null;
  rating?: number | null;
  votecount?: number | null;
  screenshots?: VnScreenshotEntry[];
  relations?: VnRelation[];
  tags?: VnTagEntry[];
  developers?: VnDeveloper[];
  editions?: VnEdition[];
  staff?: VnStaffEntry[];
  va?: VnVaEntry[];
  extlinks?: Extlink[];
}

/* ---------------------------------- Release --------------------------------- */

export interface ReleaseLanguage {
  lang: string;
  title?: string | null;
  latin?: string | null;
  mtl?: boolean;
  main?: boolean;
}

export interface ReleaseMedia {
  medium: string;
  qty: number;
}

export interface ReleaseVnEntry {
  id: Vndbid;
  rtype?: 'complete' | 'partial' | 'trial';
  title?: string;
  alttitle?: string | null;
  rating?: number | null;
  image?: VImage | null;
}

export interface ReleaseProducerEntry extends Partial<Producer> {
  id: Vndbid;
  name?: string;
  developer?: boolean;
  publisher?: boolean;
}

export interface ReleaseImage extends VImage {
  type?: 'pkgfront' | 'pkgback' | 'pkgcontent' | 'pkgside' | 'pkgmed' | 'dig';
  vn?: Vndbid | null;
  languages?: string[] | null;
  photo?: boolean;
}

export interface Release {
  id: Vndbid;
  title: string;
  alttitle?: string | null;
  titles?: VnTitle[];
  languages?: ReleaseLanguage[];
  platforms?: string[];
  media?: ReleaseMedia[];
  vns?: ReleaseVnEntry[];
  producers?: ReleaseProducerEntry[];
  images?: ReleaseImage[];
  released?: string;
  minage?: number | null;
  patch?: boolean;
  freeware?: boolean;
  uncensored?: boolean | null;
  official?: boolean;
  has_ero?: boolean;
  resolution?: [number, number] | 'non-standard' | null;
  engine?: string | null;
  voiced?: number | null; // 1..4
  notes?: string | null;
  gtin?: string | null;
  catalog?: string | null;
  extlinks?: Extlink[];
}

/* ---------------------------------- Producer -------------------------------- */

export interface Producer {
  id: Vndbid;
  aid?: number;
  name: string;
  original?: string | null;
  aliases?: string[];
  lang?: string;
  type?: 'co' | 'in' | 'ng' | string;
  description?: string | null;
  extlinks?: Extlink[];
}

/* ---------------------------------- Character ------------------------------- */

export interface CharacterVnEntry {
  id: Vndbid;
  spoiler?: 0 | 1 | 2;
  role?: 'main' | 'primary' | 'side' | 'appears';
  title?: string;
  alttitle?: string | null;
  released?: string | null;
  rating?: number | null;
  image?: VImage | null;
  release?: { id: Vndbid } | null;
}

export interface CharacterTraitEntry {
  id: Vndbid;
  spoiler: 0 | 1 | 2;
  lie?: boolean;
  name?: string;
  group_id?: Vndbid;
  group_name?: string;
  description?: string;
  aliases?: string[];
  applicable?: boolean;
  searchable?: boolean;
  char_count?: number;
  rating?: number;
}

export interface Character {
  id: Vndbid;
  aid?: number;
  name: string;
  original?: string | null;
  aliases?: string[];
  description?: string | null;
  image?: VImage | null;
  blood_type?: 'a' | 'b' | 'ab' | 'o' | null;
  height?: number | null;
  weight?: number | null;
  bust?: number | null;
  waist?: number | null;
  hips?: number | null;
  cup?: string | null;
  age?: number | null;
  birthday?: [number, number] | null;
  /** [apparent, real(spoiler)] */
  sex?: [string | null, string | null] | null;
  /** [non-spoiler, actual(spoiler)] */
  gender?: [string | null, string | null] | null;
  vns?: CharacterVnEntry[];
  traits?: CharacterTraitEntry[];
}

/* ------------------------------------ Staff --------------------------------- */

export interface StaffAlias {
  aid: number;
  name: string;
  latin?: string | null;
  ismain?: boolean;
}

export interface Staff {
  id: Vndbid;
  aid?: number;
  ismain?: boolean;
  name: string;
  original?: string | null;
  lang?: string;
  gender?: 'm' | 'f' | null;
  description?: string | null;
  aliases?: StaffAlias[];
  extlinks?: Extlink[];
}

/* ---------------------------------- Tag/Trait ------------------------------- */

export interface Tag {
  id: Vndbid;
  name: string;
  aliases?: string[];
  description?: string;
  category: 'cont' | 'ero' | 'tech';
  searchable?: boolean;
  applicable?: boolean;
  vn_count: number;
}

export interface Trait {
  id: Vndbid;
  name: string;
  aliases?: string[];
  description?: string;
  searchable?: boolean;
  applicable?: boolean;
  sexual?: boolean;
  group_id?: Vndbid;
  group_name?: string;
  char_count: number;
}

/* ------------------------------------ Quote --------------------------------- */

export interface Quote {
  id: Vndbid;
  quote: string;
  score?: number | null;
  vn?: { id: Vndbid; title?: string };
  character?: { id: Vndbid; name?: string } | null;
}

/* --------------------------------- User/Stats ------------------------------- */

export interface AuthInfo {
  id: Vndbid;
  username: string;
  permissions: string[];
}

export interface UserInfo {
  id: Vndbid;
  username: string;
  lengthvotes?: number;
  lengthvotes_sum?: number;
}

export interface DbStats {
  chars: number;
  producers: number;
  releases: number;
  staff: number;
  tags: number;
  traits: number;
  vn: number;
}

export interface UlistLabel {
  id: number;
  private: boolean;
  label: string;
  count?: number;
}

export interface UlistReleaseEntry {
  id: Vndbid;
  list_status?: number;
  title?: string;
  released?: string;
}

export interface UlistItem {
  id: Vndbid;
  added?: number;
  voted?: number | null;
  lastmod?: number;
  vote?: number | null;
  started?: string | null;
  finished?: string | null;
  notes?: string | null;
  labels?: { id: number; label: string }[];
  vn?: VisualNovel;
  releases?: UlistReleaseEntry[];
}

/* --------------------------------- Query/Resp ------------------------------- */

export interface ApiResponse<T> {
  results: T[];
  more: boolean;
  count?: number;
}

export interface QueryBody {
  filters?: unknown;
  fields?: string;
  sort?: string;
  reverse?: boolean;
  results?: number;
  page?: number;
  user?: string | null;
  count?: boolean;
}

export type Endpoint =
  | 'vn'
  | 'release'
  | 'producer'
  | 'character'
  | 'staff'
  | 'tag'
  | 'trait'
  | 'quote'
  | 'ulist';
