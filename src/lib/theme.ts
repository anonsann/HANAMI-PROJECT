import { useSettings } from '../store/settings';

/**
 * Concrete hex values for the two VNDB-derived palettes in `styles/index.css`.
 *
 * Most ReactBits components take colours as *props* (`glowColor`, `spotlightColor`,
 * `accentColor`, particle `colors`, …) rather than Tailwind classes, so the same
 * tokens need to exist as plain hex strings. Keep these in sync with the CSS
 * variables — they mirror `html[data-theme]` in `src/styles/index.css`.
 */
export interface Palette {
  canvas: string;
  panel: string;
  panel2: string;
  ink: string;
  mute: string;
  faint: string;
  line: string;
  brand: string;
  brand2: string;
  gold: string;
  sky: string;
  good: string;
  warn: string;
  bad: string;
  /** `r, g, b` triplet form used by components that want an alpha blend. */
  brandRgb: string;
  isDark: boolean;
}

/** VNDB default (light) skin. */
export const LIGHT_PALETTE: Palette = {
  canvas: '#f5f7fa',
  panel: '#ffffff',
  panel2: '#eef1f6',
  ink: '#222222',
  mute: '#5a6472',
  faint: '#7a8594',
  line: '#cbd5e0',
  brand: '#1a5db4',
  brand2: '#33517a',
  gold: '#b5761a',
  sky: '#3884c8',
  good: '#15803d',
  warn: '#b07a14',
  bad: '#c42a2a',
  brandRgb: '26, 93, 180',
  isDark: false
};

/** VNDB "Angelic Serenade (dark blue)" skin. */
export const DARK_PALETTE: Palette = {
  canvas: '#08121e',
  panel: '#071c30',
  panel2: '#0d2741',
  ink: '#dddddd',
  mute: '#889eb4',
  faint: '#607a94',
  line: '#225588',
  brand: '#7bb8dd',
  brand2: '#5a9fd4',
  gold: '#e4aa44',
  sky: '#7bb8dd',
  good: '#34c77b',
  warn: '#e4aa44',
  bad: '#e44444',
  brandRgb: '123, 184, 221',
  isDark: true
};

/** Palette matching the user's active theme. */
export function usePalette(): Palette {
  const theme = useSettings((s) => s.theme);
  return theme === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;
}

/**
 * True when heavy animation should be skipped — either the OS asks for reduced
 * motion or the user picked "reduce" in Tuning.
 */
export function useMotionAllowed(): boolean {
  const motion = useSettings((s) => s.motion);
  const prefersReduced =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return motion !== 'reduce' && !prefersReduced;
}
