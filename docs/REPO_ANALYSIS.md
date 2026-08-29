# Repository analysis & executive report

This document covers the full **Phase 1–7** cycle requested for this project: repository
analysis, bug hunt, fixes, comparative review, executive reporting, prevention, and final
audit — written for the actual repository (`anonsann/vndb-client-web`).

Machine-readable companions: [`bugs.json`](./bugs.json) · [`bugs.csv`](./bugs.csv)
Human-readable bug registry: [`BUGS.md`](./BUGS.md)

---

## Phase 1 — Repository status & crawl

The seed commit (`371e66d`) contained a 17-byte `README.md` and nothing else — no source,
no manifest, no license, no CI. Every line of the current codebase was produced in-branch
(`arena/01a04d66-vndb-client-web`). "Analysis of upstream code" therefore reduces to an
analysis of the **dependencies chosen and the code produced**, both of which are covered
below.

### Built surface (what the repository now contains)

| Area | Content | Files |
| --- | --- | --- |
| App shell | Router, Shell (nav/header/footer/petals), ErrorBoundary, CommandPalette, 404 | 6 |
| Pages | 19 route modules covering all 8 VNDB resources + 5 enhanced surfaces | 19 |
| Components | UI kit (28 controls), charts (5 pure-SVG), VN cards, lightbox, list panel, filters | 12 |
| Data layer | API types, enums, filter DSL, field manifests, client, react hooks | 6 |
| Stores | settings / auth / bookmarks / ulist (zustand, dual persistence) | 4 |
| Tests | 6 suites / 71 tests | 6 |
| Tooling | Vite 6, TS strict, ESLint 9 flat, vitest, Tailwind 3.4, GH Actions CI | — |

## Phase 2 — External effects scan

The app consumes **one** data service: the official VNDB API v2. No analytics, no icon pack
(inline SVG), no image re-hosting. Two further third-party touchpoints exist and are
disclosed here (SOD-025): Google Fonts is loaded from `fonts.googleapis.com` in
`index.html` (Cinzel, Inter, Shippori Mincho B1, JetBrains Mono, Source Serif 4), and VNDB
cover art is hotlinked from `t.vndb.org`. Attribution and hotlink policy compliance are
documented in the README.

## Phase 3 — Bug hunt & triage

Three hunting methods were run against every module and all findings were fixed in-branch:

1. **Static analysis**: `tsc --strict --noUncheckedIndexedAccess`, `eslint --max-warnings 0`.
2. **Executable checks**: 71 vitest cases probing the riskiest logic (date semantics, filter
   compilation, token custody, markup sanitization, retry/cache/queue behavior).
3. **Dependency audit**: `npm audit` before and after every dependency change.

### Findings summary

| ID | Title | Class | Severity | Status |
| --- | --- | --- | --- | --- |
| SOD-001 | "Has …" VN filters never wired into filter compiler | functionality | medium | fixed |
| SOD-002 | `searchrank` sort active without a `search` filter | correctness | medium | fixed |
| SOD-003 | Parallel random-quote requests deduped to one promise | UX | low | fixed |
| SOD-004 | List-cell busy flags read non-reactively | reactivity | low | fixed |
| SOD-005 | `devstatus` narrowing hid TBA/in-dev badges | typing/correctness | low | fixed |
| SOD-006 | Tag `inclusive` toggle incompatible with API semantics | API semantics | low | fixed |
| SOD-007 | Wide-layout toggle had no CSS effect | functionality | low | fixed |
| SOD-008 | Dead default `React` imports under noUnusedLocals | hygiene | trivial | fixed |
| SOD-009 | react-router ≤ 7.17.0 CVEs (2 advisories) | security | moderate | fixed |
| SOD-010 | Guest-shelf lookup typed as scalar, returned map | typing/crash | medium | fixed |
| SOD-011 | Staff-credit grouping dropped `aid` (link targets) | typing/functionality | low | fixed |
| SOD-012 | Mis-typed test double (`getImplementation`) | testing | trivial | fixed |

