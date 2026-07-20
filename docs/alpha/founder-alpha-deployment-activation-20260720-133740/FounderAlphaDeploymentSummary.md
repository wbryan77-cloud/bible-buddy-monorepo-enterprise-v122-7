# Founder Alpha Deployment Summary

**Generated:** 2026-07-20T14:15Z
**Batch:** Founder Alpha Baseline, Deployment Activation, Live Verification, and Tester Access
Package

## Founder Testing URL

**NOT VERIFIED.** The only known public host is
`https://bible-buddy-monorepo-enterprise-v122-7.onrender.com`, which is reachable and returns
HTTP 200 on `/`, but is confirmed (Part 7) to still be running a pre-baseline build (missing the
oversized-message security guard, the Admin console, and the Lesson Alignment feature — all 404 or
absent). **Required action:** a human with Render dashboard access must perform the manual deploy
sequence in Part 5 (§3), then this URL must be re-verified using the Part 7 checklist before it can
be confirmed as the Founder Testing URL.

## Admin Dashboard URL

**NOT VERIFIED.** Expected path once deployed: `https://bible-buddy-monorepo-enterprise-v122-7.onrender.com/admin/bible-authority.html`
(confirmed to exist and function against the local verified build; confirmed to 404 against the
current live build). **Required action:** same as above, plus setting a real value for
`BIBLE_AUTHORITY_ADMIN_TOKEN` in the Render environment before this URL should be shared with
anyone (see Authentication Status below).

## Lesson Alignment URL

**NOT VERIFIED on live host.** Integrated in the Founder App itself as a paste-text tool (not a
separate URL) plus an Admin-only review surface at
`/admin/api/bible-authority/lesson-alignment/submissions`. Confirmed working locally; confirmed
404 on the current live build. **Required action:** same redeploy action as above.

## Health Endpoint

**Path verified; live values NOT fully verified.** `GET /health` on the public host currently
returns HTTP 200 with `{"health":{"ok":true,"version":"v122.14.0 (platform unification
foundation)", ...}}` but without the new `releaseCommit`/`releaseBranch` fields added in this
batch (Part 6), because the live host has not yet received this commit. Once redeployed on Render,
these fields are expected to populate automatically from Render's own `RENDER_GIT_COMMIT`/
`RENDER_GIT_BRANCH` env vars — this must be confirmed live, not assumed.

## Deployment Target

Render (web service), platform confirmed via `render.yaml` and the reachable
`*.onrender.com` public host. Exact Render service ID: **NOT VERIFIED** (no dashboard/API access
— see Part 5).

## Deployment Environment

`production` per `render.yaml` (`NODE_ENV: production`) and per the local production-mode
verification already completed in the prior FINAL GATE batch. **The live host's actual running
environment configuration is NOT independently re-verified in this batch** beyond the checks in
Part 7.

## Deployment Status

**NOT DEPLOYED (baseline not yet live).** The verified Founder Alpha baseline is committed, tagged,
and pushed to `origin/sprint-2c-c3-explicit-scripture-handoff` (see Release/Baseline fields below)
but has **not** been deployed to the live Render service — no deployment access was available to
this batch. **Required action:** Part 5 §3 manual sequence.

## Render Service

**NOT VERIFIED** — service name, ID, and exact settings are unknown without dashboard/API access
(Part 5). Public host slug: `bible-buddy-monorepo-enterprise-v122-7`.

## Tracked Branch

**NOT VERIFIED which branch the live Render service currently tracks.** The verified baseline
lives on `sprint-2c-c3-explicit-scripture-handoff`. **Recommended action:** confirm/set this in the
Render dashboard per Part 5 §3.

## Baseline Commit

`d34d9f0f95c7cba8300221c4c70b6e89d0f48d18` (the exact commit tagged `founder-alpha-v1.0.0`).
**Verified.** The branch tip is now one further small commit ahead
(`e1fd8977d76b34def53fd8cb45babf01b5b8f79b`, adding the `BIBLE_AUTHORITY_ADMIN_TOKEN` render.yaml
declaration and the safe build-identity health field) — deploying the branch tip rather than the
exact tag commit is recommended so those two small, verified fixes are included.

## Founder Baseline Tag

`founder-alpha-v1.0.0` — **created and pushed to origin.** Verified via
`git ls-remote --tags origin` (dereferences to `d34d9f0f95c7cba8300221c4c70b6e89d0f48d18`).

## Current Application Version

`v122.14.0 (platform unification foundation)` (`APP_VERSION` string in `server.js`) —
**this string did not change across the baseline commit** (it is not a per-release build number);
`package.json` `"version": "v122.12"` remains a separately-tracked, lower-precision string. This
version-string drift between `APP_VERSION` and `package.json.version` is a pre-existing,
already-documented cosmetic issue (not a defect blocking this release).

