# Part 4 — Deployment Configuration Repair

## 1. `render.yaml` Verification (post-baseline-commit state)

| Setting | Value | Status |
|---|---|---|
| `buildCommand` | `npm install` | ✅ Correct. Confirmed **not** the broken `npx prisma migrate deploy` (that fix was already committed in the Part 2 baseline commit, carried over from the local working tree). `npm install` ran clean in a dry-run simulation — lockfile in sync, 0 errors. |
| `startCommand` | `node server.js` | ✅ Matches `package.json` and the actively-running local server process. |
| `healthCheckPath` | `/health` | ✅ Present; verified live (`GET /health` returns `{"health":{"ok":true,...}}`). |
| Node version | Not set in `render.yaml`; constrained via `package.json` `"engines": {"node": ">=20.x"}` | ✅ Correct mechanism — Render reads `engines.node` from `package.json` automatically for Node web services; no separate `runtime`/`nodeVersion` key is needed. |
| `autoDeploy` | `true` | ✅ Present. |
| Environment variables | 24 declared (see below) | ⚠️ 1 defect found and repaired (see §2). |
| Persistent storage requirements | None declared; `PERSISTENCE: MEMORY` and file-based JSONL/JSON under `data/` | Documented, not a defect — consistent with the already-documented single-instance-only scaling limitation (Phase 6F `ArchitectureScaleReadiness.md`). No architecture change made. |
| Database requirements | `DATABASE_URL` declared as `sync: false` but unused by the runtime (no Prisma dependency, no DB client wired) | Pre-existing, already-documented scaffolding (Phase 6F/6G). Left as-is — not a broken build step (unlike the old `prisma migrate deploy`), just an inert placeholder. No architecture change introduced. |

## 2. Defect Found and Repaired: Admin Token Not Declared

**Defect:** `render.yaml` declared `ADMIN_PASSWORD: change-me` as if it were a real security
control, but grep across every `.js` file in the repository confirms `ADMIN_PASSWORD` is **never
read anywhere in the application code**. The actual Admin route gate —
`routes/bibleAuthorityAdmin.js` `checkAdminAuth()` — reads `BIBLE_AUTHORITY_ADMIN_TOKEN` (falling
back to `ALPHA_ADMIN_TOKEN` / `BETA_REVIEW_TOKEN`), and **none of these three real env vars were
declared in `render.yaml`**. A Render Blueprint deploy from this file would therefore leave every
`/admin/api/bible-authority/*` route publicly open, while presenting a misleading `ADMIN_PASSWORD`
field that looks like a security control but does nothing.

**Repair (minimal, additive — no new architecture):** Added `BIBLE_AUTHORITY_ADMIN_TOKEN` as a new
`sync: false` env var declaration immediately above `ADMIN_PASSWORD`, with a comment explaining
which var actually gates Admin routes and warning that leaving it unset means Admin data is
publicly readable. `ADMIN_PASSWORD` was left in place (not deleted, to avoid any unknown external
dependency) but is now clearly annotated as legacy/unused.

**This does not create a login system, a new auth architecture, or a new feature** — it only makes
the existing, already-implemented token check (`checkAdminAuth()`, present since Phase 6) visible
and settable through the same deployment mechanism (Render env vars) the app already uses for
`OPENAI_API_KEY`. This defect and its exact scope are carried forward as the primary blocking item
in Part 8 (Authentication) — the token still needs to be set with a real secret value in the Render
dashboard before Founder invitations go out; that action cannot be taken by this batch (secret
values are never generated/printed by this process).

## 3. Local Production Simulation

- `npm install` (the exact committed `buildCommand`) simulated via `npm install --dry-run`:
  clean, "up to date", 0 errors, lockfile in sync.
- `node server.js` (the exact committed `startCommand`): the currently-running local server
  process (verified listening on port 3000, `GET /health` returns healthy) was started this way in
  the prior FINAL GATE batch and has been kept running continuously; its behavior under
  `NODE_ENV=production` was exhaustively verified in that batch (build, static assets, routing,
  environment variables, startup logging — see `docs/alpha/founder-alpha-release-verification-20260720-004049/FounderAlphaVerificationReport.md`).
  No code affecting startup behavior changed in this batch, so that verification remains valid.
- `GET /health` (the exact committed `healthCheckPath`): returns HTTP 200 with
  `{"health":{"ok":true}}` — confirmed live during this batch (Part 2, §2).

## 4. Scope Discipline

No new deployment architecture was introduced. No database, queue, or session store was added.
No CI/CD pipeline was created. The only change was adding one missing, already-implemented,
already-documented security env var declaration that should have been present from the point the
Admin token check was first implemented.
