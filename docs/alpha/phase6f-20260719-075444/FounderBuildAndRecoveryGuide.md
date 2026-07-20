# Phase 6F — Part 15: Deployment, Recovery, and Build Reproducibility

## Critical Finding and Fix: Broken Render Build Command

**Before this batch, `render.yaml`'s `buildCommand` was:**
`npm install && npx prisma migrate deploy`

This was a **guaranteed, 100%-reproducible deployment failure**, verified
live on this working tree:

```
$ DATABASE_URL="postgresql://fake:fake@localhost:5432/fake" npx --yes prisma migrate deploy
Error: Prisma schema validation - (get-config wasm)
Error code: P1012
error: The datasource property `url` is no longer supported in schema files...
```

Three independent, compounding reasons this step could never have
succeeded:

1. `prisma` is not a `package.json` dependency (not even a dev
   dependency) — `npx` would fetch a fresh, current major version on
   every build.
2. Current Prisma CLI major versions reject this repo's
   `prisma/schema.prisma` `datasource { url = env(...) }` syntax outright
   (schema validation error, before ever touching a database).
3. No `prisma/migrations/` directory exists in the repo at all — even a
   compatible Prisma version would have nothing to deploy.

The live runtime **does not use Prisma or any database** — all
persistence is local JSONL/JSON files under `data/` (see
`ArchitectureScaleReadiness.md`). The migrate step was pure legacy
scaffold that would have blocked every single deploy attempt.

