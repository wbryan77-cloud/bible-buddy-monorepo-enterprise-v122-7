# Issue #11 Testing Readiness Evidence

Goal ID: `GOAL-BB-ISSUE11`

This file is an evidence-first characterization record for GitHub Issue #11. It intentionally does not add production routes or weaken any source, doctrine, provenance, or human-review gate. Findings must be upgraded from **UNVERIFIED** to **VERIFIED** only with direct repository/runtime evidence.

## Known-good baseline

- Default branch observed at start of this evidence build: `main`
- Baseline commit: `1b4609a8549c0b5fed659f18b97573cda2497095`
- Baseline commit message is unrelated to Issue #11 (`Add governed grief and loss research candidates`), so it is treated as priority drift and not Issue #11 progress.
- Baseline tree reported by GitHub for that commit: `df2a842810a3bc29b7a58deddff3677e17567657`

## Original Issue #11 acceptance criteria

Issue #11 requires direct proof that:

1. Render boots.
2. Admin can open testing dashboard.
3. Testers can submit feedback.
4. Admin can view summary metrics.
5. Resource review plan is visible.
6. Uploaded resource metadata can be recorded.
7. Nothing is ingested into knowledge systems without human approval.
8. All new routes fail soft.

## Resource review trace

| Step | Current evidence | Status |
| --- | --- | --- |
| Review policy/service | `services/resourceIngestionReview.js` exists. It defines accepted resource types, required/optional metadata, review workflow, severity, admin-review packet, moderation rules, and explicitly requires human approval before knowledge ingestion. | VERIFIED (static) |
| Resource review route | Issue #11 names `routes/resourceReview.js`; direct fetch at the baseline returned 404. | VERIFIED ABSENT at named path |
| Resource upload/review UI | Issue #11 names `/admin/resources.html`; `public/admin/` does not exist and direct fetch of `public/admin/resources.html` returned 404. | VERIFIED ABSENT at named path |
| Newer equivalent route | Must inspect current route inventory/handlers for an equivalent review/submit flow before creating a route. | UNVERIFIED |
| Newer equivalent UI | Must inspect current admin/founder UI surfaces for equivalent upload/review controls before creating a UI. | UNVERIFIED |
| Persistence | Must trace where submitted resource metadata/review state would be stored. | UNVERIFIED |
| Human approve/reject transition | Service policy exists, but an executable state transition must be found and proven. | UNVERIFIED |
| Downstream ingestion lock | Service policy says `Require human approval before knowledge ingestion` and high-risk material is locked, but runtime enforcement downstream must be directly traced/tested. | UNVERIFIED |

### Service guardrails that must be preserved

`services/resourceIngestionReview.js` currently states, among other controls:

- do not auto-publish unreviewed materials;
- do not treat AI review as final authority;
- require human approval before knowledge ingestion;
- respect copyright and usage rights.

Any Issue #11 implementation must preserve those controls rather than introducing a parallel review authority.

## OCR / transcript extraction

- Issue #11 names `services/ocrTranscriptPipeline.js`.
- Direct fetch at the baseline returned 404.
- `services/resourceIngestionReview.js` contains the workflow marker `ocr_or_transcript_extraction_future` and marks future ingestion as `ocrReady` / `transcriptReady`; these are readiness declarations, not executable extraction proof.
- A repository-wide architectural trace is still required before declaring OCR/transcript extraction genuinely absent.

Status: **UNVERIFIED / named stub absent**.

## Issue #11 metrics crosswalk — first pass

Original Issue #11 signal | Existing current owner/evidence | First-pass status
--- | --- | ---
session count | `services/adminCommandCenterAggregator.js` → `buildUsersAndSessionsSection()` reads `runtimeHealthMonitor`; exposes `activeSessions`, `alphaActiveTesters`, `alphaSessionsToday` | PRESENT
latency | `buildSystemHealthSection()` exposes `averageLatencyMs`, `maxLatencyMs`; users/sessions also exposes `alphaAverageLatency` | PRESENT
error count | `buildSystemHealthSection()` exposes `failedRequests`, `timeouts`, `recentErrors` | PRESENT
helpfulness | Not proven in aggregator evidence inspected so far | GAP CANDIDATE — VERIFY FIRST
felt understood | Not proven in aggregator evidence inspected so far | GAP CANDIDATE — VERIFY FIRST
felt peaceful | Not proven in aggregator evidence inspected so far | GAP CANDIDATE — VERIFY FIRST
balance / pacing feedback | Not proven in aggregator evidence inspected so far | GAP CANDIDATE — VERIFY FIRST
resource review queue | Aggregator has an approvals `reviewQueue` backed by `supportGraphCandidateQueue`, but equivalence to uploaded-resource review has not been proven | PARTIAL / NON-EQUIVALENT UNTIL PROVEN
admin recommendations | `buildRecommendationsSection()` uses `adminDecisionQueue`; `buildFounderIntelligenceSection()` also reports recommendation totals | PRESENT

Important: this crosswalk is deliberately against the newer command-center architecture. Do not create `routes/qualityMetrics.js` or a duplicate metrics store merely because the old issue named one. Only genuine signal gaps should be added to current owners.

## Smallest next executable acceptance steps

1. Trace current route inventory and server registration for any resource/upload/review equivalent.
2. Trace current admin/founder UI navigation for any resource-review equivalent.
3. Identify persistence/state transition owner for resource metadata and human approval/rejection.
4. Trace downstream knowledge ingestion entry points and prove they cannot consume an unapproved resource.
5. Search current feedback/runtime-health owners for helpfulness, understood, peaceful, and balance/pacing before adding any metrics.
6. Search for actual OCR/transcript extraction implementation beyond the absent named stub.

## Test gates

No acceptance test is marked passed merely from this static characterization. Required sequence after architecture reconciliation remains:

- targeted test #1;
- targeted test #2;
- full regression;
- safe live acceptance verification where available;
- regression again;
- final evidence packet.

## Risk / rollback

Risk of this change: LOW. Documentation-only, non-production branch, no route/runtime/source/doctrine behavior changed.

Rollback: delete or abandon the branch. No production state is affected.
