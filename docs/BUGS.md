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
