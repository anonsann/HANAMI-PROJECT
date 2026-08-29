import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeChoice = 'dark' | 'light';
export type MotionChoice = 'full' | 'reduce';
export type NsfwChoice = 'strict' | 'blur' | 'show';
export type DensityChoice = 'cozy' | 'compact';

interface SettingsState {
  theme: ThemeChoice;
  motion: MotionChoice;
  /** 0 = hide spoilers, 1 = minor, 2 = show all */
  spoilerMax: 0 | 1 | 2;
  nsfw: NsfwChoice;
  pageSize: number;
  density: DensityChoice;
  /** Prefer romanized main titles (VNDB default) vs original-script titles. */
  showOriginalTitles: boolean;
  apiBase: string;
  /** Max width of content column */
  wide: boolean;

  setTheme: (t: ThemeChoice) => void;
  setMotion: (m: MotionChoice) => void;
  setSpoilerMax: (s: 0 | 1 | 2) => void;
  setNsfw: (n: NsfwChoice) => void;
  setPageSize: (n: number) => void;
  setDensity: (d: DensityChoice) => void;
  setShowOriginalTitles: (v: boolean) => void;
  setApiBase: (u: string) => void;
  setWide: (v: boolean) => void;
}

export const DEFAULT_API_BASE = 'https://api.vndb.org/kana';

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      motion: 'full',
      spoilerMax: 0,
      nsfw: 'blur',
      pageSize: 24,
      density: 'cozy',
      showOriginalTitles: false,
      apiBase: DEFAULT_API_BASE,
      wide: false,

      setTheme: (theme) => set({ theme }),
      setMotion: (motion) => set({ motion }),
      setSpoilerMax: (spoilerMax) => set({ spoilerMax }),
      setNsfw: (nsfw) => set({ nsfw }),
      setPageSize: (pageSize) => set({ pageSize: Math.max(6, Math.min(100, Math.floor(pageSize) || 24)) }),
      setDensity: (density) => set({ density }),
      setShowOriginalTitles: (showOriginalTitles) => set({ showOriginalTitles }),
      setApiBase: (apiBase) => set({ apiBase }),
      setWide: (wide) => set({ wide })
    }),
    { name: 'hanami.v1.settings', version: 1 }
  )
);

/** Applies the settings to <html> — call once at boot and on changes. */
export function applySettingsToDom(s: Pick<SettingsState, 'theme' | 'motion'>): void {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  html.dataset.theme = s.theme;
  html.classList.toggle('dark', s.theme === 'dark');
  // Respect the OS preference; the in-app toggle can force reduction too.
  const prefersReduced =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  html.dataset.motion = s.motion === 'reduce' || prefersReduced ? 'reduce' : 'full';
}

/** Also syncs the wide-layout flag (applied through CSS overrides). */
export function applyWideToDom(wide: boolean): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.wide = String(wide);
}
