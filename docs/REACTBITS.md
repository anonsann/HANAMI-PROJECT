# ReactBits layer

Every pixel this app paints comes from [ReactBits](https://reactbits.dev). The
presentation layer is a thin, VNDB-flavoured wrapper around vendored upstream
components so that:

1. pages never import ReactBits directly (one import to swap, everything follows),
2. upstream code stays verbatim and re-vendorable,
3. the whole set collapses to plain markup when the user asks for reduced motion.

## Layout

```
scripts/vendor-reactbits.mjs   # pulls src/ts-tailwind/<Category>/<Name>/<Name>.tsx from DavidHDev/react-bits
scripts/theme-reactbits.mjs    # re-tokenizes vendored files onto this project's CSS variables + writes the barrel
src/reactbits/                 # 107 vendored components + manifest.json + generated index.ts  (generated, do not hand-edit)
src/components/visual.tsx      # text/background/motion primitives (PageTitle, Marquee, Reveal, TiltCard, …)
src/components/ui.tsx          # form + feedback primitives (Card, Tabs, Modal, Pager, Toaster, …)
src/lib/theme.ts               # Palette + usePalette() + useMotionAllowed()
```

## Regenerating

```bash
npm run reactbits:sync     # re-download the component set into src/reactbits/
npm run reactbits:theme    # re-apply the palette re-tokenizing pass + regenerate the barrel
```

`reactbits:sync` is intentionally destructive inside `src/reactbits/`: it is the
only directory it touches, and `manifest.json` records the upstream commit so the
vendored tree can be diffed against upstream later.

`reactbits:theme` is **idempotent** — an entry is skipped when its replacement is
already present, so it is safe to re-run after hand-editing a vendored file.

## What the theme pass changes

A regex map (ordered, guarded with `(?<![\w-])…(?![\w-])`) rewrites upstream's
hardcoded dark-neon palette onto semantic Tailwind tokens:

| upstream | becomes |
| --- | --- |
| `bg-black`, `bg-neutral-950`, `bg-neutral-900`, `bg-[#120F17]`, `bg-[#0b0d12]`, … | `bg-canvas` / `bg-panel` |
| `bg-white`, `bg-neutral-800`, `bg-[#222]` | `bg-panel` / `bg-panel2` |
| `border-neutral-{700,800}`, `border-white`, `border-black` | `border-line` |
| `text-white`, `text-black`, `text-neutral-{50…200}` | `text-ink` |
| `text-neutral-{300,400,500,600}` | `text-mute` |
| `placeholder-white`, `placeholder-neutral-{400,500}` | `placeholder-faint` |
| `ring-white`, `outline-white`, `bg-[#00ffff]` | brand-tinted |

Opacity modifiers survive the rewrite (`bg-black/60` → `bg-canvas/60`).

A handful of components need structural `FIXUPS` beyond colour (missing
`return`s, `private DOM:` in classes, unused locals). Those live at the top of
`scripts/theme-reactbits.mjs` and throw loudly if upstream drifts out from under
them.

## House rules

- **`src/reactbits/` is vendored** — it is excluded from ESLint and must never be
  hand-edited; change the theme script instead.
- **Import from `visual.tsx` / `ui.tsx`**, not from `src/reactbits`.
- **Gate on `useMotionAllowed()`.** Every animated wrapper returns plain children
  when motion is reduced; `prefers-reduced-motion` is honoured even when the
  in-app setting is `full`.
- **`ogl` stays async.** The WebGL backdrops (`Aurora`, `Iridescence`,
  `Particles`, `Waves`) are `React.lazy`, so the ~48 kB `ogl` chunk never blocks
  first paint. The DOM-only `DotGrid` variant is the default shell background.
- **No upstream component owns a `<Link>`/`<a>` where the router needs one** —
  `FlowingMenu`, `TiltedCard`, `ScrollStack` and `StaggeredMenu` are documented
  traps; see the notes in `visual.tsx`/`Shell.tsx` where they were worked around.

## Reduced motion

`useMotionAllowed()` is `false` when `settings.motion === 'reduce'` **or** when
the OS reports `prefers-reduced-motion`. At that point:

- `AmbientBackground` renders `null`,
- `Reveal` / `SlideIn` / `TiltCard` / `Glare` / `Magnetize` pass children through,
- `Marquee`, `LoopRibbon`, `Scramble`, `Typewriter` render static text,
- `Tabs`, `Toggle` and `DualRangeSlider` jump instead of springing.