**Fix applied:** `render.yaml`'s `buildCommand` is now simply `npm
install`, with an inline comment explaining why the Prisma step was
removed and exactly what would need to be true (real dependency,
compatible schema, committed migrations) before a real migration step is
reintroduced.

## Clean Install / Environment Validation

- `package.json` declares `"engines": { "node": ">=20.x" }` — matches the
  Node version this session ran (`node -v` compatible).
- `package-lock.json` is `lockfileVersion: 3` and its top-level
  `name`/`version` match `package.json` — consistent, reproducible
  install (`npm ci` would succeed against this lockfile).
- **New this batch:** `.env.sample` was created at the repo root. It did
  not exist before — `README.md` references a `.env.sample` that was
  missing, meaning a fresh clone had no documented list of required/
  optional environment variables. The new file enumerates every
  `process.env.*` name actually read by `server.js`, `routes/*.js`, and
  `services/*.js` (grouped into Required / Runtime flags / Admin auth /
  Optional providers / Scripture tuning / Not-currently-used), with the
  same safe defaults `render.yaml` already uses.
- `OPENAI_API_KEY` is the only strictly required secret for the
  companion's live answers to work; verified live in this session (server
  logs `OpenAI ready: true` / `✅ OpenAI client ready` once it's present
  in the environment, and the companion path fails gracefully with a
  friendly message — not a crash — when it is absent, per the existing
  `computeProviderStatus()` health check in `server.js`).

## Startup Command and Health Endpoints

- `startCommand: node server.js` (unchanged) — verified this session:
  server starts cleanly and prints an explicit, human-readable startup
  banner (`runtime mode`, `template prose`, `study fallback`, `OpenAI
  ready`, `final answer author mode`, heap/RSS) plus a route-ownership
  confirmation line: `Buddy live path verified: POST /buddy/chat →
  routes/buddy.js → withBuddyChatGuarantee → runBuddy →
  openAiFirstCompanionRuntime → bibleCompanionOrchestrator`.
- Four working health surfaces confirmed live this session:
  `GET /health`, `GET /selftest`, `GET /api/health`, `GET
  /admin/api/selftest` — all return `200` with version/provider status.
- `GET /admin/api/providers` and the new (Part 12)
  `GET /admin/api/bible-authority/provider-health` give a deeper,
  Admin-token-protected provider health view.

## Migration Command

None active — correctly so, given no database is wired into the
runtime today (see `ArchitectureScaleReadiness.md`). The former
`buildCommand`'s migration step is fixed as described above. If/when a
real database is adopted, this section must be revisited with an actual
Prisma dependency, a valid schema, and a committed `prisma/migrations/`
directory before any migration step is reintroduced into `buildCommand`.

## Build Artifacts / Portable Package ZIP

- Found `bible-buddy-monorepo-enterprise-v122.7-full.zip` at the repo
  root (3.6 KB, tracked in git, dated October 2025). Inspected its
  contents: 10 files (a skeletal `package.json`, `render.yaml`,
  `.env.template`, a 2.6 KB `server.js`, minimal `public/index.html`,
  etc.) — this is a **stale snapshot from a much earlier, far smaller
  version of the app**; it does not remotely reflect the current
  ~600-file `services/` tree or current `server.js`.
- Per this batch's explicit instruction ("do not regenerate huge
  archives unnecessarily... ensure archives are excluded from
  runtime/source control where appropriate"), this file was **not
  regenerated** (it is tiny, not "huge," so it is not itself a
  performance/repo-bloat problem) and was **not deleted** (deletion
  wasn't proven necessary and is outside this Part's narrow scope).
  **Recommendation, documented for a future decision:** either retire
  this stale artifact explicitly (it is misleading — a future engineer
  could reasonably mistake it for an authoritative "full" build package)
  or clearly rename/relabel it as a historical snapshot. Logged in
  `DeprecationAndCleanupRegister.md`-style form here rather than acted on.

## Graceful Provider Failure

Verified live in this session and in prior phases:
- Missing `OPENAI_API_KEY` → `computeProviderStatus()` reports
  `"OpenAI: missing OPENAI_API_KEY"` via `/health`; the companion path
  itself was verified (Phase 6F Part 9) to degrade to a friendly "having
  trouble reaching the AI service" message rather than crashing, and the
  new front-end fix in Part 13 (`try/catch` + `finally` re-enable) never
  leaves the UI stuck.
- Scripture-provider failure (`bibleTextProvider.getPassage`) tiers
  through local corpus → approved provider → external fallback,
  returning an honest `ok:false` with an `error` field rather than a
  fabricated verse, when every tier fails (verified in Part 11's
  `REFERENCE_UNRESOLVED` test case against a nonexistent reference).

## Job Restart / Recovery, Rollback, Backup/Restore

- Knowledge-acquisition and analytics jobs are one-shot operator scripts
  under `scripts/alpha/*.js` (not a persistent worker) — restart means
  simply re-running the script; idempotency depends on each script's own
  append/dedupe logic (already verified deterministic in Phase 6D/6E for
  the governed ingestion pipeline).
- Promotion rollback: `services/supportGraphCandidateQueue.js` records
  every decision as an appended, timestamped JSONL record
  (`support-graph-candidate-decisions.jsonl`) — a full decision history
  exists, but there is no one-click "undo a promotion" HTTP action yet
  (documented as `DEFER_POST_ALPHA` in Part 12's Admin Experience report).
- Backup/restore: all durable state lives under `data/` as plain
  files/JSONL — a full backup is simply copying that directory; no
  automated backup job exists today. `DEFER_POST_ALPHA`, but trivial to
  do manually for Founder Alpha's scale (documented here rather than
  built, since building a backup *job* is out of scope for this batch).

## Secrets and Repo Hygiene

- Confirmed `.env` is **not** tracked by git (correctly excluded via
  `.gitignore`).
- Repo-wide scan for OpenAI-style secret patterns (`sk-[A-Za-z0-9]{20,}`)
  across tracked `.js`/`.json`/`.yaml`/`.md` files: **zero matches** —
  no committed secrets found.
- `render.yaml`'s `ADMIN_PASSWORD: change-me` is a placeholder that must
  be manually replaced before any real deployment — flagged here as an
  explicit reminder, not changed (it is a per-deployment secret, not
  something this repo can safely set on someone's behalf).
- `render.yaml` declares several env vars (`POSTGRES_PRISMA`,
  `PERSISTENCE`, `REDIS_URL`, `QUEUE_RATE_PER_MINUTE`,
  `QUEUE_MAX_RETRIES`, `AI_DEPLOYMENT_AGENT`, `PHASE_AUTOSTART`,
  `SABBATH_QUIET`, `SUNDAY_RENEWAL_TIME`) that are **not read by any
  current code path** (verified via repo-wide `process.env.<NAME>`
  search — zero references for all but `REDIS_URL`, which has exactly
  one reference). These are harmless (unused env vars do not break
  anything) but are aspirational scaffolding from an earlier planned
  architecture. Documented here rather than removed, consistent with
  this batch's conservative cleanup policy — a future cleanup batch
  should decide whether to build against them or delete them from
  `render.yaml`.

## No Dependence on One Developer's Absolute Paths

Spot-checked `server.js`, `routes/*.js`, and the newly-added Phase 6F
files — all path construction uses `path.join(__dirname, ...)` /
relative requires, no hardcoded absolute developer-machine paths were
introduced by this batch or found in the reviewed files.

## Summary

| Item | Status |
|---|---|
| Clean install | OK — `npm ci`-compatible lockfile confirmed |
| Environment validation | **Fixed this batch** — added missing `.env.sample` |
| Startup command | OK — verified live, clear startup banner + route-ownership confirmation |
| Health endpoint | OK — 4 working endpoints verified live |
| Migration command | **Fixed this batch** — removed the guaranteed-broken `prisma migrate deploy` build step |
| Build artifacts | Stale 3.6 KB legacy zip found, flagged for a future decision, not touched |
| Reproducible package lock | OK |
| Deployment config (`render.yaml`) | **Fixed this batch** (build command); several unused-but-harmless env vars documented |
| Graceful provider failure | OK — verified live across OpenAI and Scripture-provider failure paths |
| Job restart/recovery | Manual (script re-run) — acceptable for Founder Alpha, documented |
| Rollback | Decision history exists; one-click rollback action deferred (Part 12) |
| Backup/restore | Manual (copy `data/`) — acceptable for Founder Alpha, documented |
| No secrets in repo | OK — verified via pattern scan, `.env` correctly untracked |
| No hardcoded developer paths | OK — spot-checked |
