# 10 — Admin Auth Parity

Owner: `services/adminAuthMiddleware.js` `checkAdminAuth` (fail-closed).
Env names: `BIBLE_AUTHORITY_ADMIN_TOKEN` (primary), `ALPHA_ADMIN_TOKEN`, `BETA_REVIEW_TOKEN`.
Local token present → production Mission Control / Command Center **401**.
Unauthorized without token → **401**.
State: `BLOCKED_WITH_EXACT_REASON` — Render secret must be set by Founder. Not an app-code defect.
Manual action: Render → bible-buddy → Environment → set `BIBLE_AUTHORITY_ADMIN_TOKEN` → redeploy → use Bearer token.
