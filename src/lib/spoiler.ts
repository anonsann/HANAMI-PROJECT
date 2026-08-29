/**
 * Spoiler & NSFW gating — one canonical place for content-safety decisions.
 */

import type { VImage } from './vndb/types';

export interface HasSpoiler {
  spoiler: number;
}

/** Filter a tagged list by the user's maximum spoiler tolerance. */
export function gateSpoilers<T extends HasSpoiler>(items: T[], maxSpoiler: number): T[] {
  const cap = Math.max(0, Math.min(2, maxSpoiler));
  return items.filter((i) => (i.spoiler ?? 0) <= cap);
}

/** Pick the visible half of a [apparent, real] character property. */
export function gateSpoileredPair(pair: [string | null, string | null] | null | undefined, maxSpoiler: number): string | null {
  if (!pair) return null;
  if (maxSpoiler >= 1 && pair[1] !== null) return pair[1];
  return pair[0];
}

export type NsfwMode = 'strict' | 'blur' | 'show';

/** Should this image be blurred/hidden given the user's NSFW mode? */
export function shouldBlurImage(img: Pick<VImage, 'sexual' | 'violence'> | null | undefined, mode: NsfwMode): boolean {
  if (!img) return false;
  if (mode === 'show') return false;
  const sexual = img.sexual ?? 0;
  const violence = img.violence ?? 0;
  if (mode === 'strict') return sexual > 0.4 || violence > 1.4;
  // 'blur' (default): hide clearly adult art, keep suggestive covers visible.
  return sexual > 1.25 || violence > 1.9;
}

export function nsfwReason(img: Pick<VImage, 'sexual' | 'violence'> | null | undefined, mode: NsfwMode): string | null {
  if (!shouldBlurImage(img, mode)) return null;
  const sexual = img?.sexual ?? 0;
  return sexual > 0.4 ? 'Sexual content' : 'Violent imagery';
}
