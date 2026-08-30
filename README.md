# Sakura Odyssey

**A visual-novel-flavored web client for [VNDB](https://vndb.org) — the Visual Novel Database — powered entirely by the official [VNDB API v2 ("Kana")](https://api.vndb.org/kana).**

Sakura Odyssey is a free and open-source (MIT) single-page application that wraps every read capability of the VNDB API — plus list editing with an API token — in an interface modelled on [vndb.org](https://vndb.org) itself: Tahoma body text, Futura headings, bordered article boxes, gold accents, and motion that can be dialed down to nothing for readers who prefer stillness.

The entire presentation layer is built from [ReactBits](https://reactbits.dev) components — see [docs/REACTBITS.md](./docs/REACTBITS.md).

Everything is client-side. No servers, no tracking, no proxy. Your API token never leaves your browser except as an `Authorization` header sent directly to `api.vndb.org`.

---

## Table of contents

1. [Feature catalog](#feature-catalog)
2. [Quick start](#quick-start)
3. [Configuration](#configuration)
4. [API tokens & list management](#api-tokens--list-management)
5. [Architecture](#architecture)
6. [Development](#development)
7. [Quality gates](#quality-gates)
8. [Deployment](#deployment)
9. [Contributing](#contributing)
10. [License & credits](#license--credits)

---

## Feature catalog

### Browse & discover (all VNDB API resources)

| Surface | Route | Highlights |
| --- | --- | --- |
| Visual novels | `/v`, `/v/:id` | Full query builder (sort, year range, rating, dev status, length, language, platform, tag include/exclude with spoiler-capped matching, "has" flags), infinite scroll or paged modes, card size toggle, URL-synced state, results counter, detail page with tags & traits accordion (spoiler-gated, direct-tag popovers), character/spoiler contrast view, staff table grouped by credit, releases with expandable language/regional matrix, media flow (screenshots + vocadb-anime links), random quotes box, statistics sheet |
| Releases | `/r`, `/r/:id` | Type/title/year/age/languages/platforms/region/resolution/trainers/voice filters; detail page splits media by edition (downloads / internet / physical), engine→VN cross-links via reverse producer lookup, per-release website links, GTIN display |
| Producers | `/p`, `/p/:id` | Developer/developer_type matrix, parent/child wikidata chains, weighted producer→VN relationships |
| Characters | `/c`, `/c/:id` | Birthday finder (wildcards supported), measurements (height/bust-waist-hip) sliders, blood type, sex with spoiler-aware `[apparent, real]` handling, trait matrix, VN role spread with seiyuu assignments |
| Staff | `/s`, `/s/:id` | Language/role filters, alias-by-gender breakdown, credit tables grouped per role, external link trawl (wikidata/anidb/pixiv/twitter/doujin) |
| Tags | `/g`, `/g/:id` | Category partition, metadata (is-meta, searchable, applicable), usage counts, representative VNs |
| Traits | `/i`, `/i/:id` | Parent/child trait trees, sexual-content flags, searchable/applicable indicators, representative characters |
| Quotes | `/quotes` | Paginated random quotes rendered as in-game dialogue boxes, VN-linked |

### Enhanced features (beyond the site)

| Feature | Route | What it adds |
| --- | --- | --- |
| Command palette | `Ctrl/Cmd+K` | Debounced cross-resource search (VN/release/character/producer/staff in parallel), keyboard-only navigation, recent-history memory |
| VN roulette | `/random` | Slot-machine spins over the whole catalogue with constraint picker (min rating/votes, year floor) and session history so re-rolls never repeat |
| Your shelf | `/list` | Full personal-list management with an API token: label tabs (excluding "Voted"), granular PATCH writes (labels/votes/dates/notes), started/finished validation, JSON+CSV export. Anonymous shelves are visible read-only — no login needed. Local-only bookmarks for guests |
| Comparison tray | `/compare` | Pin up to four VNs; radar chart of normalized stats + best-per-metric table with winner highlighting |
| Statistics workshop | `/stats` | Live API totals + a one-click dataset weave (cached 24h): release-year trend, devstatus donut, length classes, language/platform ranking, rating distributions |
| Settings | `/settings` | Theme, density, motion, original titles, page size, wide layout, spoiler tolerance, NSFW policy; API base override; rate-budget meter with live graph; cache statistics and purge |
| Home | `/` | Seasonal hero with hero art, date-aware "year-in-review" cards, top-rated / most-loved carousels, staff-pick spotlights re-queryable from the filter panel |
| 404 | `*` | Bespoke game-over scene |

### Platform features

- **Rate-limit guardian** — token-bucket request scheduling, `Retry-After` awareness, exponential backoff, and shared in-flight deduplication keep the app well inside VNDB's fair-use limits even on fast-typing users.
- **Memory cache + TTL** — per-endpoint TTLs; "count" queries cached a full day; the Settings page shows a live estimate and lets you purge.
- **URL-as-truth** — browse pages synchronize every control to the query string; deep links are shareable.
- **Accessibility** — skip-link, landmarks, ARIA on every interactive control, `prefers-reduced-motion` honored plus a manual motion kill-switch, focus-return modals, labeled form controls, WCAG-minded contrast in both themes.
- **Responsive** — mobile nav with safe-area padding, bottom-menu fallback, dual-range sliders collapse to single sliders below 1024px, grids reflow 2→6 columns by breakpoint.
- **Performance** — route-level code splitting (initial bundle ≈ 20 kB gzip app + 77 kB gzip vendor), lazy images, prefetch-on-hover/search-hover card warming, prefetch of tag/trait/popover data, IntersectionObserver visibility gating for animations.
- **Privacy** — absolutely zero analytics/telemetry; everything lives in `localStorage`/`sessionStorage` under `odyssey.*` keys.

---

## Quick start

```bash
git clone https://github.com/anonsann/vndb-client-web.git
cd vndb-client-web
npm ci
npm run dev        # http://localhost:5173
```

Production build & preview:

```bash
npm run build      # -> dist/
npm run preview
```

**Node.js ≥ 20** is required.

---

## Configuration

Runtime configuration lives in **Settings → Connection**:

- **API base** — defaults to `https://api.vndb.org/kana`. Power users can point at the `https://beta.vndb.org/api/kana` sandbox to test list writes against non-production data. Invalid hosts fall back to the default base for credential safety.
- **Rate budget** — the client self-throttles to a rolling budget and surfaces remaining headroom as a bar; no user action needed.

Build-time environment variables (see `.env.example`):

| Variable | Purpose |
| --- | --- |
| `VITE_HMR_PROTOCOL` | Set to `wss` when running behind a TLS reverse proxy (cloud sandboxes). |
| `VITE_HMR_CLIENT_PORT` | HMR websocket port override (typically `443` with `wss`). |

---

## API tokens & list management

1. Visit <https://vndb.org/u/tokens> and create a token with **`listwrite`** (writes) and **`listread`** (if your list is private).
2. Paste it into the toolbox on `/list`, choose whether to remember it.
3. Manage your shelf: labels, 0.1-step votes, started/finished dates, notes, removal.
4. Export everything to JSON or CSV in one click.

Security notes:

- The token is only ever sent as `Authorization: Token …` over HTTPS, and **only to VNDB hosts** (`api.vndb.org` by default); a custom base URL that doesn't end in `vndb.org` silently drops the header.
- "Remember me" stores the token in `localStorage`; unchecked uses `sessionStorage` and clears on tab close. `Disconnect` wipes both. See [SECURITY.md](./SECURITY.md).

---

## Architecture

```
src/
├── lib/
│   ├── vndb/            # typed API layer
│   │   ├── enums.ts     # language/platform/relation/devstatus tables (plus CJK glyph helpers)
│   │   ├── types.ts     # request/response models
│   │   ├── filters.ts   # composable filter DSL + page-state -> filter compilation
│   │   ├── fields.ts    # per-relation field manifests (list vs detail)
│   │   ├── client.ts    # fetching core: cache, dedupe, throttling, retries, auth header rules
│   │   └── resource.ts  # useApi/useGet/usePaged/useCountReact data hooks
│   ├── format.ts        # date (partial-date semantics!), rating, length, timestamp formatters
│   ├── markup.ts        # VNDB bbcode subset -> sanitized React (<script>, javascript: URLs rejected)
│   ├── spoiler.ts       # spoiler gating + image-blur policy
│   └── utils.ts         # cls, vndbid parsing, seeded RNG, chunk/unique/mapLimit…
├── store/               # zustand stores: settings (DOM-synced), auth (dual persistence), bookmarks, ulist (write queue + busy flags)
├── hooks/               # useDebouncedValue, useInterval, useCountUp, useStickyColumn, useStringParam…
├── components/          # Shell, CommandPalette, Charts (pure-SVG), Lightbox, ListPanel,
│                        # FiltersPanel, PageBits, visual + ui (ReactBits presentation layer)
├── reactbits/           # vendored ReactBits components (generated — see docs/REACTBITS.md)
├── lib/theme.ts         # Palette + usePalette() + useMotionAllowed()
├── styles/index.css     # VNDB-derived light + dark ("Angelic Serenade") token blocks
├── pages/               # 19 route modules; detail pages export named components for lazy loading
└── App.tsx / main.tsx   # createBrowserRouter + pre-render setup (theme, API base)
```

Key design decisions are documented in [docs/REPO_ANALYSIS.md](./docs/REPO_ANALYSIS.md), [docs/BUGS.md](./docs/BUGS.md) and [docs/REACTBITS.md](./docs/REACTBITS.md), including the bug-fix trail from development (machine-readable: [bugs.json](./docs/bugs.json), [bugs.csv](./docs/bugs.csv)).

### UI layer

| Concern | Where |
| --- | --- |
| Motion / text / background primitives | `components/visual.tsx` (34 exports) |
| Form + feedback primitives | `components/ui.tsx` |
| Vendored upstream ReactBits | `reactbits/` — regenerated by `npm run reactbits:sync` |
| Palette tokens (CSS vars + hex mirror) | `styles/index.css` + `lib/theme.ts` |
| Reduced-motion gating | `useMotionAllowed()` in `lib/theme.ts` |

Pages import from `components/visual.tsx` / `components/ui.tsx` only, never from
`reactbits/` directly, so the animation set stays swappable.

---

## Development

```bash
npm run dev       # Vite dev server (HMR)
npm run test      # 106 unit tests (format / markup / filters / client / store logic)
npm run lint      # ESLint, zero-warning policy in CI
npm run typecheck # tsc --noEmit, strict + noUncheckedIndexedAccess
npm run build     # production build
npm run verify    # all four, in order

npm run reactbits:sync   # re-vendor the ReactBits component set
npm run reactbits:theme  # re-tokenize vendored components + regenerate the barrel
```

Guidelines:

- **Never** render remote content without escaping — descriptions go through `lib/markup.ts`, attributes through the standard React escaping.
- Any network work must flow through `lib/vndb/client.ts` (rate limits, dedupe, typing).
- Emoji in UI copy is forbidden — use `Icon` (SVG) or the kana/kanji glyphs in `lib/vndb/enums.ts`.
- Pure SVG charts live in `components/Charts.tsx`; keep them dependency-free.
- Setting changes apply via `applySettingsToDom`, never by reaching into the DOM from pages.
- Animated components import from `components/visual.tsx` / `components/ui.tsx` and gate on `useMotionAllowed()`.
- Never hand-edit `src/reactbits/`; it is vendored and excluded from ESLint. Change `scripts/theme-reactbits.mjs` and re-run `npm run reactbits:theme`.

## Quality gates

CI (GitHub Actions) runs: `tsc --noEmit`, `eslint . --max-warnings 0`, `vitest run`, `vite build`, and `npm audit --omit=dev`. All five must pass. A ready-to-use workflow ships in [`docs/examples/ci.yml`](docs/examples/ci.yml) — copy it to `.github/workflows/ci.yml` on your fork (creating workflow files via GitHub Apps requires the `workflows` permission, so it is kept as an example here).

| Metric | Value |
| --- | --- |
| Unit tests | 71 passing |
| Lint | 0 errors / 0 warnings |
| Type check | strict, clean |
| Initial JS (gzip) | ~98 kB total (vendor 77 + app 21) |
| npm audit (prod deps) | 0 vulnerabilities |

---

## Deployment

Any static host works — the build is a pure SPA using `createBrowserRouter`, so configure **SPA fallback** (rewrite every path to `/index.html`):

- **Netlify**: `netlify.toml` with `[[redirects]] from = "/*" to = "/index.html" status = 200` (included in the repo).
- **Vercel**: framework preset *Other*, rewrite rule from `/(.*)` to `/index.html` (see `vercel.json`).
- **GitHub Pages / nginx**: serve `dist/`; rewrite all 404s to `index.html`.

`netlify.toml` and `vercel.json` ship in this repository with the correct headers (long-lived immutable caching for `/assets/*`).

## Contributing

Issues and PRs welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md). Be kind; the database is community-run and so is this client.

## License & credits

- Code: [MIT](./LICENSE).
- Data & imagery: © their respective owners, loaded straight from VNDB — **do not re-host cover art or character portraits**; they are hot-linked per VNDB's terms.
- VNDB API © Yorhel, thanks for keeping a generously open API.
- This project is unaffiliated with VNDB.
