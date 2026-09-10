# GOAL-BB-ISSUE11 — Testing Readiness Evidence Baseline

Date: 2026-09-10
Baseline default-branch commit: `1b4609a8549c0b5fed659f18b97573cda2497095`
Issue: #11 — Testing Readiness Build — Admin Dashboard, Resource Upload, OCR, Retrieval, and Human Review
Status: SYSTEM WORK IN PROGRESS

## Purpose

Reconcile the May 21, 2026 Issue #11 specification against the current repository before adding code. This evidence packet prevents duplicate infrastructure and preserves the existing human-review/source-governance boundary.

## Acceptance criteria from Issue #11

1. Render boots.
2. Admin can open testing dashboard.
3. Testers can submit feedback.
4. Admin can view summary metrics.
5. Resource review plan is visible.
6. Uploaded resource metadata can be recorded.
7. Nothing is ingested into knowledge systems without human approval.
8. All new routes fail soft.

## Current direct evidence

### Existing review service — VERIFIED PRESENT

`services/resourceIngestionReview.js` exists on the baseline. It defines the resource-review plan, required/optional metadata, alignment severity, admin review packet, tester/admin signals and moderation rules. Its workflow explicitly places `admin_or_reviewer_review` and `approval_or_rejection` before `future_knowledge_ingestion`. Its moderation rules include `Do not auto-publish unreviewed materials.` and `Require human approval before knowledge ingestion.`

This is the current known-good governance seam. New Issue #11 work must reuse it rather than create a parallel review policy.

### Resource Review API — VERIFIED MISSING AT ISSUE-SPECIFIED PATH

`routes/resourceReview.js` returns Not Found on the baseline.

Therefore the Issue #11-specified endpoints are not currently implemented at that path:
- `GET /admin/resources/review-plan`
- `POST /admin/resources/submit`
- `POST /admin/resources/review-note`

This is path-specific evidence, not a claim that no equivalent functionality exists elsewhere. Equivalent current routes must still be cross-checked before implementation.

### Resource Upload UI — VERIFIED MISSING AT ISSUE-SPECIFIED PATH

`admin/resources.html` returns Not Found on the baseline.

This is path-specific evidence only. Existing admin surfaces must be checked for equivalent functionality before adding this page.

### Testing Dashboard UI — VERIFIED MISSING AT ISSUE-SPECIFIED PATH

`admin/testing.html` returns Not Found on the baseline.

### Quality Metrics route — VERIFIED MISSING AT ISSUE-SPECIFIED PATH

`routes/qualityMetrics.js` returns Not Found on the baseline.

Current metrics must be crosswalked against the newer Admin Command Center/runtime-health/feedback architecture before creating any replacement route.

### Admin Command Center aggregator — VERIFIED PRESENT

`services/adminCommandCenterAggregator.js` is present on the baseline. It is therefore the first current architecture owner to inspect for Issue #11 metric equivalence rather than assuming the May `qualityMetrics.js` design remains authoritative.

### OCR/transcript pipeline — ISSUE-SPECIFIED PATH VERIFIED MISSING

`services/ocrTranscriptPipeline.js` returns Not Found on the baseline.

This does not prove extraction is absent repository-wide. The next step is to inspect current services/routes for OCR, PDF/text extraction, transcript processing, provider adapters, or ingestion helpers before building the provider-neutral seam.

### Server routing — VERIFIED CURRENT MOUNT SET DOES NOT INCLUDE ISSUE-SPECIFIED ROUTES

`server.js` defines a fail-soft `mountRoute(label, mountPath, requirePath)` helper and mounts current routes including AI tester, Analyze, Admin assistant, Buddy, Runtime health, Content helper, Realtime voice, health/learning/founder-experience, Beta, Alpha, platform-unification, Bible Authority and User Assistance routes.

At the baseline inspected, `server.js` does not mount `./routes/resourceReview` or `./routes/qualityMetrics`. It also statically serves the `admin` directory at `/admin`, so a future `admin/resources.html` or `admin/testing.html` can fit the existing static-admin architecture without a new static serving mechanism.

## Issue #11 architecture decision — CURRENT

Do not implement the May issue literally yet. The current architecture has materially advanced since the issue was written. The smallest justified correction must:

1. Reuse `services/resourceIngestionReview.js` as the existing human-review/governance seam.
2. Crosswalk the existing Admin Command Center/runtime-health/feedback owners before adding metrics infrastructure.
3. Search for equivalent current resource review/upload and extraction capability before creating missing Issue-specified files.
4. If no equivalent resource endpoints exist, add the minimum route layer behind existing admin authentication and fail-soft `mountRoute` behavior.
5. Keep all ingestion locked behind explicit human approval.

## Targeted test definitions

### Targeted test #1 — Human-review gate / resource metadata

Expected behavior: a resource submission can record metadata and enter a review state, but cannot enter any knowledge/retrieval system without explicit human approval.

Pass evidence required:
- exact route/handler used;
- metadata persistence result;
- review status before approval;
- attempted unapproved ingestion is rejected/blocked;
- approved transition is separately evidenced;
- no doctrine/source guardrail is bypassed.

Current result: NOT RUN — executable route is not yet proven/implemented.

### Targeted test #2 — Metrics equivalence / no duplicate stack

Expected behavior: Issue #11 testing signals are sourced from current metrics/feedback infrastructure where already available, and only genuinely absent signals receive new implementation.

Signals to crosswalk:
- session count;
- latency;
- error count;
- helpfulness;
- felt understood;
- felt peaceful;
- balance/pacing feedback;
- resource review queue;
- admin recommendations.

Current result: NOT RUN — current aggregator and backing stores still need field-level tracing.

## OCR/extraction acceptance test definition

If an extraction adapter is required, it must be provider-neutral and must output only a review candidate. Extraction output must never auto-promote into approved retrieval/knowledge stores. Tests must cover unsupported file type, provider failure, empty extraction, metadata preservation, review-lock preservation and successful extraction-to-pending-review flow.

Current result: NOT RUN — repository-wide equivalent-capability trace remains incomplete.

## Risk / rollback

Risk level for this artifact: LOW. Documentation-only, non-production branch, no runtime behavior changed.
Rollback: delete the branch or file. Default branch remains untouched.

## Verified failures/corrections this cycle

- A prior recursive-tree SHA was initially treated as if it were a commit SHA. GitHub correctly returned `No commit found for the ref`. Correction: re-read `main`; `1b4609a...` is the commit SHA and `df2a842...` is its tree SHA. All subsequent file reads use the commit SHA.
- Earlier empty code-search results were insufficient to prove absence. Correction: direct path reads and current `server.js` inspection are now the evidence standard for Issue-specified paths.

## Next executable Issue #11 actions

1. Trace `services/adminCommandCenterAggregator.js` to each backing metric/feedback owner and complete the signal crosswalk.
2. Inspect current route/service/admin inventories for equivalent resource upload/review capability before adding `routes/resourceReview.js` or admin UI.
3. Inspect current services/routes for OCR/PDF/transcript/extraction capability before deciding whether the provider-neutral adapter is necessary.
4. Once equivalent capability is ruled out, implement the smallest missing route/test seam on this branch and run/obtain targeted test evidence.

Founder gate: NONE. No production merge/deploy, paid service, credential, permission, doctrine-source promotion, or external commitment is required for the next actions.
