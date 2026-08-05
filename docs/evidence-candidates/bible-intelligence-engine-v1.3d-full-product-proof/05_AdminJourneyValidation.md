# BIE V1.3D — Admin Journey Validation

**Status:** BLOCKED_WITH_EXACT_REASON

`admin-auth-probe.json` shows both authenticated Admin endpoints returned 401 while a local token was present (`token_len: 16`). Unauthenticated request returned 401 and `fail_closed: true`. This demonstrates fail-closed behavior, not production-token parity.

Manual action: Render → bible-buddy → Environment → set `BIBLE_AUTHORITY_ADMIN_TOKEN` → redeploy → use that same Bearer token.
