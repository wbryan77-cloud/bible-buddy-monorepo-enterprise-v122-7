# BibleBuddy Founder Alpha — Admin Quick Reference

**As of:** 2026-07-20 (Founder Alpha Deployment Activation batch)

## URLs

| | URL | Status |
|---|---|---|
| Founder Testing URL | `https://bible-buddy-monorepo-enterprise-v122-7.onrender.com` (candidate — pending redeploy verification) | NOT VERIFIED — see below |
| Admin Dashboard URL | `<Founder Testing URL>/admin/bible-authority.html` | NOT VERIFIED (404 on current live host) |
| Lesson Alignment | Integrated in the Founder App (paste-text tool) + Admin review at `/admin/api/bible-authority/lesson-alignment/submissions` | NOT VERIFIED on live host |
| Health Endpoint | `<Founder Testing URL>/health` | Reachable; missing new `releaseCommit` field until redeployed |

## Release Identity

- **Baseline commit:** `d34d9f0f95c7cba8300221c4c70b6e89d0f48d18`
- **Baseline tag:** `founder-alpha-v1.0.0`
- **Current branch tip (recommended deploy target):** `e1fd8977d76b34def53fd8cb45babf01b5b8f79b`
- **Deployed branch:** `sprint-2c-c3-explicit-scripture-handoff`
- **Render service:** NOT VERIFIED (no dashboard access this batch — see
  `Part5-RenderConfiguration.md` for exact manual steps)
- **Current live-deployed version:** NOT the baseline — live host is confirmed running an older,
  pre-Phase-6 build (Part 7 finding). Redeploy required.

## Deploying / Redeploying (No Render Access Available to This Batch)

Follow `Part5-RenderConfiguration.md` §3 exactly. In summary: confirm branch
`sprint-2c-c3-explicit-scripture-handoff`, build command `npm install`, start command
`node server.js`, health check `/health`, set `BIBLE_AUTHORITY_ADMIN_TOKEN` (secret), then trigger
a manual deploy of the latest commit.

## How to Verify What Commit Is Actually Live

Two methods, either sufficient:

1. `GET /admin/api/bible-authority/founder-console` → `build.commit` and `build.branch` (reads
   git HEAD directly; most reliable).
2. `GET /health` → `releaseCommit`/`releaseBranch` (populated from Render's own
   `RENDER_GIT_COMMIT`/`RENDER_GIT_BRANCH` — added in this batch; will be `null` until the
   redeploy happens, since Render injects these only on its own deploys).

## How to View Sessions

`GET /admin/api/bible-authority/founder-console` and `GET /api/runtime-health` — aggregate session
counts (`alphaActiveTesters`, `alphaSessionsToday`). For individual session/transcript review, use
the existing Beta review console (`GET /api/beta/review`, `GET /api/beta/review/session/:sessionId`
— pre-existing from prior phases).

## How to View Errors

`GET /api/runtime-health` → `errors`, `recentErrors` (last 20, truncated, no full message body),
`recentTimeouts`, `recentFallbacks`.

## How to View Lineage

Each `/buddy/chat` response includes `primaryWitness`, `supportingWitnesses`, `crossReferences`,
and `coreDebug`/`answerLineage` fields directly in the response body — visible in the Founder App
itself under the answer, and reviewable per-session via the Beta review console above.

## How to View IOG/ICOJ Status

`GET /admin/api/bible-authority/knowledge-coverage-dashboard` — includes IOG/ICOJ ingestion and
approval status alongside other knowledge-coverage metrics.

## How to View Lesson Alignment Activity

`GET /admin/api/bible-authority/lesson-alignment/submissions` (once live/redeployed) — recent
submissions with detected claims and match/no-match results. Also rendered in the "Founder
Readiness" tab of `admin/bible-authority.html`.

## How to Review Feedback

