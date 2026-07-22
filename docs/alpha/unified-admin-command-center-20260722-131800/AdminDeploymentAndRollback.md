# Admin Deployment & Rollback — Unified Admin Command Center

## Feature flag

`ADMIN_UNIFIED_COMMAND_CENTER_ENABLED`

- **Default:** ON (enabled) when the variable is unset, empty, `"1"`, or
  `"true"` (case-insensitive).
- **To disable:** set `ADMIN_UNIFIED_COMMAND_CENTER_ENABLED=0` (or
  `"false"`) in the environment and redeploy/restart.

## What disabling the flag does

Every `GET`/`POST` route under
`/admin/api/bible-authority/unified/*` responds:

```json
{ "ok": false, "error": "Unified Admin Command Center is disabled (ADMIN_UNIFIED_COMMAND_CENTER_ENABLED=0). All pre-existing Admin endpoints remain fully functional." }
```
with HTTP status `503`.

Verified live (local environment, `2026-07-22`):

| Check | With flag OFF |
|---|---|
| `GET /unified/overview` (valid token) | 503 |
| `GET /admin/api/bible-authority/command-center` (legacy, valid token) | 200 — unaffected |
| `GET /admin/bible-authority.html` | 200 — unaffected |

The Command Center *tab* in the browser will show its own panels'
"disabled" empty-state message (via `ccGet()`'s explicit `503` handling)
while every other existing tab keeps working exactly as before this
batch — there is no code path where disabling this flag breaks the rest
of the Admin page.

## Pre-deployment checklist (Part 17)

- [x] Working tree reviewed: only additive new files
      (`services/admin*.js`, `scripts/alpha/unifiedAdminCommandCenterSmoke.js`)
      plus three modified files
      (`routes/bibleAuthorityAdmin.js`, `admin/bible-authority.html`,
      `admin/js/bible-authority.js`) and one `package.json` script entry.
- [x] No secrets in any changed/added file (pattern-scanned for API-key
      / password-literal shapes — none found).
- [x] Runtime data files (`data/admin-command-center/*`) confirmed
      gitignored (`data/*` in `.gitignore`) — nothing operational or
      sensitive is committed.
- [x] Syntax-checked every new/modified `.js` file with `node --check`.
- [x] Ran the new deterministic smoke suite:
      `npm run admin-command-center:smoke` — 31/31 passed.
- [x] Ran full regression set: `scriptureFidelitySmoke` (4/4),
      `decisionOwnershipSmoke` (14/14), `liveRuntimeVerification` (6/6),
      `openAiFirstRegressionTest` (9/10 — the one failure,
      `9_knees_health`, is a pre-existing, previously documented,
      credential-dependent case that requires `OPENAI_API_KEY` to be
      configured; it is unrelated to this batch and was already present
      before this batch's changes).
- [x] Verified feature-flag rollback path (see table above).

## Deployment mechanism

Standard main-branch Render flow — same as every prior batch in this
project. No new deployment infrastructure was introduced.

## Rollback procedure if a problem is found after deploy

1. **Fastest / zero-code rollback:** set
   `ADMIN_UNIFIED_COMMAND_CENTER_ENABLED=0` in the Render environment and
   redeploy/restart. This immediately reverts the Admin surface to its
   pre-batch behavior with no code change required.
2. **Full rollback:** revert the merge commit for this batch on the
   `main` branch and redeploy. Because every change in this batch is
   additive (new files) or append-only (new routes appended at the
   bottom of the existing routes file, new UI appended alongside
   existing UI), a revert removes exactly this batch's contribution with
   no risk to unrelated code.
