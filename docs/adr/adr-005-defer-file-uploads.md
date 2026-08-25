# ADR-005: Keep v2 text-only and defer file uploads

## Status

Accepted for v2. Revisit as a separate storage project.

## Context

File uploads would change Alienbin from a small text service into an object-storage service.
The current D1 schema is appropriate for bounded text payloads but not binary objects.
Cloudflare R2 has a monthly Free tier for Standard storage, but a public upload service can
consume that allowance quickly. Storage size is only one constraint. Upload abuse, partial
uploads, orphan cleanup, encrypted metadata, download concurrency, and cost ceilings must be
designed together.

Telegram was considered as an external file store. It was rejected because Alienbin would
not control file retention, deletion evidence, availability, or transfer limits. The
standard Bot API also limits `getFile` downloads and issues temporary download URLs. Those
properties conflict with an expiring service that publishes specific deletion behavior.

## Decision

Alienbin v2 remains text-only. No file input, Telegram bot storage, R2 bucket, or upload API
is included in the current release.

If file support is revisited, the minimum acceptable design is:

- Cloudflare R2 or another application-controlled object store
- client-side encryption before upload
- encrypted filename and media metadata
- a strict per-file limit and an account-wide cost ceiling
- D1 metadata that applies the same expiration and read-limit rules
- atomic authorization before download
- cleanup for expired, exhausted, abandoned, and partially uploaded objects
- abuse controls that are separate from the text-paste quota

R2 lifecycle rules work in whole days or on a specific date, so they cannot enforce
Alienbin's 30-second and 10-minute options. D1 query guards must make expired objects
inaccessible immediately, and a Worker cleanup job must delete the physical object later.

## Consequences

- The product remains focused on code, logs, configuration, and notes.
- The security model and operating cost stay bounded enough to document honestly.
- File support does not become a portfolio feature until its abuse and deletion properties
  are as testable as the text path.
- The UI can add attachments later without changing existing paste URLs or expiry semantics.

References:

- [R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- [R2 object lifecycles](https://developers.cloudflare.com/r2/buckets/object-lifecycles/)
- [Telegram Bot API getFile](https://core.telegram.org/bots/api#getfile)
