# Legacy Analysis — Alienbin v1

An evidence-based analysis of the v1 implementation (`git tag v1-legacy`, branch `main`).
Every problem listed below was verified against actual code. Problems that did **not**
exist are recorded as such, so this document does not overstate the case for renewal.

## 1. Original architecture

```text
Browser
   ↓
Express 4 (server.js, single file)
   ↓
EJS templates (views/*.ejs)
   ↓
MongoDB (driver: `mongodb` npm package, DB name "bin", collection "post")
```

- Stack declared in `package.json`: `dotenv`, `ejs`, `express ^4.19.2`, `helmet ^7.1.0`,
  `mongoose ^8.4.3` (the code itself uses the `mongodb` driver directly), and `nodemon`.
- Connection string came from the `DB_URL` environment variable.
- Deployment target was an external Node host; no infrastructure-as-code existed.
  Note: the current README contains **no Cloudtype reference** (verified by grep).
  The claim "v1 ran on Cloudtype" comes from the operator's own records, not from the repo.

## 2. The expiration design flaw

### What the code actually did

In `server.js`, the `/save` handler mutated a **collection-wide MongoDB TTL index** on every
submission:

- `server.js:41` — `await db.collection('post').dropIndex("createdAt_1")`
- `server.js:46–74` — one `createIndex({ createdAt: 1 }, { expireAfterSeconds: N })` branch
  per TTL option (30s / 1m / 10m / 30m / 1h / 3h / 1day / 7day)

### Why this is a collection-level policy, not a per-user TTL

MongoDB TTL indexes apply to **every document** in the collection. Because v1 dropped and
recreated that single index with each request's chosen value:

```text
User A creates a paste with TTL = 7 days
User B creates a paste with TTL = 30 seconds
→ the collection TTL index is recreated with expireAfterSeconds = 30
→ User A's document is now subject to deletion after 30 seconds
```

Any anonymous client could destroy all existing pastes by repeatedly submitting short-TTL
pastes. This was reported and published as:

> **GHSA-hqvr-6v89-gwff / CVE-2026-31827** — "TTL Index Race Condition allows unauthorized
> deletion of other users data", severity **high**, patched versions: **none** (at the time
> of the v2 rewrite).

The advisory's recommended remediation is exactly what v2 implements: store expiration as a
per-record field (`expires_at`) and never mutate collection-wide policy.

## 3. Other verified security issues

| Issue | Evidence | Impact |
|---|---|---|
| CSP explicitly disabled | `server.js:10` — `contentSecurityPolicy: false, //csp header disable, 인라인 스크립트사용` | No defense-in-depth against XSS |
| Inline `<script>` blocks in views | `views/nav.ejs:109`, `views/new.ejs:43`, `views/_button.ejs:14` | Made a strict CSP impossible without refactoring |
| Third-party CDN scripts | highlight.js + autosize loaded from cdnjs (`views/new.ejs:7`, `views/display.ejs:8`) | SRI integrity attributes *were* present — a genuine strength worth noting — but availability depended on a third-party CDN |
| Mongo ObjectId exposed in URLs | `server.js`, `/display/:id` route | Sequential-ish, guessable identifiers; leaks creation-time information |
| Broken error handling on missing paste | `server.js:97` — `res.writeHead(...)` inside the catch block | `res.writeHead` does not exist on an Express response; the intended "Page Not Found" alert path throws instead, returning a wrong status with no usable error page |
| No rate limiting | entire `server.js` | Unlimited anonymous writes |
| No explicit input size validation | only the implicit ~100 KB limit from `express.urlencoded` defaults | Relied on framework default rather than a service decision |
| No tests | `package.json` — `"test": "echo \"Error: no test specified\" && exit 1"` | Nothing could prove or prevent regressions |
| No CI, no Dependabot config | `.github/` contained only `FUNDING.yml` | Dependency updates were manual (dependabot PRs had been merged ad hoc) |
| `console.error(error)` logging | `/display/:id/raw` handler | Minor: raw errors logged without structure |

## 4. Things v1 got right (recorded honestly)

- `display.ejs` rendered user content through EJS `<%= %>` auto-escaping into a `<pre><code>`
  block, so stored-paste XSS on the display page was largely mitigated.
- CDN scripts carried SRI `integrity` hashes and `referrerpolicy="no-referrer"`.
- The raw endpoint added later returned proper 404s when the paste was missing.

## 5. Things checked and found absent

- **No Kakao AdFit / ad SDK code** anywhere in views or public assets (verified by grep).
  The v2 requirement "remove ads if present" turned out to be a no-op.
- `.github/FUNDING.yml` is GitHub Sponsors metadata, not an ad integration — kept as-is.
