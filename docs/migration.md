# Migration from v1

## Decision: legacy data is not migrated

> Legacy data is ephemeral by design.
> v2 starts with a clean storage model.
> Git history preserves the v1 implementation.

Rationale:

1. **The data is temporary by contract.** Every v1 paste carried a TTL between 30 seconds
   and 7 days. At any given moment nearly all rows are already expired or about to be;
   migrating them would copy garbage.
2. **No schema bridge is meaningful.** v1 stored plaintext `value` documents keyed by Mongo
   ObjectId. v2 stores ciphertext-or-plaintext keyed by random IDs with per-record
   expiration and optional access proofs. There is no lossless mapping, and inventing one
   would add complexity for data whose entire purpose was to disappear.
3. **Rollback path exists without data migration**: `git tag v1-legacy` preserves the full
   v1 implementation; the old stack can be redeployed from that tag if ever needed.

## Credentials removed

- The MongoDB connection string (`DB_URL`, pointing at Atlas) existed only as an
  environment variable in the legacy hosting environment — no credential material was ever
  committed, and nothing referencing it ships in v2 (`mongoose`/`mongodb` dependencies are
  gone from `package.json`).
- Any operator-side secrets for the legacy host can be revoked after the cutover.

## What operators must clean up after v2 goes live

1. Decommission the legacy Node host.
2. Delete or downsize the MongoDB Atlas project once its retention window passes.
3. Optionally attach `alienbin.com` to the Worker (see docs/operations.md).
