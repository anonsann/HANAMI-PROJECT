/** Tiny className joiner (filters falsy values). */
export function cls(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function range(n: number): number[] {
  return Array.from({ length: Math.max(0, Math.floor(n)) }, (_, i) => i);
}

export function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr.slice()];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US').format(n);
}

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Creates an HTML-safe-ish DOM id from arbitrary strings. */
export function domId(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Collapse internal whitespace (titles, search input). */
export function squeeze(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * CSV field escaping with formula-injection hardening (SOD-023).
 *
 * Beyond quoting commas/quotes/newlines, a leading `= + - @` or tab/CR is
 * prefixed with `'` so spreadsheet applications treat the cell as text rather
 * than a formula (OWASP "CSV Injection" guidance).
 */
export function csvCell(s: string): string {
  const needsQuote = /[",\n\r]/.test(s);
  const dangerous = /^[=+\-@\t\r]/.test(s);
  let out = s;
  if (dangerous) out = `'${out}`;
  if (needsQuote) out = `"${out.replace(/"/g, '""')}"`;
  return out;
}

/** Very small seeded PRNG (mulberry32) for deterministic shuffles. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickRandom<T>(arr: T[], rng: () => number = Math.random): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(rng() * arr.length)];
}

/** Trims trailing slash-safe URL join for the API base. */
export function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

/** Numeric comparator that always puts nulls last, keeps it stable. */
export function cmpNullsLast(a: number | null | undefined, b: number | null | undefined): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a - b;
}

/** vndbid sorter: compares the numeric part, then the prefix. */
export function cmpVndbid(a: string, b: string): number {
  const pa = a.match(/^([a-z]+)(\d+)$/i);
  const pb = b.match(/^([a-z]+)(\d+)$/i);
  if (pa && pb && pa[1] === pb[1]) return Number(pa[2]) - Number(pb[2]);
  return a < b ? -1 : a > b ? 1 : 0;
}

export function extractVndbid(input: string): string | null {
  const m = squeeze(input).match(/\b([vcpsrgitqu]\d{1,9}|sf\d+|cv\d+)\b/i);
  return m ? m[1].toLowerCase() : null;
}

export function hoursFromMinutes(min: number | null | undefined): string {
  if (min === null || min === undefined || min <= 0) return '—';
  const h = min / 60;
  const rounded = h >= 10 ? Math.round(h) : Math.round(h * 10) / 10;
  return `${rounded}h`;
}

/** Runs tasks with limited concurrency. */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let i = 0;
  async function worker(): Promise<void> {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(range(Math.min(limit, items.length)).map(() => worker()));
  return out;
}
