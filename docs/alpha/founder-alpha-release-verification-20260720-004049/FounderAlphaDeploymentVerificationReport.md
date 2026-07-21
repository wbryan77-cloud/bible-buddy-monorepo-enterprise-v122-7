# Founder Alpha Deployment Verification Report

**Date:** 2026-07-20
**Batch:** Founder Alpha Deployment Verification — Standard Operations
**Method:** every value below was obtained by directly inspecting the repository, git remote/branch state, `render.yaml` on every relevant ref, and live HTTP requests to the one externally-reachable hostname found in the repo. No value was assumed, inferred, or estimated.

---

## PART 1 — Deployment Verification

| Item | Verified value | How verified |
|---|---|---|
| Deployment target | Render (`render.yaml` present in repo; live response header `x-render-origin-server: Render`) | File read + live HTTP header |
| Hostname found in repo | `bible-buddy-monorepo-enterprise-v122-7.onrender.com` (hardcoded default in `scripts/runPhase5OContinuationRegression.js` prior to this session's local-only fix) | `grep` across repo |
| Is that hostname live? | **Yes** — `GET /` → 200, `GET /health` → 200 | Live `curl` |
| SSL status | Valid — Render-issued certificate, `CN=onrender.com`, expires 2026-08-24, verified OK | `curl -v` TLS handshake |
| Custom domain configuration | **None found** — no `domains:` block in `render.yaml` on any branch checked (`main`, `sprint-2c-c3-explicit-scripture-handoff`, local working tree) | `grep -i domain render.yaml` on each ref |
| Health endpoint | `GET /health` → 200 on the live host, returns `{"health":{"ok":true,"version":"v122.14.0 ..."},...}` | Live `curl` |
| Git remote | `origin` = `https://github.com/wbryan77-cloud/bible-buddy-monorepo-enterprise-v122-7.git` | `git remote -v` |
| Local branch / commit under review | `sprint-2c-c3-explicit-scripture-handoff` @ `09626367d1fd586b83b807a15c078507fbdd8aa1`, working tree dirty (167 changed files, none committed) | `git status`, `git log` |
| Pushed remote branches | `main` (`2a18ffdd405ce30ce0e2022e7fa57708405660de`), `sprint-2c-c3-explicit-scripture-handoff` (`09626367...` — matches local HEAD exactly, i.e. **the branch itself is pushed, but the 167 uncommitted working-tree changes are not**), plus `codex/living-os-aggregator`, `hotfix/phase5q-response-revision-20260623210636`, `sprint1-conversation-foundation` | `git ls-remote origin` |
| Relationship between `main` and our verified commit | **Diverged, not an ancestor.** `main` has 5 commits not on our branch; our branch has 13 commits not on `main`. `main`'s last commit is dated 2026-06-25, three weeks before this verification. | `git merge-base --is-ancestor`, `git rev-list --count` both directions |
| Render build command (`main`) | `npm install && npx prisma migrate deploy` — **the exact broken command previously identified and removed in Phase 6F Part 15** (no `prisma` dependency, no `prisma/migrations/` directory exists anywhere in the repo) | `git show origin/main:render.yaml` |
| Render build command (`sprint-2c-c3-explicit-scripture-handoff`, as **committed**) | Also `npm install && npx prisma migrate deploy` — **the fix exists only in the local uncommitted working tree, not in any commit, not on any pushed branch** | `git show 09626367...:render.yaml` |
| Render build command (local uncommitted working tree) | `npm install` (fixed) | File read; `git status --short render.yaml` confirms this file is modified-uncommitted |
| Deployment pipeline status | `render.yaml` sets `autoDeploy: true` on every branch checked, but **any fresh build triggered from either pushed branch today would fail** at the `prisma migrate deploy` step, since no branch on GitHub has the fix | Direct inspection of build command on both pushed branches |
| Which branch Render's dashboard is actually configured to track | **Not Yet Verified** — no Render API key, service ID, or dashboard access exists in this environment (`.env` contains only `OPENAI_API_KEY` and `OPENAI_MODEL`; no `RENDER_*` variable anywhere in the repo) | `grep` for Render credentials — none found |
| Whether the live host is running current verified code | **No — proven false by two independent live tests** (see Part 2, "Deployment Status") | Live `curl` tests, detailed below |
| Production environment configuration (as declared in repo) | `NODE_ENV=production`, `BUDDY_RUNTIME=legacy`, `BUDDY_TEMPLATE_PROSE=0`, `BUDDY_DISABLE_STUDY_FALLBACK=1`, `BUDDY_DEBUG=0`, `BUDDY_LIVE_TRACE=0`, `PHASE_AUTOSTART=1`, `AI_DEPLOYMENT_AGENT=enabled` | `render.yaml` |
| Environment variables requiring dashboard-managed secrets | `OPENAI_API_KEY`, `DATABASE_URL`, `RESEND_API_KEY`, `TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_FROM` (all `sync: false` in `render.yaml`, meaning their actual values live only in Render's dashboard, not the repo) | `render.yaml` |
| Whether those dashboard-managed secret values are correct/current | **Not Yet Verified** — no dashboard access; cannot confirm without Render credentials | — |
| Current build identity (repository) | Commit `09626367d1fd586b83b807a15c078507fbdd8aa1` + 167 uncommitted changes | `git log`, `git status` |
| Current build identity (live host) | **Not Yet Verified precisely** — no commit/build-identifying header or endpoint exists on the live service (checked response headers: only a per-request `rndr-id` trace ID, not a deploy ID) | `curl -I` |
| Current application version string | `v122.14.0 (platform unification foundation)` — identical across `main`, the committed local branch, the uncommitted working tree, **and** the live `/health` response. This string has not changed across any of these points, so it cannot be used to disambiguate which commit is live. | `grep APP_VERSION` on all three refs + live `/health` |
| `package.json` version field | `v122.12` (drifted from the `APP_VERSION` string above — a pre-existing, documented, cosmetic inconsistency) | `node -e "require('./package.json').version"` |
| Architecture freeze status | **Confirmed**, at commit `09626367d1fd586b83b807a15c078507fbdd8aa1`, scope = Founder Alpha testing phase (Phases 4–6G), per `docs/alpha/ArchitectureFreezeDeclaration.md` and `docs/alpha/architecture/ArchitectureFreeze.md` | File read (unchanged since last verified) |

---

## PART 2 — Founder Deployment Summary

**Every field below is either a verified value or explicitly marked "Not Yet Verified" with the reason and the exact action required. No placeholders.**

### Deployment Target
Render (web service, `env: node`, `plan: standard`), per `render.yaml`. Confirmed live at `bible-buddy-monorepo-enterprise-v122-7.onrender.com`.

### Founder Testing URL
**Not Yet Verified as a valid Founder-facing URL for the reviewed build.**
- The hostname `https://bible-buddy-monorepo-enterprise-v122-7.onrender.com` is live and responds to `GET /` and `GET /health` with 200.
- However, this is **proven** (not assumed) to be running older code than the build verified in the FINAL GATE and Final Release Review batches:
  1. `GET /admin/bible-authority.html` on this host returns **404** — the Admin console is not present in whatever is currently deployed.
  2. A `POST /buddy/chat` with a 50,000-character message returned **200** in 6.8 seconds (with a real OpenAI-generated reply) instead of the fast, clean **400** our verified fix produces. This proves the security fix from the FINAL GATE batch (`routes/buddy.js`, uncommitted) is not present on this host.
- **Exact action required before this URL can be called the Founder Testing URL for the reviewed build:** (1) commit the working tree, (2) get that commit onto whichever branch Render's dashboard is configured to auto-deploy from (not yet known — see below), (3) confirm the build succeeds (the current `prisma migrate deploy` build command on every pushed branch would fail; this is fixed only in the uncommitted working tree), (4) re-verify `/health`, the Admin console path, and the message-length fix live after deploy.

### Admin Dashboard URL
**Not Yet Verified.** Would be `https://<verified-deployed-host>/admin/bible-authority.html`, but the currently-live host returns 404 for this path (see above). Cannot be confirmed until a deploy of the reviewed build succeeds and this path is re-checked live.

### Lesson Alignment URL
**Not Yet Verified as a standalone URL — and likely N/A as a separate URL by design.** In the reviewed build, Scripture Alignment is a section embedded in the main page (`public/index.html`), not a separate route. The correct value once deployed would be the same Founder Testing URL, scrolled to that section — not a distinct URL. Cannot confirm the embedded section is even present on the currently-live host without a fresh deploy and re-check.

### Health Endpoint
**Partially verified.** `https://bible-buddy-monorepo-enterprise-v122-7.onrender.com/health` returns 200 live, right now. What is **not** verified is whether this health check reflects the reviewed build (see Deployment Status below) — it reflects whatever is currently deployed, which is confirmed older code.

### Production Environment
Declared in `render.yaml` (see Part 1 table). **Not Yet Verified against Render's actual dashboard configuration** — no API/dashboard access exists in this environment to confirm the live service's real environment variables match the repo's `render.yaml`, especially since the live host's actual deployed commit is unknown and may predate the current `render.yaml` entirely.

### Deployment Status
**DEPLOYMENT_ACTION_REQUIRED.** The live host is confirmed to be running a build that predates:
- The FINAL GATE security fix (unbounded chat-message length).
- Whatever version of the Admin console currently exists in the reviewed build (404 on the live host).

No branch pushed to GitHub — including `main` and the committed state of `sprint-2c-c3-explicit-scripture-handoff` — contains the render.yaml build-command fix; that fix exists **only** in the local, uncommitted working tree in this environment.

### Current Build
Repository: commit `09626367d1fd586b83b807a15c078507fbdd8aa1` on `sprint-2c-c3-explicit-scripture-handoff`, plus 167 uncommitted changes (the actual reviewed/verified state).
Live host: **Not Yet Verified** which exact commit — proven older than the reviewed build, exact identity unknown without Render dashboard access.

### Application Version
`v122.14.0 (platform unification foundation)` per `APP_VERSION` in `server.js` — identical string on the repo (all refs checked) and the live host's `/health` response. This string is not useful for pinpointing the live commit (see Part 1). `package.json` separately reports `v122.12` (documented, cosmetic drift).

### Architecture Freeze Status
**Confirmed**, unaffected by deployment status. Freeze point = commit `09626367d1fd586b83b807a15c078507fbdd8aa1`. This is a repository/documentation fact, independent of what is currently live on Render.

### Founder Baseline Status
**Not Confirmed / Not Created.** No commit, tag, or branch has been created for a baseline at any point in this engagement. This directly corrects the "Founder Baseline: Confirmed" line in the deployment-summary template you shared earlier — that was not accurate then and remains not accurate now.

### Authentication Status
No Founder-facing user-login system exists in the reviewed build (verified during the FINAL GATE security review — by design, not a gap). The Admin console has an optional environment-token gate (`BIBLE_AUTHORITY_ADMIN_TOKEN` / `ALPHA_ADMIN_TOKEN` / `BETA_REVIEW_TOKEN`), unconfigured in `render.yaml` on every branch checked. This is moot on the currently-live host regardless, since that host doesn't serve the Admin console path at all (404).

### Feature Flags Enabled
No formal feature-flag system exists (documented since Phase 6F). The only toggles are the environment variables in `render.yaml`'s `envVars` block (see Part 1). **Not Yet Verified** whether Render's dashboard has different values configured than the repo file, since dashboard access is unavailable and the live host's actual deployed commit/config is unknown.

### Known Operational Prerequisites
1. Commit the 167-file working tree (nothing can be deployed, tagged, or baselined without this).
2. Determine which branch Render's dashboard is actually configured to auto-deploy from (`main` vs. the sprint branch vs. something else) — requires Render dashboard/API access not available in this environment.
3. Get the render.yaml build-command fix (`npm install`, no `prisma migrate deploy`) onto that branch — it does not exist on any pushed branch today.
4. Trigger and confirm a successful deploy.
5. Re-verify `/health`, `/admin/bible-authority.html`, and the message-length security fix live, post-deploy, before calling any URL a "Founder Testing URL."
6. Confirm Render's dashboard-managed secret values (`OPENAI_API_KEY`, etc.) are current and correct — not verifiable from this repo-only environment.

---

## PART 3 — Deployment Gap Analysis

| # | Item | Current State | Required State | Reason | Exact Action Required | Blocking? |
|---|---|---|---|---|---|---|
| 1 | Working tree commit | 167 files uncommitted | Committed | A baseline/deploy needs a real commit to point at | `git add -A && git commit` (requires your explicit approval — not done in this batch) | **YES** |
| 2 | Render build command on any pushed branch | `npm install && npx prisma migrate deploy` (broken — no prisma dependency, no migrations dir) on both `main` and the committed `sprint-2c-c3-explicit-scripture-handoff` | `npm install` only (already fixed, but only in the uncommitted working tree) | A fresh deploy attempt from GitHub today would fail at the build step on either pushed branch | Commit and push the fixed `render.yaml` to whichever branch Render deploys from | **YES** |
| 3 | Branch divergence (`main` vs. verified branch) | Diverged: 5 commits on `main` not on our branch, 13 commits on our branch not on `main` | Reconciled — Render must deploy from a branch that contains all verified work | Not clear which branch Render's dashboard actually tracks | Determine Render's configured branch (dashboard access required); merge or fast-forward as appropriate once known | **YES** |
| 4 | Live host build identity | Confirmed older than reviewed build (404 on Admin console path; message-length fix absent) | Running the reviewed, committed build | Founders must not be invited to a stale build | Deploy the committed, fixed build; re-verify live | **YES** |
| 5 | Render dashboard configuration (tracked branch, env var values, service settings) | Not Yet Verified | Confirmed to match `render.yaml` and required secrets | No Render API key or dashboard access exists in this environment | Obtain Render dashboard access, or have a human confirm settings directly | **YES** |
| 6 | Custom domain | None configured | N/A unless one is desired | No `domains:` block in `render.yaml` on any branch | None required unless you want a custom domain — optional, not a blocker for Founder Alpha | NO |
| 7 | SSL | Valid (Render-issued default cert) | Valid | Already satisfied on the current `.onrender.com` hostname | None | NO |
| 8 | Architecture freeze | Confirmed, unaffected by deployment gaps | Confirmed | Already satisfied | None | NO |
| 9 | Founder Alpha Baseline (commit/tag) | Not created | Created, once items 1–5 above are resolved and approved | Explicit stop condition from the prior review batch; requires your approval | Await your explicit approval, then commit/tag as approved | **YES** (procedurally — awaiting approval, not a technical defect) |

**There are 6 blocking items (1–5, 9). This is NOT zero blockers, so `DEPLOYMENT READY` cannot be stated.**

---

## PART 4 — Baseline Readiness

**Determination: NO — the Founder Alpha Baseline may not yet be created.**

Blockers, with supporting evidence (all verified live/in-repo, none assumed):

1. **No commit exists to baseline.** `git status` shows 167 uncommitted changes on top of `09626367d1fd586b83b807a15c078507fbdd8aa1`. A baseline tag with nothing committed would point at incomplete/ambiguous state.
2. **No pushed branch has a working build command.** Verified via `git show <ref>:render.yaml` on both `main` and the committed `sprint-2c-c3-explicit-scripture-handoff` — both still contain `npx prisma migrate deploy`, which is a guaranteed build failure (no `prisma` dependency; confirmed via `package.json`; no `prisma/migrations/` directory anywhere in the repo).
3. **The only live, reachable deployment is proven to be running older code**, independently confirmed two ways: a 404 on the Admin console path, and a 200 (not the fixed 400) plus a 6.8-second processing time on an oversized chat message that should have been rejected in ~50ms.
4. **Render's actual dashboard configuration (tracked branch, secret values) cannot be verified** from this environment — no API key, service ID, or dashboard access is available.

Because the repository, the deployment pipeline, and the live host are three different, unreconciled states right now, creating a "Founder Alpha Baseline" today would tag/label something that does not correspond to any real, reachable, Founder-usable deployment.

---

## Recommendation

1. Do not create the baseline yet.
2. Resolve blockers 1–5 from the gap analysis, in order: commit → confirm/fix the branch Render actually tracks → push → deploy → re-verify live.
3. Once a live deploy is confirmed (via the same two tests used here — Admin console path and the message-length fix — both returning the expected verified-build behavior), re-run this deployment verification batch to produce accurate, non-"Not Yet Verified" values for the Founder Deployment Summary.
4. Only then revisit baseline creation, with your explicit approval.

## Final Status

**DEPLOYMENT_ACTION_REQUIRED**
