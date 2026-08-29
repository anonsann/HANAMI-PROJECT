# Bug registry — Sakura Odyssey

All findings are triaged with an ID (`SOD-###`), a hunting-method tag, a severity, and a
fix status. Every entry links the root cause and the shipped countermeasure so future
contributors can pattern-match similar risks. Machine-readable: [`bugs.json`](./bugs.json),
[`bugs.csv`](./bugs.csv).

Severity legend: **critical** (security/data loss) > **high** (broken core flow) >
**medium** (degraded feature) > **low** (cosmetic/edge) > **trivial** (hygiene).

---

## SOD-001 — "Has …" filters silently ignored (medium) — FIXED

- **Found by:** unit test (`filters.test.ts`, red→green).
- **Symptom:** Toggling *Has anime / Has screenshots / Has description / Has review* in the
  advanced panel produced identical result sets.
- **Root cause:** `buildVnFilter` compiled every constraint except the four boolean flags;
  the fields existed in `VNFilterState`, so the UI gave no hint anything was off.
- **Fix:** map each flag to its API predicate (`['has_anime','=',1']`, …) in
  `lib/vndb/filters.ts`; regression test asserts the compiled JSON contains the predicates.
- **Prevention:** every `FilterState` field must appear in the compiler test matrix.

## SOD-002 — `searchrank` sort without a query (medium) — FIXED

- **Found by:** code review against API docs ("relevance relies on present 'search' filter").
- **Symptom:** browsing with sort=relevance and an empty search produced odd ordering.
- **Root cause:** sort key passed unconditionally.
- **Fix:** browse pages degrade `searchrank → rating` when the query is blank; Cmd+K already
  required a query.
- **Prevention:** doc note in `filters.ts` next to the sort whitelist.

## SOD-003 — Random quotes collapsed into one request (low) — FIXED

- **Found by:** code review of the in-flight dedupe design.
- **Symptom:** asking for N random quotes fired N requests with identical payloads; the
  deduper merged them and N duplicates of the *same* quote appeared.
- **Root cause:** identical request keys are intentionally merged (good for prefetch).
- **Fix:** single request with an `or`-chain of N `['random','=',1]` predicates — one query,
  N distinct server-chosen rows.

## SOD-004 — Busy flags in list cells weren't reactive (low) — FIXED

- **Found by:** code review of `MyListPage`.
- **Symptom:** spinners on edit/remove buttons sometimes never appeared or never stopped.
- **Root cause:** `useUlist.getState().busy[id]` read during render is not a subscription.
- **Fix:** the Shelf subscribes to the `busy` map and passes the relevant flag through props.

## SOD-005 — devstatus badges unreachable (low) — FIXED

- **Found by:** `tsc` (`1|2 !== 0` no-overlap).
- **Symptom:** "In development / TBA" badges would never render even if data said so.
- **Fix:** explicit `vn.devstatus !== undefined && vn.devstatus !== 0` guard.

## SOD-006 — Tag `inclusive` toggle offered invalid semantics (low) — FIXED

- **Found by:** API semantics review.
- **Symptom:** an "ANY/ALL include" switch promised per-tag matching the API doesn't support
  (id inclusion is AND; thread/tag union exists only in filter presets).
- **Fix:** removed the toggle; includes are AND to match `api.vndb.org` behavior.

## SOD-007 — Wide-layout toggle did nothing (low) — FIXED

- **Found by:** UI review.
- **Root cause:** CSS rules for `html[data-wide='true']` were never written.
- **Fix:** `index.css` overrides for `.max-w-*` utilities + Shell applies the attribute.

## SOD-008 — Dead default `React` imports (trivial) — FIXED

- **Found by:** `noUnusedLocals` sweep across 17 modules.
- **Fix:** removed; kept named hook imports only.

## SOD-009 — react-router advisories (moderate) — FIXED

- **Found by:** `npm audit`.
- **Advisories:** GHSA-wrjc-x8rr-h8h6 (open redirect via backslash), GHSA-337j-9hxr-rhxg
  (SSR deserialization — not applicable to this SPA, but the range still flagged 6.30.6).
- **Fix:** upgraded `react-router-dom` 6.30.6 → **7.18.3**; re-ran typecheck/tests/build.

## SOD-010 — Guest shelf lookup mis-typed (medium) — FIXED

- **Found by:** `tsc` after forcing the correct response shape.
- **Symptom:** looking up an arbitrary username could crash (`info.data[name]` on a value
  typed as a single user object).
- **Fix:** `useGet<Record<string, UserInfo | null>>` to match `GET /user`.

## SOD-011 — Staff grouping dropped `aid` (low) — FIXED

- **Found by:** `tsc` (`Property 'aid' does not exist…`).
- **Symptom:** credit rows in Staff/VN detail pages could not link to the aliased staff id.
- **Fix:** typed the group map as `VnStaffEntry[]` end-to-end.

## SOD-012 — Broken test double (trivial) — FIXED

- **Found by:** vitest.
- **Fix:** replaced the nonexistent `getImplementation()` mock API with an explicit default.