## Build Timestamp

Release commit `d34d9f0f95c7cba8300221c4c70b6e89d0f48d18` created at 2026-07-20T13:55Z (local
system clock, evidenced by `git log` timestamps in this batch's evidence folder). Tag
`founder-alpha-v1.0.0` created immediately after.

## Architecture Freeze Status

**Active and unchanged.** Freeze point commit `09626367d1fd586b83b807a15c078507fbdd8aa1`
(documented in `docs/alpha/ArchitectureFreezeDeclaration.md`, now committed as part of the
baseline). No architecture, doctrine, Scripture-authority, or companion-ownership change was made
in this batch — all changes were release-operations (git commit/tag/push), one deployment-config
declaration fix, and one additive, non-sensitive health-field addition.

## Founder Authentication Status

**Anonymous / session-based** (client-supplied `testerId`/`sessionId`, no login, no accounts). See
Part 8 for full detail. Acceptable for a 10–20 person invitation-only Founder cohort provided the
invitation itself is distributed privately (Part 11).

## Admin Authentication Status

**Token-gated mechanism exists in code (`checkAdminAuth()`), but no token value is currently
set** in the local verification environment, and Admin routes do not even exist yet on the live
host. **This is a release-blocking item** — a real value for `BIBLE_AUTHORITY_ADMIN_TOKEN` must be
set in the Render environment before any Founder invitation is sent, per Part 5/8/13.

## Feature Flags Enabled

Per the live (local) `founder-console` feature disposition matrix: Scripture chat, KJV reader,
witnesses/cross-references, original-language study, historical context, prayer, therapeutic
companion, and companion memory are all `ON_FOR_FOUNDER_ALPHA`. Lesson Alignment (paste-text) is
`ADMIN_ONLY`. File upload, voice, audio Bible, and avatar/orb-presence-as-a-toggleable-feature are
`FEATURE_FLAG_OFF`. Reading plan, daily verse, and notes/highlights/bookmarks are `TESTER_ONLY`.
(Full matrix: `services/founderAdminConsoleStatus.js`, surfaced at
`/admin/api/bible-authority/founder-console`.)

## Telemetry Enabled

**Yes — aggregate, privacy-respecting, already implemented (Phase 6H Founder Observation Layer)
plus explicit feedback endpoints.** Full inventory in Part 9. No new telemetry was added in this
batch. No keystroke/password/unrelated-content capture exists.

## Telemetry Consent Status

Disclosed in the existing Founder Alpha Testing Guide / Known Warnings documentation set (already
part of the committed baseline). No separate in-app consent modal exists for the telemetry layer
specifically — the Privacy Notice produced in Part 11 of this batch is the primary vehicle for
disclosure to testers before/at first use.

## Admin Monitoring Capabilities

Raw-data visibility into sessions, errors, latency, feature usage, feedback tags, Lesson Alignment
submissions, and knowledge/provider health — all confirmed working locally (Part 9). No automated
AI/digest summarization layer exists (`NOT_IMPLEMENTED`, Part 9 §3) — Admin must read raw
counts/lists manually.

## Known Operational Warnings

1. `admin_auth_boundary` — Admin token not yet set (release blocker until set).
2. `admin_dashboard_latency` — `command-center` endpoint ~6.1s (offline snapshot aggregation, not
   hot-path; non-blocking).
3. Intermittent non-deterministic OpenAI-authored-answer flakiness on 1-2 specific ad hoc test
   phrasings (documented previously in `FounderAlphaKnownWarnings.md` §8, reconfirmed on a new
   case in this batch's Part 2 §3; not a routing regression, always resolves correctly on retry).
4. `APP_VERSION`/`package.json.version` drift (cosmetic).
5. Single-instance, file-based persistence — no horizontal scaling (pre-existing, documented
   architecture limitation, acceptable for a 10-20 person Founder Alpha).
6. **Live deployment gap** — the public host does not yet run the verified baseline (this
   batch's primary open item; see Deployment Status above).

## Testing Period Recommendation

**14 days**, consistent with the batch's default recommendation and no override having been given
by the user.

## Support/Feedback Contact

**NOT VERIFIED — no dedicated support email/contact address exists in the repository or prior
documentation reviewed in this batch.** In-app feedback (`POST /api/alpha/feedback` /
`POST /api/beta/feedback`) is the only currently-implemented feedback channel. **Required action:**
the human release owner should decide on and supply a contact address before Part 11's tester
communications are actually sent (the drafts in Part 11 use a clearly-marked placeholder for this
reason).
