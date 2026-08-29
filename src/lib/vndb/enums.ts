/**
 * Curated VNDB enumeration maps.
 *
 * The complete, authoritative list lives in GET /schema; these maps cover the
 * commonly used values and gracefully fall back to the raw code otherwise.
 */

export const LANGUAGES: Record<string, string> = {
  ar: 'Arabic',
  be: 'Belarusian',
  bg: 'Bulgarian',
  ca: 'Catalan',
  cs: 'Czech',
  da: 'Danish',
  de: 'German',
  el: 'Greek',
  en: 'English',
  eo: 'Esperanto',
  es: 'Spanish',
  fi: 'Finnish',
  fr: 'French',
  he: 'Hebrew',
  hr: 'Croatian',
  hu: 'Hungarian',
  id: 'Indonesian',
  it: 'Italian',
  ja: 'Japanese',
  ko: 'Korean',
  ms: 'Malay',
  nl: 'Dutch',
  no: 'Norwegian',
  pl: 'Polish',
  'pt-br': 'Portuguese (Brazil)',
  'pt-pt': 'Portuguese (Portugal)',
  ro: 'Romanian',
  ru: 'Russian',
  sk: 'Slovak',
  sl: 'Slovenian',
  sr: 'Serbian',
  sv: 'Swedish',
  th: 'Thai',
  tr: 'Turkish',
  uk: 'Ukrainian',
  vi: 'Vietnamese',
  'zh-Hans': 'Chinese (Simplified)',
  'zh-Hant': 'Chinese (Traditional)',
  zh: 'Chinese'
};

/** Languages offered as quick filter chips (most common). */
export const COMMON_LANGUAGES = ['en', 'ja', 'zh-Hans', 'zh-Hant', 'ru', 'de', 'fr', 'es', 'ko', 'it', 'pt-br'];

export function languageName(code: string): string {
  return LANGUAGES[code] ?? code;
}

export const PLATFORMS: Record<string, string> = {
  win: 'Windows',
  lin: 'Linux',
  mac: 'macOS',
  web: 'Website',
  ios: 'iOS',
  and: 'Android',
  mob: 'Other mobile',
  psp: 'PlayStation Portable',
  psv: 'PlayStation Vita',
  ps2: 'PlayStation 2',
  ps3: 'PlayStation 3',
  ps4: 'PlayStation 4',
  ps5: 'PlayStation 5',
  xb3: 'Xbox 360',
  xbo: 'Xbox One',
  xsx: 'Xbox Series X/S',
  nds: 'Nintendo DS',
  '3ds': 'Nintendo 3DS',
  swi: 'Nintendo Switch',
  wii: 'Wii',
  nes: 'NES',
  snes: 'SNES',
  n64: 'Nintendo 64',
  gba: 'Game Boy Advance',
  gbc: 'Game Boy Color',
  sat: 'Sega Saturn',
  dc: 'Dreamcast',
  dvd: 'DVD Player',
  bdp: 'Blu-ray Player',
  dos: 'DOS',
  fmt: 'FM Towns',
  x68: 'X68000',
  pce: 'PC Engine',
  'pc-98': 'PC-98',
  cas: 'Casio Loopy',
  vnd: 'VNDS',
  oth: 'Other'
};

export const COMMON_PLATFORMS = ['win', 'lin', 'mac', 'web', 'and', 'ios', 'swi', 'psv', 'ps4', 'ps5', 'psp', 'ps2'];

export function platformName(code: string): string {
  return PLATFORMS[code] ?? code.toUpperCase();
}

/** VN relation types (relations relation codes). */
export const RELATIONS: Record<string, string> = {
  seq: 'Sequel',
  preq: 'Prequel',
  set: 'Same setting',
  alt: 'Alternative version',
  char: 'Shares characters',
  side: 'Side story',
  par: 'Parent story',
  ser: 'Same series',
  fan: 'Fandisc',
  orig: 'Original game'
};

export function relationName(code: string): string {
  return RELATIONS[code] ?? code;
}

/** Staff roles (schema enums.staff_role). */
export const STAFF_ROLES: Record<string, string> = {
  scenario: 'Scenario',
  director: 'Director',
  chardesign: 'Character Design',
  art: 'Artist',
  music: 'Music',
  songs: 'Vocals',
  translator: 'Translator',
  editor: 'Editor',
  staff: 'Staff'
};

export function staffRoleName(code: string): string {
  return STAFF_ROLES[code] ?? code;
}

export const PRODUCER_TYPES: Record<string, string> = {
  co: 'Company',
  in: 'Individual',
  ng: 'Amateur group'
};

export function producerTypeName(code: string | null | undefined): string {
  if (!code) return '—';
  return PRODUCER_TYPES[code] ?? code;
}

export const TAG_CATEGORIES: Record<string, string> = {
  cont: 'Content',
  ero: 'Sexual content',
  tech: 'Technical'
};

export function tagCategoryName(code: string): string {
  return TAG_CATEGORIES[code] ?? code;
}