---

## Post-fix audit snapshot

| Check | Result |
| --- | --- |
| `tsc --noEmit` | clean (strict + noUncheckedIndexedAccess) |
| `eslint . --max-warnings 0` | clean |
| `vitest run` | 71 / 71 passing |
| `vite build` | clean — 31 chunks |
| `npm audit --omit=dev` | 0 vulnerabilities |

*Registry closed for this release. New findings must open a new `SOD-###` row here, in
`bugs.json`, and in `bugs.csv` before the fix is merged.*

---

# Second audit pass — 2026-08-29 (this branch)

A fresh full-repository sweep, re-validated line-by-line against the live kana documentation
(<https://api.vndb.org/kana>) and schema (<https://api.vndb.org/kana/schema>). All findings
below are fixed on `arena/01a04ef3-vndb-client-web` with unit coverage unless marked
otherwise. Machine-readable companions: [`bugs.json`](./bugs.json), [`bugs.csv`](./bugs.csv).

## SOD-013 — Lockfile drift broke `npm ci` everywhere (high) — FIXED

- **Found by:** `npm ci` (EUSAGE) on a clean checkout.
- **Symptom:** clean installs aborted — the lockfile pinned `@vitejs/plugin-react@4.7.0`,
  `typescript@5.6.3`, `zustand@5.x`, … which no longer satisfied `package.json`. README
  quick start, Netlify/Vercel builds and the CI example were all broken.
- **Root cause:** dependencies were bumped in `package.json` without running `npm install`.
- **Fix:** lockfile regenerated; `npm ci` exits 0. CI (SOD-026) runs `npm ci` as a drift guard.
- **Prevention:** CI always installs with `npm ci`, never `npm install`.

## SOD-014 — `npm run lint` crashed on undeclared ESLint deps (high) — FIXED

- **Found by:** `npm run verify`.
- **Symptom:** `ERR_MODULE_NOT_FOUND: typescript-eslint`; the lint gate (and therefore
  `verify` and CI) could not run at all.
- **Root cause:** `eslint.config.js` imports `typescript-eslint` and
  `eslint-plugin-react-refresh` — neither was in `package.json`; `@eslint/js` was imported
  directly but only present transitively; `@typescript-eslint/eslint-plugin|parser` were
  declared but unused.
- **Fix:** devDeps added (`typescript-eslint@^8.57`, `eslint-plugin-react-refresh@^0.5.5`,
  `@eslint/js@^9.17`), unused `@typescript-eslint/*` removed. `eslint . --max-warnings 0` clean.

## SOD-015 — "Has description" filter was dead state (medium) — FIXED

- **Found by:** code review against SOD-001's prevention rule ("every `FilterState` field
  must appear in the compiler test matrix").
- **Symptom:** `hasDescription` existed in the state type and in `buildVnFilter`, but the
  URL sync never read or wrote it and the panel had no toggle — unreachable dead code.
- **Fix:** URL (de)serialization extracted to `lib/vndb/vnFilterUrl.ts` (`desc=1` both
  directions) and the *Description* toggle restored; round-trip tests.

## SOD-016 — Single-child boolean filters could reach the API (medium) — FIXED

- **Found by:** docs review — kana defines `and`/`or` as *"followed by two or more other
  predicates"*.
- **Symptom:** the roulette with all dials cleared posted `["and",["id",">=",…]]` (one
  child); `F.and(pred)` / `F.or(pred)` with one argument — e.g. a single language or trait
  chip — produced the same shape anywhere downstream code did not unwrap it.
- **Fix:** `normalizeBooleanGroups()` (single-child unwrap, empty-group drop, recursive) is
  applied at `F.and`/`F.or` construction, inside `andAll`, and defensively in
  `VndbClient.query`. The rewrites are semantically neutral, so this is safe regardless of
  server tolerance. Unit-tested.

## SOD-017 — Platform enum drift vs live schema (medium) — FIXED

- **Found by:** diff against `GET /schema` (2026-08).
- **Symptom:** the app mapped codes the API does not use (`snes`, `dc`, `3ds`, `xsx`) and
  missed live ones (`ps1`, `sfc`, `drc`, `n3d`, `xxs`, `wiu`, `sw2`, `tdo`, `msx`, `smd`,
  `scd`, `pcf`, `p88`, `fm7`, `fm8`, `x1s`, `xb1`). Badges degraded to raw codes; the
  Releases "Xbox Series X/S" chip posted `platform=xsx`, which the API rejects.
- **Fix:** `PLATFORMS` rewritten from the live 47-code enum; tests lock every live code to a
  label and assert the dead codes are gone.

## SOD-018 — Media enum drift (low) — FIXED

- Same method as SOD-017: `mro` is not in the live enum; `mrt`/`cas`/`dc`/`mem` were
  missing. `MEDIA_TYPES` aligned and tested.

## SOD-019 — Shelf remount closed the edit modal mid-save (medium) — FIXED

- **Found by:** code review of `MyListPage` + `useUlist`.
- **Symptom:** saving labels+vote+dates+notes closed the modal after the first successful
  PATCH (the rest still applied, silently); sort/page/label/search reset on every write.
- **Root cause:** `<Shelf key={`${user.id}:${refreshTick}`}>` remounted the whole subtree
  on every `bump()` — and `guard()` bumps once per sub-write.
- **Fix:** remount removed; the Shelf subscribes to `refreshTick` and calls `useApi.reload()`
  in place. State survives; the modal stays open until the save completes.

## SOD-020 — Tag/relation chips triggered full page reloads (low) — FIXED

- `TagList` and `RelationChips` emitted raw `<a href="/g/…">`; replaced with react-router
  `<Link>` so navigation stays client-side.

## SOD-021 — `searchrank` sorted ascending in six surfaces (low) — FIXED

- **Found by:** docs review — *reverse: set to true to sort in descending order* implies an
  ascending default, and the codebase was split (releases page `reverse:true`, palette,
  characters, producers, staff, tags, traits `reverse:false`). At most one could be right.
- **Fix:** relevance sorts now consistently request descending (`reverse:true`); the `/v`
  `sort` URL param is coerced through `SORT_PARAM_WHITELIST` so junk deep links fall back to
  the default sort instead of a 400 error state.

## SOD-022 — Dead ternary in HomePage memo (trivial) — FIXED

- `unique(...).length === out.length ? out : out` simplified; unused import dropped.

## SOD-023 — CSV formula injection in shelf export (low) — FIXED

- **Symptom:** `csvCell` quoted delimiters but a cell beginning with `= + - @` or a tab was
  written verbatim — OWASP CSV-injection territory when the export is opened in a
  spreadsheet app.
- **Fix:** `csvCell` moved to `lib/utils.ts`, hardening added (leading `'` prefix); tests.

## SOD-024 — Regex lookbehind could crash the whole bundle on older browsers (low) — FIXED

- **Symptom:** `renderTextWithEmphasis` used `(?<![\w/])` — regex lookbehind is a
  *parse-time* SyntaxError on Safari < 16.4 / Firefox < 78, far below the es2020 build
  target: one white screen, no app at all.
- **Fix:** hand-rolled scanner with the same matching rules; emphasis tests added.

## SOD-025 — Docs vs reality: fonts CDN (low) — FIXED

- `docs/REPO_ANALYSIS.md` claimed "no fonts CDN (fonts are stack-native)" while
  `index.html` loads Google Fonts. Phase 2 of the analysis now discloses both third-party
  touchpoints (fonts CDN and `t.vndb.org` art hotlinking).

## SOD-026 — CI was an example, not a pipeline (low) — FIXED (needs one manual step to enable)

- The hardened workflow lives in [`docs/examples/ci.yml`](./examples/ci.yml) and is also
  staged ready-to-commit at `.github/workflows/ci.yml` in this working tree. Pushing
  workflow files from this sandbox is refused (the GitHub App token lacks the `workflows`
  scope), so enabling CI is a one-liner for a maintainer:
  `mkdir -p .github/workflows && cp docs/examples/ci.yml .github/workflows/ci.yml`.
  The pipeline runs the documented gates (`npm ci` → `tsc` → `eslint --max-warnings 0` →
  `vitest` → `vite build` → `npm audit --omit=dev`).

## SOD-027 — Birthday day-input silently ignored without a month (low) — FIXED

- The characters page let users type a day with no month; `buildCharacterFilter` drops the
  value. The day field is now disabled until a month is selected.

## SOD-028 — Failed re-login wiped an active session (low) — FIXED

- `auth.login` failure called `vndb.setToken(null)` even when a valid user was signed in
  (silent deauth + store/client mismatch), and a successful identity switch kept the
  previous account's cached reads. The previous token is now restored on failure and the
  cache is cleared on success.

## SOD-029 — Circular sign-in pointers (trivial) — FIXED

- ListPanel pointed guests at `/settings`, which points back to `/list`. ListPanel now
  links to `/list`, the actual sign-in surface.

## SOD-030 — Impossible dates rendered "undefined" (low) — FIXED

- `parseVndbDate` accepted `2022-13-05` / `2022-02-31` (shape-only regex); month/day ranges
  are now calendar-validated (leap-aware) and invalid input degrades to `Unknown`.

---

## Post-fix audit snapshot (second pass)

| Check | Result |
| --- | --- |
| `npm ci` | exits 0 (SOD-013) |
| `tsc --noEmit` | clean (strict) |
| `eslint . --max-warnings 0` | clean (SOD-014) |
| `vitest run` | 106 / 106 passing (71 original + 35 new) |
| `vite build` | clean |
| `npm audit --omit=dev` | 0 vulnerabilities |

*Verification of API contracts in this pass used the published kana documentation and
`GET /schema` (2026-08-29). Live POST probes are not possible from the audit sandbox
(egress to api.vndb.org is TLS-filtered); every behavioral claim above cites the
documentation it was checked against.*
