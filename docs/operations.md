# Operations & Cost

Alienbin v2's explicit goal is a **zero-fixed-cost** service: no VM to keep alive, no
database subscription, no paid hosting tier. This document records the cost model honestly,
including what "free" actually covers.

## Cost structure: v1 vs v2

| | v1 | v2 |
|---|---|---|
| Compute | External Node host (always-on process) | Cloudflare Workers (scale-to-zero, free tier) |
| Database | MongoDB Atlas (storage-constrained cluster) | Cloudflare D1 (free tier) |
| Frontend hosting | Same Node process via Express static + EJS | Workers Static Assets, **free and unmetered** |
| Domain | `alienbin.com` custom domain | `*.workers.dev` by default; custom domain optional |
| Bot defense | none | Cloudflare Turnstile (free) |
| Fixed monthly cost | host + Atlas tier | $0 |

Note: the current repository README contains no record of the legacy hosting provider
(verified by grep); per the operator's own records v1 was deployed on an external Node
platform. The renewal directive describes it as Cloudtype.

## Free-tier limits (Cloudflare official docs, verified 2026-08)

| Resource | Free limit |
|---|---|
| Workers dynamic requests | 100,000 / day (resets 00:00 UTC) |
| Static Assets requests | unlimited, unmetered on all plans |
| D1 rows read | 5,000,000 / day |
| D1 rows written | 100,000 / day |
| D1 storage | 500 MB per database, 5 GB total |
| Cron Triggers | available on free plan (5 per account) |
| Turnstile | unlimited verification requests |

Sources: developers.cloudflare.com documentation for Workers limits, D1 pricing, Static
Assets billing, and Turnstile plans. Re-check these numbers against current docs before quoting
them anywhere new; they change over time.

## How v2 fits inside those limits

- A paste view costs **one** dynamic request (`GET /api/pastes/:id/content`) plus one or two
  D1 row reads; the page shell itself is a free static asset hit.
- Creating a paste: one dynamic request, one D1 write, plus rate-limiter/Turnstile calls
  that don't consume D1 quota.
- 100k dynamic requests/day ≈ roughly 50k full paste reads/day. Expected traffic for this
  service is orders of magnitude below that.
- The hourly cron schedules 24 cleanup runs per day and consumes negligible quota.

## Storage scope

Alienbin v2 stores bounded text in D1. Plain payloads are limited to 256 KiB and encrypted
payloads to 320 KiB. File uploads are intentionally excluded; see
[ADR-005](adr/adr-005-defer-file-uploads.md).

Cloudflare R2 is the preferred candidate if attachments are added later, but its Free tier
is not treated as unlimited public storage. Any file design must include an account-wide
cost ceiling, separate upload quotas, abandoned-object cleanup, encrypted metadata, and
Worker-controlled expiry. Telegram is not an accepted storage backend because Alienbin
cannot control or verify its retention and deletion behavior.

## Honest framing

This is **not** "free forever". Cloudflare can change limits, and viral traffic could hit
daily quotas. The accurate claim is:

> At currently expected traffic, Alienbin v2 operates within the free tier with no fixed
> server cost. If quotas ever bind, the upgrade path is usage-based billing rather than an
> always-on server.

## Operational runbook

```bash
npm run deploy            # build + wrangler deploy (Worker + assets)
npm run db:migrate:remote # apply SQL migrations to production D1
wrangler secret put TURNSTILE_SECRET_KEY
wrangler d1 execute alienbin --remote --command "SELECT COUNT(*) FROM pastes"
```

Cron health: check Worker metrics → Cron Trigger executions in the dashboard.
Storage watch: D1 dashboard → database size vs 500 MB.
