# Bible Buddy — Health Check (v122.10.11)

Use these checks after deploy (Render).

1) Service is up → `GET /health` should show `ok:true`.
2) Persistence → `GET /api/persistence` returns `MEMORY` or `POSTGRES`.
3) Prisma migration ran → Build log shows `prisma migrate deploy`.
4) Redis queue mode → `GET /api/providers/status` → `queue.mode` = `redis` (if REDIS_URL set).
5) Providers → Admin → Providers → Send Test Email/SMS (stub OK without keys).
6) Mapping → Admin → Mapping → Run Suggestions → Preview Diff → Apply (CSV auto-downloads).

Updated: 2025-10-31T13:30:13.260816Z