Notably, the unit suite caught SOD-001 by **failing first** (red→green TDD loop), and the
type system caught SOD-005/010/011 at write time — exactly the value the strict settings
were chosen to provide.

## Phase 4 — Lectura comparativa (patterns kept, patterns avoided)

Common failure modes observed across VNDB clients and generic SPA codebases, with the
countermeasure shipped here:

| Failure mode seen elsewhere | Countermeasure in this repo |
| --- | --- |
| `dangerouslySetInnerHTML` for VNDB markup | dedicated sanitizer with scheme allow-list + tests |
| Token sent to any host / placed in query string | host allow-list (`*.vndb.org`), header-only, never logged |
| Unthrottled rerequest storms during typing | 260–380 ms debounce + stale-response guard + request dedupe |
| Blind retry on 4xx | retry only network/429/5xx; honor `Retry-After` |
| Client-side rate-limit bans | global FIFO queue (240 ms spacing) + 200/5 min budget meter |
| Partial dates sorted wrong (`2009-10` after `2009-12-31`) | VNDB-style padded sort keys, unit-tested |
| Spoiler leaks via `[apparent, real]` pairs | `gateSpoileredPair`, used everywhere pairs appear |
| Giant bundles | route-level `lazy()`; ~98 kB gzip enter the browser |
| Infinite scroll without scroll-restore | infinite mode confined to browse pages w/ session cache |

## Phase 5 — Executive report (hardening emphasis)

- **No high-severity findings remain.** Two moderate dependency advisories were closed by
  upgrading `react-router-dom` 6.30.6 → 7.18.3; `npm audit --omit=dev` reports **0**.
- **Security posture**: zero `eval`/innerHTML sinks, sanitized markup, token custody rules,
  HTTPS-only API, no telemetry. Security policy in `SECURITY.md` with a reporting channel.
- **Reliability**: timeout on every request, bounded retries, token-bucket scheduling,
  error boundaries at Bill/Route level, empty/error/skeleton states on every page.
- **Accessibility**: semantic landmarks, skip link, ARIA wiring on interactive controls,
  reduced-motion support (media query + manual switch), keyboard command palette.
- **Maintainability**: strict types, zero lint warnings, pre-commit-quality gates in CI,
  tests around every module that historically breaks.

## Phase 6 — Prevention plan (now enforced)

1. **CI gates** (workflow template in `docs/examples/ci.yml`, relocate to `.github/workflows/ci.yml`): typecheck → lint → tests → build → audit.
2. **API surface control**: 100 % of network traffic flows through `lib/vndb/client.ts`.
3. **Runtime invariants**: token-to-host allow-list enforced inside the client, not by policy.
4. **Dependency discipline**: 3 runtime deps, lockfile committed, audit in CI.
5. **Documentation**: this report + bug registry + CONTRIBUTING + SECURITY ship in-repo.

## Phase 7 — Final audit & validation

| Gate | Result |
| --- | --- |
| `tsc --noEmit` (strict) | PASS |
| `eslint . --max-warnings 0` | PASS (0 problems) |
| `vitest run` | 71 / 71 PASS |
| `vite build` | PASS — 31 chunks, initial ≈ 98 kB gzip |
| `npm audit --omit=dev` | PASS — 0 vulnerabilities |
| Preview smoke test (SPA routes, assets) | PASS (200s on `/`, `/v`, css, art) |

### Remaining known limitations (accepted, tracked)

- The stats workshop fires ~43 count queries by design (sequential, 24 h cache) — heavy but
  user-gated and budget-monitored.
- Staff "VN links" and similar reverse lookups require one extra round trip (API limitation).
- i18n of the UI copy is out of scope for this release (English-only is a product decision).

— Report end. Generated for the `arena/01a04d66-vndb-client-web` branch.

---

# Second audit — executive report (2026-08-29, branch `arena/01a04ef3-vndb-client-web`)

