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

### Full canonical-branch regression — VERIFIED GREEN

Verified head before this checkpoint update: `930b32749c77a78fd732da692cab86671fba62aa`
GitHub Actions CI run: `34536616563`
Result: **SUCCESS**

The CI evidence directly verifies both required and informational jobs completed successfully. The required job passed:
- dependency installation;
- syntax-check of every tracked JavaScript file;
- deterministic Phase 2 test suite;
- server boot plus `/health` verification.

The informational job also passed:
- the full `tests/*.test.js` suite;
- the Admin Command Center smoke suite against a local server.

Because the canonical branch full suite is currently green, there are no Issue #11 branch-caused failures requiring baseline triage at this checkpoint. The old baseline commit `1b4609a...` has no attached CI run available through the current GitHub evidence surface, so no unsupported baseline pass/fail claim is made.

This clears the **full canonical-branch regression** gate and provides local application boot evidence. Final safe live acceptance against deployed/currently reachable surfaces remains required before Issue #11 closeout.

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
| Render boots | Local server boot + `/health` **VERIFIED GREEN in CI**; deployed safe live acceptance still required |
| Admin can open testing dashboard | Existing Alpha/Admin surfaces present; Admin smoke suite **GREEN**; deployed safe live acceptance still required |
| Testers can submit feedback | Current Alpha feedback path present; targeted owner coverage exists; deployed safe live acceptance still required |
| Admin can view summary metrics | Current Admin/runtime owners crosswalked; Admin Command Center smoke **GREEN**; deployed safe live acceptance still required |
| Resource review plan visible | **VERIFIED in actual mounted server acceptance CI** |
| Uploaded resource metadata can be recorded | **VERIFIED in actual mounted server acceptance CI** |
| Nothing ingested without human approval | **VERIFIED for Issue #11 intake/extraction boundary by route state, structural guardrails and mounted acceptance; final downstream/live acceptance remains required before closure** |
| All new routes fail soft | Resource route uses existing fail-soft mount pattern; canonical regression and local boot **GREEN** |
| OCR/transcript review adapter | IMPLEMENTED + targeted guardrail coverage + full regression **GREEN** |
| Metrics gap closure | IMPLEMENTED in existing owner + full regression **GREEN** |
| Full regression | **VERIFIED GREEN — CI run 34536616563** |
| Safe live acceptance | PENDING |
| Final regression/evidence closeout | PENDING after safe live acceptance |

## Failures and corrections captured

- Duplicate Issue #11 PR lanes were detected; PR #13 is now the canonical lane and the duplicate PR was closed without merge.
- Earlier GitHub code-search absence was found unreliable; direct path/source inspection is required before declaring functionality absent.
- A resource router initially existed without real `server.js` mounting; corrected by wiring through the existing fail-soft route loader.
- An isolated router test could pass without proving the actual application path; corrected by adding real-server mounted acceptance coverage.
- A targeted extraction test was initially placed outside the unified test discovery path; corrected by adding registered `.test.js` coverage under `tests/`.
- Local-only resource queue persistence was insufficient for deployment durability; corrected by using the existing durable persistence adapter and failing closed on persistence failure.
- Earlier broader-suite failure observations are superseded by current canonical-head CI evidence: the deterministic suite, full `tests/*.test.js` suite, Admin Command Center smoke suite, syntax checks and local boot/health check are all green at run `34536616563`.

## Exact next Issue #11 actions

1. Execute safe live acceptance where available for deployed/current boot, Admin testing/summary surfaces, Alpha feedback and mounted resource-review behavior without mutating production data or configuration.
2. Re-run the canonical full regression after live acceptance evidence is gathered.
3. Update this evidence packet with final live and post-live regression receipts.
4. Only after every acceptance criterion is directly proven should Issue #11 be prepared for founder APPROVE / DENY / REVIEW / HOLD merge/release decision.

## Checkpoint / resume

Goal ID: `GOAL-BB-ISSUE11`
Canonical PR: `#13`
Canonical branch: `issue-11-testing-readiness-recovery-20260910`
Last fully verified code/evidence head before this checkpoint commit: `930b32749c77a78fd732da692cab86671fba62aa`
Last completed acceptance phase: **full canonical-branch regression + local boot/Admin smoke — GREEN**
Exact next acceptance phase: **safe live acceptance**
Known-good baseline: `1b4609a8549c0b5fed659f18b97573cda2497095`
Rollback: all Issue #11 implementation remains isolated to the draft canonical PR/branch until founder approval.

## Founder gate

NONE for safe live read-only/non-mutating acceptance and final regression/evidence work. Production merge/deploy, paid services, credential expansion, doctrine/source promotion changes, or weakening of human-review protections remain prohibited without approval.
