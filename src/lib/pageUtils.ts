/** Small helpers shared by browse pages. */

export function commonToggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

export function numOrNull(v: string): number | null {
  if (v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Keep a year-ish input inside sensible bounds or null. */
export function yearOrNull(v: string): number | null {
  const n = numOrNull(v);
  if (n === null) return null;
  return Math.max(1900, Math.min(new Date().getFullYear() + 5, Math.floor(n)));
}

/** Pagination helper for count-less responses: guess pages from `more`. */
export function guessTotalPages(page: number, more: boolean): number {
  return more ? page + 1 : page;
}