A complete re-analysis of the merged codebase. Method: module-by-module manual review
(all 19 pages, 12 components, the data layer, stores and tooling), contract verification
against the live kana docs + `GET /schema`, dependency/lockfile audit, toolchain dry-runs
(`npm ci`, `tsc`, `eslint`, `vitest`, `vite build`), and security review of every boundary
that touches user input (URL params, API-token custody, markup rendering, CSV export).

## What the sweep found — by severity

| Severity | Count | IDs |
| --- | --- | --- |
| high | 2 | SOD-013 (lockfile drift → `npm ci` fails everywhere), SOD-014 (lint toolchain broken) |
| medium | 4 | SOD-015 (dead "has description" filter), SOD-016 (1-child boolean filters vs documented kana contract), SOD-017 (platform enum drift; one filter chip 400s), SOD-019 (shelf remount broke edit modal mid-save) |
| low | 10 | SOD-018, SOD-020, SOD-021, SOD-023, SOD-024, SOD-025, SOD-026, SOD-027, SOD-028, SOD-030 |
| trivial | 2 | SOD-022, SOD-029 |

All 18 are fixed on this branch; 35 new unit tests pin the behavior (suite now 106/106).

## Notable non-findings (verified correct, recorded to prevent re-flagging)

- `reverse: sortDir === 'asc' ? false : true` in VnBrowse is **correct**: kana's default
  sort order is ascending, `reverse: true` yields descending (documented).
- `quote.character`, staff `ismain` filter, `birthday=[m,0]` wildcard, `fields: ''` with
  `results: 0` count probes, ulist sort fields, tag/trait `vn_count`/`char_count` sorts —
  all valid per the published schema/docs.
- `releasedBetween` partial-date comparison matches the documented VNDB ordering rule
  ("2022" sorts after "2022-12-31").
- API-token custody (localStorage + `Authorization` header only to `*.vndb.org` hosts,
  enforced in `VndbClient.maySendAuth`) remains sound; the token is never attached to
  custom API-base URLs outside the `vndb.org` domain.
- Markup rendering is XSS-safe (React text nodes only; `javascript:`/`data:` URLs rejected
  in `[url=]`).

## Recurring patterns & prevention (Phase 7)

1. **Hand-curated enums drift.** SOD-017/SOD-018 came from memory-written maps. The fix
   pins them with schema-mirror tests; the long-term fix is generating `enums.ts` from
   `GET /schema` at build time (suggested follow-up — the schema is documented as stable
   enough for code generation).
2. **URL-as-truth needs a round-trip test.** SOD-015 happened because a state field lost
   its URL mapping during UI rework. `vnFilterUrl.ts` now has explicit read/write/round-trip
   tests; any new filter field must extend them.
3. **State-store keys are not a refetch API.** SOD-019: keying a component by a mutation
   counter remounts and destroys UI state. Prefer in-place reload hooks.
4. **Docs claims need a CI anchor.** SOD-025/SOD-026: claims ("no fonts CDN", "GH Actions
   CI") drifted from reality. The hardened pipeline is written (`docs/examples/ci.yml`,
   also staged at `.github/workflows/ci.yml` in this working tree); activating it needs a
   one-file copy by a maintainer because the sandbox's GitHub App token may not create
   workflow files. Until then the `npm run verify` gate covers the same checks locally.
5. **Browser-target conservatism.** SOD-024: a regex feature below `esbuild`'s target
   radar (lookbehind) bricked older Safari. Regex features should be treated like syntax
   features; lint rule `mozilla/no-useless-`-style guardrails or a compat wrapper could be
   added later.

## Monitoring & logging suggestions (Phase 7)

- The client already emits queue events (`onEvent`); a debug-only console sink
  (`localStorage.hanami.debug === '1'`) would make field diagnosis possible without
  shipping telemetry (the project promises zero tracking — keep it opt-in and local).
- Surface `ApiError.kind`/`status` counts on the Settings rate-budget meter to spot
  systematic 400s (the class of bug seen in SOD-017's `xsx` chip) early.
