# 01 — Release And Configuration Parity

| Identity | Value |
|---|---|
| LOCAL_SHA | `133c6bb` |
| ORIGIN_MAIN_SHA | `133c6bb` |
| HEALTH_RELEASE_COMMIT | `133c6bb` |
| Parity | MATCH |

Production health `adminAuthConfigured`: **PRESENT** (boolean only).
Token value in health payload: **NOT_DETECTED**.
Probe-environment token: **PRESENT**.
Authorized probe with probe-env token: **MISMATCH** (HTTP 401).
Competing local `ALPHA_ADMIN_TOKEN` / `BETA_REVIEW_TOKEN`: **MISSING**.
Middleware owner: `services/adminAuthMiddleware.js` `resolveAdminToken` / `checkAdminAuth`.
Query-string `?token=` acceptance: **DESIGNED** in middleware (documented; wrong query token → 401).
Redeploy performed so running process loads env; `adminAuthConfigured` became true after deploy of `133c6bb`.
