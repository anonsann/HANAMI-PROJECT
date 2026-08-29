# Contributing to Sakura Odyssey

Thanks for considering a contribution! This project values curiosity, kindness, and respect for the VNDB community whose data it renders.

## Ground rules

1. **Be excellent in the issues.** Assume good faith; keep discussions technical and inclusive.
2. **No telemetry.** Any new network traffic must go exclusively through `src/lib/vndb/client.ts` and only to VNDB-compatible endpoints.
3. **No new runtime dependencies without a discussion.** Open an issue first if you think a library is essential. Dev-time tooling (linters, test runners) is lighter-weight, but still worth a note.
4. **No emoji in UI copy.** Use the `Icon` component (inline SVG) or the language/kanji glyphs in `src/lib/vndb/enums.ts`.
5. **Respect VNDB's terms.** Don't bundle cover art, don't bypass the image hotlink policy, and keep spoiler/NSFW gates intact and default-strict.

## Development workflow

```bash
npm ci
npm run dev       # start hacking
npm run test      # must stay green
npm run lint      # zero warnings allowed
npm run typecheck
npm run build
```

Branch from `main`, name things descriptively (`feat/trait-graph`, `fix/quote-pagination`), and open a PR against `main`. Every PR runs the full gate (typecheck, lint, tests, build, audit) in CI.

### Commit style

Use clear, imperative messages: `fix: stop leaking token header on custom API hosts`, `feat: birthday picker for character search`. Squash-merge will fold the branch.

### Missing pieces & good first issues

- Keyboard shortcuts overlay (help modal listing all bindings).
- Drag-and-drop reorder of the comparison tray.
- More locales for the UI copy (i18n framework is not in place yet — talk to us first).

## Code of conduct

Be kind. Be patient. Fans of visual novels skew every which way across age, gender, language, and ability — build for all of them, and argue with the code, not the person.