/** VN length estimate (1..5). */
export const VN_LENGTHS = ['—', 'Very short', 'Short', 'Medium', 'Long', 'Very long'] as const;
export const VN_LENGTH_HINTS = [
  '',
  'Under 2 hours',
  '2 – 10 hours',
  '10 – 30 hours',
  '30 – 50 hours',
  'Over 50 hours'
] as const;

export function vnLengthLabel(length: number | null | undefined): string {
  if (length === null || length === undefined || length < 1 || length > 5) return 'Unknown';
  return VN_LENGTHS[length] ?? 'Unknown';
}

export const DEVSTATUS = ['Finished', 'In development', 'Cancelled'] as const;

export function devstatusLabel(v: number | null | undefined): string {
  return v !== null && v !== undefined ? DEVSTATUS[v] ?? 'Unknown' : 'Unknown';
}

/** Release vns.rtype */
export const RELEASE_TYPES: Record<string, string> = {
  complete: 'Complete',
  partial: 'Partial',
  trial: 'Trial'
};

export function releaseTypeName(code: string): string {
  return RELEASE_TYPES[code] ?? code;
}

export const VOICED = ['—', 'Not voiced', 'Only ero scenes voiced', 'Partially voiced', 'Fully voiced'] as const;

export function voicedLabel(v: number | null | undefined): string {
  if (v === null || v === undefined) return 'Unknown';
  return VOICED[v] ?? 'Unknown';
}

/** Release media types (subset; falls back to raw code). */
export const MEDIA_TYPES: Record<string, string> = {
  in: 'Internet download',
  cd: 'CD',
  dvd: 'DVD',
  gdr: 'GD-ROM',
  blr: 'Blu-ray',
  flp: 'Floppy',
  mro: 'Memory card',
  umd: 'UMD',
  nod: 'Nintendo Optical Disc',
  otc: 'Other console cartridge',
  ot: 'Other media'
};

export function mediaTypeName(code: string): string {
  return MEDIA_TYPES[code] ?? code;
}

export const RESOLUTIONS: Record<string, string> = {
  '640x480': '4:3 SD',
  '800x600': 'SVGA',
  '1024x576': 'Widescreen SD',
  '1024x768': 'XGA',
  '1280x720': '720p',
  '1280x768': 'WXGA',
  '1280x800': 'WXGA+',
  '1280x960': '4:3 HD',
  '1366x768': 'Laptop wide',
  '1600x900': '900p',
  '1920x1080': '1080p',
  '1920x1200': 'WUXGA',
  '2560x1440': '1440p',
  '3840x2160': '4K'
};

export function resolutionLabel(v: [number, number] | 'non-standard' | null | undefined): string {
  if (v === null || v === undefined) return 'Unknown';
  if (v === 'non-standard') return 'Non-standard';
  const key = `${v[0]}x${v[1]}`;
  return `${v[0]}×${v[1]}${RESOLUTIONS[key] ? ` (${RESOLUTIONS[key]})` : ''}`;
}

/** Character roles. */
export const CHARACTER_ROLES: Record<string, string> = {
  main: 'Protagonist',
  primary: 'Main character',
  side: 'Side character',
  appears: 'Appears'
};

export function characterRoleName(code: string): string {
  return CHARACTER_ROLES[code] ?? code;
}

export const CHARACTER_ROLE_ORDER: Record<string, number> = { main: 0, primary: 1, side: 2, appears: 3 };

export const SEXES: Record<string, string> = { m: 'Male', f: 'Female', b: 'Both', n: 'Sexless' };
export const GENDERS: Record<string, string> = { m: 'Male', f: 'Female', o: 'Non-binary', a: 'Ambiguous' };

export const BLOOD_TYPES = ['a', 'b', 'ab', 'o'] as const;

export const CUP_SIZES = ['AAA', 'AA', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'] as const;

export const MINAGES = [0, 12, 13, 15, 16, 17, 18] as const;

/** User list: built-in label ids (same for everyone; custom labels are >= 10). */
export const BUILTIN_LABELS: Record<number, string> = {
  1: 'Playing',
  2: 'Finished',
  3: 'Stalled',
  4: 'Dropped',
  5: 'Wishlist',
  6: 'Blacklist',
  7: 'Voted'
};

/** Release list_status meanings. */
export const RLIST_STATUSES = ['Unknown', 'Pending', 'Obtained', 'On loan', 'Deleted'] as const;

export function rlistStatusName(v: number): string {
  return RLIST_STATUSES[v] ?? 'Unknown';
}

export const SPOILER_LEVELS = ['No spoilers', 'Minor spoilers', 'Major spoilers'] as const;

export function spoilerLevelName(v: number): string {
  return SPOILER_LEVELS[v] ?? String(v);
}

/** Image severity → a coarse 0/1/2 bucket used for NSFW gating. */
export function severityBucket(v: number | null | undefined): 0 | 1 | 2 {
  if (v === null || v === undefined || v <= 0.4) return 0;
  if (v <= 1.4) return 1;
  return 2;
}
