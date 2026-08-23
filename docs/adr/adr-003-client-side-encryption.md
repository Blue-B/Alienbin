# ADR-003: Client-side encryption for Secret pastes

## Context

A pastebin's server is a juicy target: whatever users paste lives there in readable form.
For a service whose pitch includes "Private", trusting the operator's storage is a weak
guarantee. We wanted an option where even a full database dump reveals nothing.

## Decision

Offer an opt-in Secret mode implemented entirely in the browser:

- 256-bit key from `crypto.getRandomValues`, fresh per paste
- AES-GCM with a random 96-bit IV, AAD bound to `"alienbin-secret-v1"`
- Wire format `v1.<base64url(iv)>.<base64url(ciphertext)>` (`src/web/crypto.ts`)
- Key returned to the user only via the URL fragment `#k=<key>`, which browsers never send
  to servers
- Server receives ciphertext plus an access proof (`SHA-256(key)`), used in SQL to gate
  reads/consumption without learning the key

## Alternatives

- **Server-side encryption at rest**: protects against disk theft, not against the server
  itself; plaintext still transits and exists in memory/logs of the operator.
- **Password-derived keys (PBKDF2)**: adds UX friction and weak-key risk; random keys in
  fragments are stronger and zero-friction.
- **No encryption, TLS-only**: status quo of most pastebins; insufficient for the "server
  compromise" threat in docs/security-design.md §9.

## Consequences

- Positive: DB contents are ciphertext; key never stored or logged server-side; proof-gated
  SQL means path-holders can't read or destroy secret pastes.
- Negative: losing the URL fragment loses the paste forever (documented UX state
  "Encryption key is missing"); JS must be enabled; the fragment appears in browser history,
  so link hygiene stays the user's responsibility.
