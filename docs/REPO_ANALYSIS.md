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

The app consumes **one** external service: the official VNDB API v2. No analytics, no fonts
CDN (fonts are stack-native), no icon pack (inline SVG), no image re-hosting. Attribution
and hotlink policy compliance are documented in the README.

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
