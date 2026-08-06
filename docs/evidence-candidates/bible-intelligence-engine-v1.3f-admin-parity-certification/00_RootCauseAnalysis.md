# 00 — Root Cause Analysis

## Evidence chain

1. Probe environment = Cursor agent shell (not Render, not CI). Reads `BIBLE_AUTHORITY_ADMIN_TOKEN` from the agent environment.
2. Production runtime (`e528a5a`) reads `process.env.BIBLE_AUTHORITY_ADMIN_TOKEN` via `services/adminAuthMiddleware.js` `resolveAdminToken()`.
3. Health reports `adminAuthConfigured: true` and `adminAuthFingerprint: 9d04dcfc8c6d` (SHA-256 of trimmed secret, 12 hex chars — non-reversible).
4. Probe computes the same fingerprint over its env secret → `17d6bfe05d1b`.
5. Fingerprints differ → the two environments hold different secret values.
6. Exact string compare in middleware therefore returns 401. Fail-closed behavior is correct.
7. Probe token shape (current): length 16, no leading/trailing whitespace, no CR/LF — whitespace is not the cause of this 401.
8. Fallback vars `ALPHA_ADMIN_TOKEN` / `BETA_REVIEW_TOKEN`: absent in probe env.
9. Middleware owner is correct; Bearer header format used by probes is correct.

## Root cause (proven)

`CONFIGURATION_VALUE_MISMATCH` between:

- Render service env `BIBLE_AUTHORITY_ADMIN_TOKEN` (fingerprint `9d04dcfc8c6d`)
- Cursor/agent probe env `BIBLE_AUTHORITY_ADMIN_TOKEN` (fingerprint `17d6bfe05d1b`)

Not a routing bug. Not a missing Render variable. Not an open auth hole.

## Repository gap found (hardened this batch)

Prior middleware did not trim secrets and used case-sensitive `Bearer ` prefix only. Hardened in `e528a5a`. Does not resolve the current mismatch (fingerprints still differ after deploy).
