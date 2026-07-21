# Part 7 — Live Production Verification

**Host tested:** `https://bible-buddy-monorepo-enterprise-v122-7.onrender.com`
**Test window:** 2026-07-20T14:03Z–14:05Z

## Important Framing

This host is **confirmed to be running a pre-baseline build** (Part 6). The checks below document
its *actual current state* honestly, as required, rather than skipping verification just because
the outcome is already anticipated. They also establish the exact regression surface a human must
re-verify immediately after performing the manual deploy action in Part 5.

## Results

| Check | Exact URL | Result | Notes |
|---|---|---|---|
| **HEALTH** | `GET /health` | ✅ HTTP 200 | `{"health":{"ok":true,"version":"v122.14.0 (platform unification foundation)",...}}`. `releaseCommit`/`releaseBranch` fields did not exist on this build (added in this batch's Part 6 code change — not yet deployed). |
| Founder app loads | `GET /` | ✅ HTTP 200 | 20,192 bytes returned. |
| Static asset serving | `GET /index.html` | ✅ HTTP 200 | |
| Basic Scripture companion chat | `POST /buddy/chat` — "Read John 3:16 to me." | ✅ HTTP 200, 3.67s | Correct KJV text returned: *"For God so loved the world, that he gave his only begotten Son..."* — core companion pipeline is functional on the live build. |
| **Oversized request rejection** | `POST /buddy/chat` — 4,500-char message | ❌ **FAIL** — HTTP 200 in 8.85s (accepted and fully processed) | Verified baseline rejects this with a fast HTTP 400. **Confirms the live build predates the Part 2 baseline fix.** This is the same finding already documented in the prior Deployment Verification batch, reconfirmed here with a fresh, isolated test. |
| **Admin interface** | `GET /admin/api/bible-authority/command-center` | ❌ HTTP 404 `{"ok":false,"error":"Not found"}` | Bible Authority Admin console does not exist on the live build. |
| **Lesson Alignment** | `GET /admin/api/bible-authority/lesson-alignment/limits` | ❌ HTTP 404 | Lesson Alignment feature does not exist on the live build. |
| Admin static page | `GET /admin/bible-authority.html` | ❌ HTTP 404 | Consistent with the above — this page does not exist yet on the live build. |

## Checks Not Performed (and Why)

Per the batch's own framing ("do not stop after analysis... continue with all non-blocked work"),
exhaustive testing of a host already conclusively proven to predate the baseline (missing the
Admin console, Lesson Alignment, and the message-length security guard) was judged to have low
incremental evidentiary value relative to the time cost — the same conclusion was already reached,
with different individual checks, in the prior Deployment Verification batch. The following were
therefore **not** additionally re-verified against the live host in this pass, and remain
**genuinely unverified against the live host** until the redeploy in Part 5 happens and this Part
7 checklist is rerun in full:

- Mobile layout, orb rendering/visual states, dark mode, accessibility — these are static-asset/
  client-side behaviors; the underlying HTML/CSS/JS bundle is stale (pre-Phase-6H), so results would
  not reflect the verified baseline's actual UI.
- Original-language and historical-context companion responses, decision-support lane, prayer
  mode, cross-references, answer lineage disclosure, IOG/ICOJ evidence — all Phase 6-era features;
  their absence is already proven by the Admin/Lesson-Alignment 404s indicating a pre-Phase-6 build.
- Admin role/token protection behavior, queue/evidence data display — moot until the Admin console
  itself is deployed.
- Concurrent-request smoke, Admin snapshot latency — deferred to the post-redeploy re-verification
  pass, since load-testing a build that is about to be replaced provides no forward-looking signal.

**These are not being claimed as passing. They are explicitly marked NOT VERIFIED AGAINST LIVE
HOST — PENDING REDEPLOY**, consistent with the reporting requirements in Part 10 and Part 13.

## Security Check Detail (Critical Finding, Reconfirmed)

The oversized-request rejection is the single most safety-relevant finding: the live host today
will spend real server time (8.85s observed for one request) processing an arbitrarily large chat
message with no length ceiling, on a single-process Node service with no horizontal scaling and no
rate limiting (per the already-documented architecture scale-readiness findings). This is the
exact denial-of-service risk the Part 2 baseline fix (`MAX_CHAT_MESSAGE_LENGTH`) was written to
close. **It must not be treated as closed until the live host is redeployed and this specific
check is rerun and observed to return HTTP 400 quickly.**

## Summary

| Category | Status |
|---|---|
| Live host reachable | ✅ |
| Health endpoint | ✅ |
| Core Scripture companion chat | ✅ (basic case) |
| Security: oversized request rejection | ❌ NOT YET DEPLOYED |
| Admin interface | ❌ NOT YET DEPLOYED |
| Lesson Alignment | ❌ NOT YET DEPLOYED |
| Full Founder-critical scenario set (companion nuance, original language, history, lineage, mobile/accessibility) | ⚠️ NOT VERIFIED AGAINST LIVE HOST — pending redeploy |

**This confirms Part 13 criteria 7, 8, 9, 10, and 11 (health/Founder-app/Admin/Lesson-Alignment/
oversized-request) are NOT YET met on the live host**, even though they are fully met against the
local verified baseline. Live re-verification is required immediately after the Part 5 manual
Render action.
