# GOAL-BB-ISSUE11 — Metric / Feedback Crosswalk

Baseline: `1b4609a8549c0b5fed659f18b97573cda2497095`
Scope: Issue #11 testing signals only. No new metrics stack is authorized by this document.

| Issue #11 signal | Current owner/evidence | Status | Decision |
|---|---|---|---|
| session count | `services/adminCommandCenterAggregator.js` → `buildUsersAndSessionsSection()` exposes `activeSessions`, `alphaActiveTesters`, `alphaSessionsToday` from `runtimeHealthMonitor` | VERIFIED PRESENT | Reuse current aggregator/runtime health. Do not recreate. |
| latency | `buildSystemHealthSection()` exposes `averageLatencyMs`, `maxLatencyMs`; users/sessions also exposes `alphaAverageLatency` | VERIFIED PRESENT | Reuse. |
| error count | `buildSystemHealthSection()` exposes `failedRequests: snap.errors`, `timeouts`, `recentErrors` | VERIFIED PRESENT | Reuse. |
| helpfulness | `routes/alphaTest.js` already POSTs `/api/alpha/feedback`; `services/alphaFeedbackCapture.js` accepts `helpful` / `not_helpful`, persists JSONL and dual-writes durable projection | VERIFIED PRESENT CAPTURE; SUMMARY GAP UNVERIFIED | Reuse capture. Determine whether current Admin surfaces summarize helpful/not-helpful before adding aggregation. |
| felt understood | Current feedback supports `didnt_listen` and `felt_supportive`, but no direct `felt_understood` dimension was found in the inspected feedback contract | PARTIAL / GAP CANDIDATE | Do not equate proxy tags with the required signal. Search other feedback owners; add only if no direct dimension exists. |
| felt peaceful | No direct `felt_peaceful` dimension was found in the inspected `alphaFeedbackCapture` contract | GAP CANDIDATE | Search other current feedback owners before adding. |
| balance / pacing feedback | No direct balance/pacing tag was found in the inspected feedback contract | GAP CANDIDATE | Search current feedback/experience stores before adding. |
| resource review queue | Existing `resourceIngestionReview.js` defines review workflow/signals, while Admin aggregator exposes other queues (`supportGraphCandidateQueue`, decision queue); no resource-specific persisted queue has yet been proven | UNVERIFIED / LIKELY GAP | Trace equivalent resource persistence before implementation. Do not reuse an unrelated queue by name alone. |
| admin recommendations | `buildFounderIntelligenceSection()` exposes recommendation counts; `buildRecommendationsSection()` exposes `adminDecisionQueue` open items and top items | VERIFIED PRESENT | Reuse current Admin Command Center recommendation/decision infrastructure. |

## Feedback route and persistence evidence

`server.js` mounts `routes/alphaTest.js` at `/api/alpha`. `routes/alphaTest.js` exposes `POST /feedback`, producing the live route `POST /api/alpha/feedback`.

`services/alphaFeedbackCapture.js` validates tags, records rating/comment/session/message metadata, writes `data/alpha-feedback.jsonl`, dual-writes into `founderExperienceDurableStore`, hydrates from durable storage after redeploy when needed, and calls `runtimeHealthMonitor.recordAlphaFeedback()`.

The module explicitly states feedback is evidence only and does not mutate doctrine, activate knowledge, or approve learning. This is compatible with Issue #11 source/doctrine protection and should be extended rather than replaced.

## Current architecture conclusion

Issue #11's proposed standalone `routes/qualityMetrics.js` should NOT be created as a parallel metrics system unless a later executable trace proves a route compatibility need. Session, latency, errors, feedback capture and admin recommendations already have current owners. The remaining work is field-level gap closure for understood/peaceful/balance-pacing, a resource-specific review queue/persistence path, and Admin summary exposure where existing capture is not summarized.

## Targeted test #2 revised acceptance

1. Existing session/latency/error/recommendation fields resolve from current owners without duplicate computation.
2. Helpful/not-helpful capture survives persistence and is visible to an Admin summary owner.
3. Felt-understood, felt-peaceful and balance/pacing are either directly mapped to an existing canonical field or explicitly implemented as new backward-compatible dimensions.
4. Resource review queue is sourced from the actual resource review persistence owner, not an unrelated queue.
5. Failure of any one optional metric source degrades/fails soft rather than crashing the full Admin Command Center.

Status: PARTIALLY VERIFIED — existing owners directly proven; remaining candidate gaps require repository-wide equivalent-owner trace and executable tests.
