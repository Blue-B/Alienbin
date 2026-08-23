# ADR-004: Burn-after-read as an explicit atomic consume operation

## Context

"One-time read" is only honest if the system can guarantee it. Two hazards make naive
implementations lie:

1. **GET-based destruction**: a link previewer or browser prefetch fires a GET and silently
   consumes the paste before the human sees it.
2. **SELECT-then-DELETE race**: two concurrent consumers both pass the SELECT, both receive
   the payload, then both attempt the delete — the "once" guarantee is broken.

## Decision

- GET endpoints are side-effect-free. `GET /api/pastes/:id/content` refuses burn pastes
  outright; consumption happens only via an explicit user action (Reveal button) that calls
  `POST /api/pastes/:id/consume`.
- The consume endpoint performs one atomic statement:

```sql
DELETE FROM pastes
WHERE id = ?1 AND burn_after_read = 1
  AND expires_at > ?2 AND access_proof IS ?3
RETURNING id, payload, encrypted, language, expires_at;
```

Exactly zero or one row comes back: whoever wins the DELETE gets the payload; every loser
gets a uniform 404.

## Alternatives

- **Soft-delete flag (`consumed_at` set via UPDATE ... WHERE consumed=0)**: also atomic in
  SQL, but leaves content in the table — worse for the threat model (DB compromise) and
  requires cron cleanup anyway.
- **D1 batch/transaction wrapping SELECT+DELETE**: two round trips inside a transaction;
  strictly more moving parts than a single RETURNING statement with identical guarantees.
- **Application-level lock**: meaningless across isolates; D1 serializes statements per
  database already.

## Consequences

- Positive: the invariant "N concurrent consumes → exactly 1 success" holds by SQL
  semantics; crawlers cannot trigger it; regression test asserts exactly-one-success.
- Negative: accidental tab refresh after reveal shows permanent destruction (intended UX,
  explicitly messaged); `RETURNING` support had to be verified on D1 (it is supported,
  SQLite semantics).
