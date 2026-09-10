# GOAL-BB-ISSUE11 — Testing Readiness Evidence

Date: 2026-09-10
Baseline default-branch commit: `1b4609a8549c0b5fed659f18b97573cda2497095`
Canonical branch: `issue-11-testing-readiness-recovery-20260910`
Issue: #11 — Testing Readiness Build — Admin Dashboard, Resource Upload, OCR, Retrieval, and Human Review
Status: SYSTEM WORK IN PROGRESS — DO NOT CLOSE

## Acceptance criteria

1. Render boots.
2. Admin can open testing dashboard.
3. Testers can submit feedback.
4. Admin can view summary metrics.
5. Resource review plan is visible.
6. Uploaded resource metadata can be recorded.
7. Nothing is ingested into knowledge systems without human approval.
8. All new routes fail soft.

## Directly verified Issue #11 progress

### Resource review governance

`services/resourceIngestionReview.js` remains the canonical human-review policy seam. It requires human approval before knowledge ingestion, prohibits auto-publishing unreviewed material, and keeps AI review advisory rather than authoritative.

### Resource review API and mounted application path

The canonical branch implements `routes/resourceReview.js` and mounts it through the existing fail-soft `mountRoute(...)` pattern at `/admin/resources`.

The route exposes only the Issue #11 review-intake surface:
- `GET /admin/resources/review-plan`
- `POST /admin/resources/submit`
- `POST /admin/resources/review-note`

Resource submissions enter `pending_human_review`, retain `human_review_required: true`, retain `approved_for_knowledge_ingestion: false`, and return `ingestion.allowed: false`. Review notes do not change approval state.

### Admin resource-review UI

`admin/resources.html` exists on the canonical branch and provides authenticated review-plan access, metadata submission, source/usage notes and review-note controls. The UI explicitly states that submission does not approve or ingest material into Bible Buddy knowledge systems.

### Resource review persistence

`services/resourceReviewDurableStore.js` reuses the repository's existing persistence adapter. The resource-review route awaits durable persistence before reporting success and returns a fail-closed error when durable persistence fails. JSONL remains only a local audit copy.

### OCR / transcript extraction

The baseline contained the Issue #11 future-extraction markers and `pdf-parse`, but no directly proven executable Issue #11 extraction owner. The canonical branch therefore adds the smallest provider-neutral `services/ocrTranscriptPipeline.js` seam. It outputs review candidates only and never approves knowledge ingestion. Targeted coverage includes unsupported type, parser/provider failure, empty extraction, metadata preservation and successful PDF/transcript extraction into pending human review.

### Metrics / feedback crosswalk

The current architecture already owns session count, latency, errors, helpfulness, pacing and Admin recommendations through the Alpha/Admin/runtime-health stack; no duplicate `qualityMetrics.js` stack was created. Direct `felt_understood` and `felt_peaceful` structured Alpha feedback signals were added to the existing canonical feedback owner, preserving the existing durable projection and without broadening public guest-feedback permissions.

## Executed acceptance evidence

### Resource-review mounted end-to-end acceptance — VERIFIED GREEN

Artifact: `tests/issue11MountedResourceReviewAcceptance.test.js`
Verified head: `a2e35f1e0621872b1ff1b1e803400cb90614ead4`
GitHub Actions CI run: `34531239770`
Result: **SUCCESS**

This acceptance test starts the actual `server.js` application rather than mounting the router in an isolated test app. It verifies:
- Admin resource-review UI is reachable;
- unauthenticated review API access fails with `401`;
- authenticated review-plan access succeeds;
- missing required metadata fails with `400`;
- a valid resource submission succeeds;
- submitted resource remains `pending_human_review`;
- `human_review_required` remains true;
- `approved_for_knowledge_ingestion` remains false;
- `ingestion.allowed` remains false;
- local audit persistence contains the submitted resource;
- durable review projection contains the same resource and preserves the no-ingestion state.

This upgrades the resource upload/review route/UI requirement from static or isolated evidence to **real application-mounted CI evidence**.

### Additional Issue #11 safeguards already present on canonical branch

- `tests/issue11ResourceReviewGuardrails.test.js`
- `scripts/issue11ResourceReviewTargetedTest.js`
- `tests/issue11ExtractionReviewGate.test.js`
- `tests/issue11MetricsOwnerCharacterization.test.js`
- `tests/issue11ResourceReviewNoIngestionPath.test.js`
- `tests/issue11ResourceReviewDurability.test.js`

These preserve human-review/no-auto-publish policy, auth and metadata validation, extraction review-lock behavior, metrics ownership/no-duplicate-stack behavior, no direct intake-to-ingestion path, and durable review-state behavior.

## Acceptance state ledger

| Issue #11 criterion | Current evidence state |
|---|---|
| Render boots | NOT YET VERIFIED by final safe live acceptance |
| Admin can open testing dashboard | Existing Alpha/Admin surfaces present; final live acceptance still required |
| Testers can submit feedback | Current Alpha feedback path present; targeted owner coverage exists; final live acceptance still required |
| Admin can view summary metrics | Current Admin/runtime owners crosswalked; final live acceptance still required |
| Resource review plan visible | **VERIFIED in actual mounted server acceptance CI** |
| Uploaded resource metadata can be recorded | **VERIFIED in actual mounted server acceptance CI** |
| Nothing ingested without human approval | **VERIFIED for Issue #11 intake/extraction boundary by route state, structural guardrails and mounted acceptance; final downstream/live acceptance remains required before closure** |
| All new routes fail soft | Resource route uses existing fail-soft mount pattern; final application regression/live acceptance still required |
| OCR/transcript review adapter | IMPLEMENTED + targeted guardrail coverage; final regression still required |
| Metrics gap closure | IMPLEMENTED in existing owner; final regression still required |
| Full regression | PENDING current-branch vs baseline triage |
| Safe live acceptance | PENDING |
| Final regression/evidence closeout | PENDING |

## Failures and corrections captured

- Duplicate Issue #11 PR lanes were detected; PR #13 is now the canonical lane and the duplicate PR was closed without merge.
- Earlier GitHub code-search absence was found unreliable; direct path/source inspection is required before declaring functionality absent.
- A resource router initially existed without real `server.js` mounting; corrected by wiring through the existing fail-soft route loader.
- An isolated router test could pass without proving the actual application path; corrected by adding real-server mounted acceptance coverage.
- A targeted extraction test was initially placed outside the unified test discovery path; corrected by adding registered `.test.js` coverage under `tests/`.
- Local-only resource queue persistence was insufficient for deployment durability; corrected by using the existing durable persistence adapter and failing closed on persistence failure.

## Exact next Issue #11 actions

1. Run/inspect the full canonical-branch regression and compare any failures against `main` so pre-existing baseline failures are separated from Issue #11 regressions.
2. Execute safe live acceptance where available for boot, Admin testing/summary surfaces, Alpha feedback and mounted resource-review behavior without production mutation.
3. Re-run regression after live acceptance and update this evidence packet with final pass/fail receipts.
4. Only after every acceptance criterion is directly proven should Issue #11 be prepared for founder review/merge approval.

## Founder gate

NONE for the next testing/evidence steps. Production merge/deploy, paid services, credential expansion, doctrine/source promotion changes, or weakening of human-review protections remain prohibited without approval.