`GET /api/alpha/feedback` (or the tag-aggregated view inside
`GET /admin/api/bible-authority/founder-console` / the legacy `routes/alphaAdmin.js` summary
endpoint) and `GET /api/beta/review` for Beta-channel feedback. No AI-generated digest exists
(Part 9 §3) — review raw tag counts and entries manually.

## How to View Founder Readiness

`GET /admin/api/bible-authority/founder-readiness-report` (JSON report; also rendered in the
"Founder Readiness" tab of `admin/bible-authority.html`), and the standalone command:
`npm run founder-alpha:validate` (writes a timestamped report under
`docs/alpha/founder-readiness/`).

## How to View System Health

`GET /admin/api/bible-authority/command-center`, `GET /api/runtime-health`, `GET /health` — memory
pressure, latency, error counts, provider (OpenAI/email/SMS) configuration status.

## How to Pause Telemetry

**Not currently supported by a dedicated switch.** The Founder Observation Layer
(`services/runtimeHealthMonitor.js` `recordFounderObservation`) is always-on aggregate counting
with no per-user profiling; there is no `FOUNDER_ALPHA_TELEMETRY` flag to disable it today (Part 9
§5). To stop it entirely would require a code change; this was judged unnecessary for Founder
Alpha since no personal content is stored in these counters.

## How to Disable Feature Flags

Feature disposition is read from `services/founderAdminConsoleStatus.js` and surfaced at
`/admin/api/bible-authority/founder-console`. There is no formal runtime feature-flag toggle UI —
flags are effectively controlled by environment variables (e.g., `BUDDY_DISABLE_STUDY_FALLBACK`)
and by code-level feature gating. To change a flag, set/change the relevant environment variable in
the Render dashboard and redeploy/restart; there is no in-app Admin toggle for this today.

## How to Roll Back the Deployment

1. In the Render dashboard, open the Deploys tab for the service.
2. Select the last known-good prior deploy (or manually deploy the previous commit/tag).
3. Alternatively, from the repository: `git checkout <previous-good-commit>` and manually trigger
   a deploy of that commit via the same Render manual-deploy mechanism used in Part 5.
4. The immutable tag `founder-alpha-v1.0.0` (commit `d34d9f0f95c7cba8300221c4c70b6e89d0f48d18`) is
   always available as a known-good rollback point for the application code itself.

## How to Identify the Deployed Commit

See "How to Verify What Commit Is Actually Live" above.

## How to Classify Tester Issues

Use `FounderAlphaIssueClassification.md` (from the prior Founder Alpha Final Release Review batch)
and the severity guide in `FounderAlphaFeedbackInstructions.md` (this batch). In short: Critical
(Scripture/doctrine accuracy, harmful guidance, data exposure) → High (core feature broken/very
slow) → Medium (confusing/minor inaccuracy) → Low (cosmetic).

## Daily Review Workflow (Suggested)

1. Check `GET /health` and `GET /api/runtime-health` for uptime, error counts, and memory
   pressure level.
2. Check `GET /api/alpha/feedback` / `GET /api/beta/review` for new feedback since yesterday.
3. Skim `recentErrors`/`recentFallbacks` for repeated patterns.
4. Respond to any Critical-severity report same day.

## Weekly Review Workflow (Suggested)

1. Run `npm run founder-alpha:validate` (or review the latest scheduled run) for a full readiness
   snapshot.
2. Review `observation.questionCategoryCounts` for common question categories and possible
   knowledge gaps.
3. Review average/max latency trends.
4. Review Lesson Alignment submissions for patterns in misquotation types.
5. Summarize the week's findings for the Founder team; decide on any repairs before the next
   release-operations batch.

## Secrets

Never store or paste secret values (e.g., `OPENAI_API_KEY`, `BIBLE_AUTHORITY_ADMIN_TOKEN`) into
this document, tickets, chat logs, or any committed file. Manage them exclusively through the
Render dashboard's Environment settings (marked `sync: false` in `render.yaml`, meaning Render
will prompt for a value without ever writing it into the repository).
