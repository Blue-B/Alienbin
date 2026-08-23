# ADR-002: Per-record `expires_at` instead of MongoDB TTL index mutation

## Context

v1 dropped and recreated a collection-wide TTL index on every paste creation so that each
request's TTL choice took effect (`docs/legacy-analysis.md` §2). Because Mongo TTL indexes
govern the whole collection, any user's 30-second paste redefined the lifetime of every
existing document. This was published as CVE-2026-31827 / GHSA-hqvr-6v89-gwff (high).

## Decision

Store expiration on each row: `expires_at` (Unix seconds), indexed via
`idx_pastes_expires_at`. Enforce expiry in every read path with `expires_at > now`, and let
an hourly cron delete expired rows purely as storage maintenance.

## Alternatives

- **MongoDB per-document TTL**: does not exist; TTL is index-scoped. Within Mongo the only
  correct pattern is a single fixed index on an `expiresAt` field — i.e., the same design,
  but v2 reaches it on D1 where rows are cheap and the query model is explicit SQL.
- **Lazy deletion only (no cron)**: reads would already be safe, but storage would grow
  until manual cleanup; cron costs nothing on the free plan, so we keep both layers.
- **Cron-only expiry (no read filter)**: rejected outright — a missed cron run would expose
  expired content. The read filter is the security boundary; cron is janitorial.

## Consequences

- Positive: pastes are fully independent; expiry cannot be influenced by other users;
  correctness provable by regression tests that need no real-time waiting (injectable clock).
- Negative: two mechanisms (read filter + cron) must stay consistent; documented here and
  enforced by tests to prevent drift.
