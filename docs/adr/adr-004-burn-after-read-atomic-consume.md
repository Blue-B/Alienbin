# ADR-004: Read limits as explicit atomic consume operations

## Context

A read limit is only honest if concurrent requests cannot exceed it. Two hazards make a
naive implementation unreliable:

1. A link previewer or browser prefetch can issue a GET before the intended reader arrives.
2. Two consumers can both read the same counter before either one updates or deletes it.

Alienbin supports unlimited access or limits of 1, 3, 5, and 10 successful reads.

## Decision

GET endpoints are side-effect-free. `GET /api/pastes/:id/content` refuses every
read-limited paste. Consumption requires an explicit user action that calls
`POST /api/pastes/:id/consume`.

One-time pastes execute one atomic statement:

```sql
DELETE FROM pastes
WHERE id = ?1 AND burn_after_read = 1
  AND expires_at > ?2 AND access_proof IS ?3 AND max_reads <= 1
RETURNING id, payload, encrypted, language, expires_at, read_count, max_reads;
```

Higher limits execute one conditional update:

```sql
UPDATE pastes SET read_count = read_count + 1
WHERE id = ?1 AND burn_after_read = 1
  AND expires_at > ?2 AND access_proof IS ?3 AND read_count < max_reads
RETURNING id, payload, encrypted, language, expires_at, read_count, max_reads;
```

The SQL condition is the concurrency boundary. A request succeeds only while a row can be
deleted or its counter can still be incremented.

## Alternatives

- A SELECT followed by DELETE or UPDATE was rejected because concurrent requests can pass
  the first query together.
- An application lock was rejected because Workers isolates do not share process memory.
- A consumed flag was rejected for one-time pastes because it leaves payload bytes in the
  active table until cleanup.
- GET-based consumption was rejected because previews and prefetchers can spend a read.

## Consequences

- One-time content is removed from the active database during the successful consume.
- Higher limits allow exactly the configured number of successful consumes under
  concurrency. Exhausted rows become inaccessible immediately and are removed by hourly
  cleanup.
- Refreshing after a successful consume spends another read. The confirmation screen makes
  this behavior explicit.
- D1 Time Travel can retain recoverable database history for up to 7 days on the Free plan,
  including rows deleted from the active database.

Integration and security tests cover one-time races, three-read exhaustion, wrong access
proofs, crawler-safe GET behavior, and uniform 404 responses after exhaustion.
