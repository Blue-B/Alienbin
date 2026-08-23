# Security Design

This document covers each threat the v2 design considers, in
**Threat / Impact / Mitigation / Remaining risk** form. Everything here maps to real code —
file references point into `src/worker/` unless noted.

## 1. TTL policy interference

- **Threat**: One paste's expiration choice changes another paste's lifetime (the v1 CVE).
- **Impact**: Mass data destruction by any anonymous user (CVE-2026-31827, high severity).
- **Mitigation**: Collection-wide TTL mutation no longer exists. Each row stores its own
  `expires_at` (Unix seconds); every read filters `expires_at > now`
  (`repositories/paste-repository.ts`), and the hourly cron only deletes expired rows.
  Regression test: `tests/` TTL isolation suite (7-day paste unaffected by 30s paste).
- **Remaining risk**: None known for cross-paste interference; expiry accuracy depends on
  client clocks only in UI display, never in enforcement.

## 2. XSS

- **Threat**: Stored `<script>`, event-handler attributes, or breakout payloads executing
  in a viewer's browser.
- **Impact**: Token/key theft, defacement, drive-by actions on the origin.
- **Mitigation**: User content is rendered exclusively via `textContent` and highlighted
  with highlight.js on DOM text, never via `innerHTML`. Language values pass through a
  whitelist (`src/shared/constants.ts` LANGUAGES). Strict CSP on all HTML responses
  (`public/_headers`): `default-src 'self'`, no `unsafe-inline`, `object-src 'none'`,
  `base-uri 'none'`, `frame-ancestors 'none'`; only `challenges.cloudflare.com` is added for
  Turnstile. XSS payloads are covered by security tests.
- **Remaining risk**: A future vulnerability inside highlight.js itself would be in scope of
  the CSP's `script-src 'self'`; Dependabot keeps it patched.

## 3. SQL injection

- **Threat**: User-controlled strings altering query structure.
- **Impact**: Data exfiltration or destruction beyond one paste.
- **Mitigation**: Every D1 statement uses prepared statements with positional binding —
  no string interpolation anywhere (`repositories/paste-repository.ts`). IDs must match
  `^[A-Za-z0-9_-]{22}$` before reaching a query (`validation/paste.ts`). SQLi regression
  tests included.
- **Remaining risk**: None identified.

## 4. Oversized payload abuse

- **Threat**: Filling D1 storage (500 MB/database free tier) with huge pastes.
- **Impact**: Storage exhaustion, degraded service, quota lockout until reset.
- **Mitigation**: Server-side UTF-8 byte-length checks (`TextEncoder().byteLength`, not
  `.length`) enforce 256 KiB plain / 320 KiB encrypted limits → `413`
  (`validation/paste.ts`). Combined with rate limiting below.
- **Remaining risk**: 10 writes/min × 256 KiB ≈ 36 MiB/hour per IP is still possible abuse;
  acceptable at expected traffic, revisit if storage metrics show growth.

## 5. Paste ID enumeration

- **Threat**: Guessing valid paste URLs to harvest content.
- **Impact**: Exposure of unlisted pastes.
- **Mitigation**: IDs are 16 random bytes, base64url-encoded (~128 bits entropy,
  `services/paste-service.ts generateId()`), format-validated server-side. Invalid format
  returns the same uniform 404 as missing/expired/consumed pastes, so response shape leaks
  nothing about existence.
- **Remaining risk**: None beyond key-strength assumptions.

## 6. Write flooding

- **Threat**: Anonymous clients flooding create endpoint.
- **Impact**: Workers request quota and D1 write quota exhaustion.
- **Mitigation**: Native Cloudflare rate limiting binding: 10 requests/60 s per client key,
  `429` + `Retry-After` on excess (`middleware/rate-limit.ts`, wrangler.jsonc `ratelimits`).
  Raw IPs are used only as transient limiter keys — they are never stored in D1 or logs.
  Turnstile adds a browser-only friction layer but is deliberately not the primary defense
  because the API is public (CLI exists).
- **Remaining risk**: The dev fallback limiter is per-isolate in-memory and unsuitable as
  production defense (it is not used in production; binding always present there).

