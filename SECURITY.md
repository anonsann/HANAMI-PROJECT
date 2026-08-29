# Security policy

This document describes how Sakura Odyssey handles sensitive data and how to report problems.

## Threat model

Sakura Odyssey is a zero-backend single-page application. The only cross-origin party it talks to is the official VNDB API (`https://api.vndb.org`, or a user-configured compatible endpoint). The security-relevant behaviors are:

1. **API token custody.** The token issued from <https://vndb.org/u/tokens> grants write access to your VNDB list. This app:
   - transmits it **only** as an `Authorization: Token …` header over HTTPS,
   - transmits it **only** to hosts ending in `vndb.org` — a custom API base pointing anywhere else silently drops the header,
   - stores it in `sessionStorage` by default (gone when the tab closes) and in `localStorage` only when you explicitly tick "remember me on this device",
   - never places it in URLs, query strings, caches, cookies, or `console` output,
   - clears both storage locations on **Disconnect**.
2. **Rendered third-party text.** VNDB descriptions and notes contain a bbcode-ish markup. We parse it with a purpose-built sanitizer ([`src/lib/markup.ts`](src/lib/markup.ts)) which:
   - escapes all raw HTML (never uses `dangerouslySetInnerHTML`),
   - rejects `javascript:`, `data:`, `vbscript:` and relative/unsupported URL schemes — links must be `http(s)`,
   - forces `rel="noopener noreferrer"` + `target="_blank"` on external anchors,
   - caps nesting depth so pathological input cannot blow the stack.
3. **Third-party media.** Cover art, screenshots, and character portraits are hot-linked from `t.vndb.org`/`c.vndb.org`. They are loaded as plain `<img>` (no scripts), lazy, behind the user's NSFW policy. We never re-host them.
4. **No analytics, no beacons, no service worker.** Nothing phones home. The only persistent state lives under `odyssey.*` keys in `localStorage`/`sessionStorage` and never leaves the device.
5. **Supply chain.** Dependencies are minimal (React, React Router, zustand as runtime deps), pinned through `package-lock.json`, audited in CI with `npm audit --audit-level=moderate`, and rebuilt from source on preview deployments.

## Hardening highlights

- All requests honor `AbortSignal` with a timeout; no runaway connections.
- Rate-limit responses (`429`) are respected via `Retry-After`; the client backs off rather than hammering the API.
- Potential injection sinks were systematically avoided: no `eval`, no `new Function`, no inline event handlers, no direct `innerHTML` writes anywhere in the codebase.
- The router is pinned to a non-vulnerable React Router release; see [docs/BUGS.md](docs/BUGS.md).

## Reporting a vulnerability

Please **do not** open a public issue for security problems. Instead, email a report to the maintainer address listed on the repository profile, including:

- affected route/component and steps to reproduce,
- expected vs actual behavior,
- impact assessment (token exfiltration potential, XSS, request forgery, …).

We aim to acknowledge within 72 hours, ship a fix or mitigation within 7 days for exploitable issues, and credit reporters (with permission) in the release notes.
