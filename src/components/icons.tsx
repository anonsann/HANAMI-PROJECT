/**
 * Minimal stroke icon set (inline SVG, currentColor).
 */
import type { SVGProps } from 'react';

const paths: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4.35-4.35',
  book: 'M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22.5z M4 19.5V4.5 M20 18H7',
  person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
  disc: 'M4 6h16M4 12h16M4 18h10',
  building: 'M4 21h16M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M10 7h1m2 0h1m-4 3h1m2 0h1m-4 3h1m2 0h1m-5 7h3',
  pen: 'M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z',
  tag: 'M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.24H4a1 1 0 0 0-1 1v5.59a2 2 0 0 0 .59 1.41l9.58 9.59a2 2 0 0 0 2.83 0l4.59-4.59a2 2 0 0 0 0-2.83ZM7.5 7.5h.01',
  sparkle: 'M12 2l1.9 5.8L20 9.7l-6.1 1.9L12 17.4l-1.9-5.8L4 9.7l6.1-1.9zM19 15l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z',
  quote: 'M10 11v5a4 4 0 0 1-4 4v-2a2 2 0 0 0 2-2h-3a1 1 0 0 1-1-1v-4a2 2 0 0 1 2-2h3a1 1 0 0 1 1 1Zm10 0v5a4 4 0 0 1-4 4v-2a2 2 0 0 0 2-2h-3a1 1 0 0 1-1-1v-4a2 2 0 0 1 2-2h3a1 1 0 0 1 1 1Z',
  dice: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm3.5 5.5h.01m7 0h.01m-7 7h.01m7 0h.01M12 12h.01',
  scale: 'M12 3v18M5 7l-3 7a3.5 3.5 0 0 0 6 0zm14 0-3 7a3.5 3.5 0 0 0 6 0zM7 21h10M7 5h10',
  chart: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
  list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  cog: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-5L9.1 5.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.5 7.5 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2 1.2L9.5 21h5l.4-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.07-.4.1-.8.1-1.2Z',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-9v5m0-9h.01',
  bookmark: 'M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z',
  star: 'm12 2 2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 16.9 5.9 20.4l1.5-6.8L2.2 9l6.9-.7z',
  filter: 'M4 5h16l-6 7v5l-4 2v-7z',
  grid: 'M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z',
  rows: 'M4 5h16v4H4zm0 5h16v4H4zm0 5h16v4H4z',
  external: 'M14 4h6v6m0-6L10 14M8 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3',
  chevronDown: 'm6 9 6 6 6-6',
  chevronUp: 'm18 15-6-6-6 6',
  chevronLeft: 'm15 18-6-6 6-6',
  chevronRight: 'm9 18 6-6-6-6',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-15v2m0 16v2M4.2 4.2l1.4 1.4m12.8 12.8 1.4 1.4M2 12h2m16 0h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z',
  x: 'M18 6 6 18M6 6l12 12',
  plus: 'M12 5v14M5 12h14',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  eyeOff: 'M4 4l16 16M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a17.8 17.8 0 0 1-2.2 3.1M6.6 6.6C3.7 8.3 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.3-1M9.9 9.9a3 3 0 0 0 4.2 4.2',
  key: 'M17 11a4 4 0 1 0-3.9 3L11 16v2h-2v2H5v-3l4.4-4.4A4 4 0 0 1 17 11Zm-1-2.5h.01',
  download: 'M12 3v12m0 0 4-4m-4 4-4-4M4 21h16',
  trash: 'M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m3 0-1 13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1L6 7m4 4v6m4-6v6',
  check: 'm5 13 4 4L19 7',
  warn: 'M12 9v4m0 4h.01M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20.3h15.4a2 2 0 0 0 1.7-3.1L13.7 3.9a2 2 0 0 0-3.4 0Z',
  globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm-10-10h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-14v6l4 2',
  calendar: 'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 5h16M8 3v4m8-4v4',
  heart: 'M12 21s-8-4.7-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.3-8 11-8 11Z',
  history: 'M3 3v6h6M3.5 13a9 9 0 1 0 .6-5.4L3 9m9-4v6l4 2',
  image: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm4 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm11 6-4.5-4.5L9 18',
  play: 'M6 4.5v15l13-7.5z',
  pause: 'M7 4h3v16H7zm7 0h3v16h-3z',
  arrowLeft: 'M19 12H5m0 0 6-6m-6 6 6 6',
  arrowRight: 'M5 12h14m0 0-6-6m6 6-6 6',
  layers: 'm12 2 9 5-9 5-9-5zm-9 10 9 5 9-5m-18 5 9 5 9-5',
  refresh: 'M20 11A8 8 0 0 0 5.6 6.6L4 8m0-5v5h5m11 2a8 8 0 0 1-14.6 4.4L4 16m0 5v-5h5',
  gift: 'M20 12v9H4v-9m8-2v11m0-11H5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h7m0 5h7a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-7m0 5V6m0 0S10.5 6 9 5a2 2 0 1 1 3-.5c.6 1 .6 1 0 1.5Zm0 0s1.5 0 3-1a2 2 0 1 0-3-.5',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3m-11 0h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Zm7 4v2'
};

export type IconName = keyof typeof paths;

export function Icon({
  name,
  size = 18,
  strokeWidth = 1.8,
  className,
  ...rest
}: SVGProps<SVGSVGElement> & { name: IconName; size?: number; strokeWidth?: number }) {
  const d = paths[name];
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <path d={d} />
    </svg>
  );
}