## 7. Burn-after-read race

- **Threat**: Two clients consuming a one-time paste simultaneously.
- **Impact**: Both receive "self-destructing" content; the guarantee is broken.
- **Mitigation**: Single atomic statement `DELETE ... RETURNING ...` guarded by
  `burn_after_read = 1 AND expires_at > now AND access_proof IS ?` — concurrent consumers
  race on one DELETE; exactly one gets the row, others get 404
  (`repositories/paste-repository.ts consumeBurn`). Concurrency regression test asserts
  exactly-one-success over N parallel consumes. Plain GET can never consume burn pastes:
  the content endpoint refuses them, so crawlers/preloaders cannot destroy data.
- **Remaining risk**: D1 executes statements serially per database; the invariant holds by
  SQL semantics rather than distributed locking.

## 8. Secret link leak

- **Threat**: The `/p/:id#k=...` URL being shared, logged, or sniffed, exposing the key.
- **Impact**: Encrypted paste readable by whoever holds the full fragment URL.
- **Mitigation**: Key lives in the URL **fragment**, which is never transmitted to the
  server. Server stores only ciphertext plus an access proof (SHA-256 of the key) — raw keys
  are never persisted or returned by the API. `Referrer-Policy: no-referrer` prevents
  fragment leakage through Referer headers. Knowing the path alone is insufficient: reads
  and consumption require the proof in SQL (`access_proof IS ?`), so a path-holder cannot
  even destroy a secret burn paste.
- **Remaining risk**: Anyone who sees the complete link (browser history, chat preview
  cards) can read the paste. This is inherent to link-as-key designs and documented UX.

## 9. Server compromise

- **Threat**: Full compromise of the Worker environment.
- **Impact**: Ciphertexts, access proofs, and secrets (Turnstile key) exposed.
- **Mitigation**: Client-side encryption means stored payload bytes are ciphertext; without
  per-paste keys (never stored server-side), plaintext recovery is not possible from DB
  contents alone. Secrets live only in Workers secret storage, never in the repo.
- **Remaining risk**: An active attacker with the Workers deployment could serve modified
  JavaScript to future visitors. Subresource integrity for first-party bundles is out of
  scope; this residual risk is common to all server-delivered web apps.

## 10. Logging sensitive content

- **Threat**: Payloads, keys, proofs, IPs, or tokens ending up in logs.
- **Impact**: Log aggregation becomes a plaintext oracle.
- **Mitigation**: Structured logging limited to request id/route/status/duration/generic
  error code (`worker/index.ts onError`). No middleware serializes request bodies; the
  error handler logs the path only. Access proofs are bound in SQL, not printed.
- **Remaining risk**: Cloudflare-side platform telemetry (e.g., siteverify analytics) is
  outside our control.

## 11. Crawler accidental consumption

- **Threat**: Link previews, prefetchers, or crawlers triggering GETs that destroy burn
  pastes or fetch sensitive content.
- **Impact**: One-time content silently consumed before the intended reader opens it.
- **Mitigation**: GET is side-effect-free by design — burn content requires an explicit
  `POST /consume` behind a confirmation button. Dynamic responses carry
  `X-Robots-Tag: noindex, nofollow, noarchive`, and `robots.txt` disallows `/p/`, `/raw/`,
  and `/api/`.
- **Remaining risk**: A crawler that ignores robots.txt and performs POSTs is outside
  realistic threat modeling.

## Header inventory

| Header | Where | Why |
|---|---|---|
| `Content-Security-Policy` | static `_headers` | XSS containment; strict, no `unsafe-inline` |
| `Cache-Control: no-store` | API middleware + raw route | Sensitive responses never cached at CDN/browser |
| `X-Content-Type-Options: nosniff` | both | Prevent MIME confusion, esp. `/raw/*` |
| `X-Robots-Tag` | both | Pastes are not search-engine content |
| `Referrer-Policy: no-referrer` | both | Never leak paths (and fragments in edge cases) |
| `Cross-Origin-Opener-Policy` | both | Process isolation |
| `Permissions-Policy` | both | Deny powerful APIs we don't use |
