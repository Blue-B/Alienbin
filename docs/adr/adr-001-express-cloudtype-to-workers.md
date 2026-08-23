# ADR-001: Replace Express + external Node host with Cloudflare Workers

## Context

v1 ran a single always-on Express process in front of MongoDB Atlas. The operator paid for
a host that stayed up whether or not anyone used the service, while revenue never covered
the cost. Deployment was manual and environment-specific; there was no
infrastructure-as-code.

## Decision

Rebuild v2 as a single Cloudflare Worker: Hono router for the API, Workers Static Assets for
the frontend bundle, D1 for storage, Cron Trigger for cleanup — one deploy unit
(`wrangler.jsonc`).

## Alternatives

- **Keep Express on a VPS**: solves nothing that motivated the rewrite; fixed cost remains.
- **Cloudflare Pages + Pages Functions**: viable, but Static Assets inside a Worker gives
  one artifact and one config file; Pages Functions would split routing across two systems.
- **Other serverless platforms (Lambda+API GW, Fly.io machines)**: comparable function but
  no free unmetered static hosting plus free SQLite D1 plus Turnstile in one ecosystem;
  cold starts and per-service glue add operational surface.

## Consequences

- Positive: fixed cost → $0; deploy is `wrangler deploy`; static traffic is unmetered;
  D1 removes an external credential surface entirely.
- Negative: Workers runtime constraints (no Node APIs in the hot path — acceptable since
  the CLI covers Node users); vendor lock-in to Cloudflare, mitigated by the fact that the
  entire backend is ~800 lines of standard TypeScript/Hono/SQL.
