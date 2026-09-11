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

Verified head before checkpoint update: `930b32749c77a78fd732da692cab86671fba62aa`
GitHub Actions CI run: `34536616563`
Result: **SUCCESS**

The CI evidence directly verifies both required and informational jobs completed successfully. The required job passed dependency installation, syntax-check of every tracked JavaScript file, deterministic Phase 2 tests, and server boot plus `/health`. The informational job passed the full `tests/*.test.js` suite and Admin Command Center smoke suite against a local server.

Because the canonical branch full suite is green, there are no Issue #11 branch-caused failures requiring baseline triage at this checkpoint. The old baseline commit `1b4609a...` has no attached CI run available through the current GitHub evidence surface, so no unsupported baseline pass/fail claim is made.

### Current canonical checkpoint CI — VERIFIED GREEN

Checkpoint head: `41db41ef48c1039c803a49fc7d3a743cffda586e`
GitHub Actions CI run: `34541345978`
Result: **SUCCESS**

This independently verifies the canonical branch remained green after the regression checkpoint was persisted.

### Safe-live acceptance infrastructure boundary — VERIFIED BLOCKER / NO PRODUCTION MUTATION

The repository deployment manifest `render.yaml` defines the `bible-buddy` web service with `autoDeploy: true`, `startCommand: node server.js`, and `/health`, but the repository evidence exposes no branch-preview service or preview URL for the canonical Issue #11 branch. The GitHub connector surface also does not expose a usable deployment target for this branch.

Therefore safe live acceptance of the **Issue #11 branch implementation** cannot be truthfully executed against a deployed environment from the current supervisor surface without either:
- an existing non-production preview/staging deployment becoming available, or
- an explicit consequential deployment action.

The production/default-branch deployment is not an acceptable substitute because Issue #11 changes remain isolated to draft PR #13 and have not been merged. Production deploy/merge remains prohibited without founder approval.

This is not a code/test regression. Local actual-server acceptance and full canonical CI are green. The unresolved gate is specifically **environment availability for live branch acceptance**.

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
| Render boots | Local server boot + `/health` **VERIFIED GREEN in CI**; branch live environment unavailable from current surface |
| Admin can open testing dashboard | Admin smoke suite **GREEN**; branch live environment unavailable from current surface |
| Testers can submit feedback | Current Alpha feedback path present + targeted owner coverage; branch live environment unavailable from current surface |
| Admin can view summary metrics | Admin/runtime owners crosswalked + Admin smoke **GREEN**; branch live environment unavailable from current surface |
| Resource review plan visible | **VERIFIED in actual mounted server acceptance CI** |
| Uploaded resource metadata can be recorded | **VERIFIED in actual mounted server acceptance CI** |
| Nothing ingested without human approval | **VERIFIED for Issue #11 intake/extraction boundary by route state, structural guardrails and mounted acceptance; deployed branch acceptance still pending** |
| All new routes fail soft | Resource route uses existing fail-soft mount pattern; canonical regression and local boot **GREEN** |
| OCR/transcript review adapter | IMPLEMENTED + targeted guardrail coverage + full regression **GREEN** |
| Metrics gap closure | IMPLEMENTED in existing owner + full regression **GREEN** |
| Full regression | **VERIFIED GREEN — CI run 34536616563** |
| Canonical checkpoint CI | **VERIFIED GREEN — CI run 34541345978** |
| Safe live acceptance | **BLOCKED ON NON-PRODUCTION BRANCH ENVIRONMENT / FOUNDER DECISION IF NEW DEPLOYMENT REQUIRED** |
| Final regression/evidence closeout | PENDING after live-acceptance disposition |

## Failures and corrections captured

- Duplicate Issue #11 PR lanes were detected; PR #13 is now the canonical lane and the duplicate PR was closed without merge.
- Earlier GitHub code-search absence was found unreliable; direct path/source inspection is required before declaring functionality absent.
- A resource router initially existed without real `server.js` mounting; corrected by wiring through the existing fail-soft route loader.
- An isolated router test could pass without proving the actual application path; corrected by adding real-server mounted acceptance coverage.
- A targeted extraction test was initially placed outside the unified test discovery path; corrected by adding registered `.test.js` coverage under `tests/`.
- Local-only resource queue persistence was insufficient for deployment durability; corrected by using the existing durable persistence adapter and failing closed on persistence failure.
- Earlier broader-suite failure observations are superseded by current canonical-head CI evidence: deterministic suite, full tests, Admin smoke, syntax checks and local boot/health are green.
- Safe live acceptance was not falsely claimed: no deployed preview/staging target for the unmerged Issue #11 branch is exposed by current repo/connector evidence.

## Exact next Issue #11 actions

1. Chief/founder determines whether an existing non-production preview/staging target can be supplied or whether creation of a temporary Issue #11 preview deployment is approved.
2. If a safe branch deployment becomes available, execute read-only/non-destructive live acceptance for boot, Admin testing/summary, Alpha feedback visibility and resource-review surfaces; do not perform knowledge ingestion or production mutation.
3. Re-run canonical full regression after live acceptance/disposition.
4. Update this evidence packet with final live and post-live regression receipts and prepare founder merge/release review only after every required acceptance gate is satisfied or explicitly dispositioned.

## Checkpoint / resume

Goal ID: `GOAL-BB-ISSUE11`
Canonical PR: `#13`
Canonical branch: `issue-11-testing-readiness-recovery-20260910`
Last fully verified head before this checkpoint update: `41db41ef48c1039c803a49fc7d3a743cffda586e`
Last completed acceptance phase: **full canonical regression + checkpoint CI — GREEN**
Exact next acceptance phase: **safe live acceptance, currently blocked on availability of a non-production branch deployment**
Known-good baseline: `1b4609a8549c0b5fed659f18b97573cda2497095`
Rollback: all Issue #11 implementation remains isolated to the draft canonical PR/branch until founder approval.

## Founder gate

Decision ID: `BB11-LIVE-PREVIEW-20260910`
Status: **REVIEW**
Ready: canonical branch is regression-green and actual-server mounted acceptance is green; live branch acceptance checklist is ready.
Why it matters: Issue #11 cannot be closed truthfully until deployed/current live acceptance is directly proven or explicitly dispositioned.
Recommended action: **APPROVE only a temporary/non-production preview deployment if no existing safe preview/staging environment is available. Do not merge/deploy production for this test.**
Alternatives: supply an existing preview/staging URL; HOLD Issue #11 open; or REVIEW FURTHER if deployment ownership/cost is unclear.
Cost/renewal: not established from repository evidence; no purchase is authorized.
Payment source: none unless a paid preview environment is explicitly approved and mapped to the correct Bible Buddy owning entity.
Risks/dependencies: accidental production mutation, credential exposure, or testing the wrong code revision; mitigate by pinning deployment to canonical branch/head and read-only/non-destructive acceptance actions.
Evidence: PR #13; CI runs `34531239770`, `34536616563`, `34541345978`; this checkpoint document.
Test/QA: canonical CI green; live branch environment missing.
Approval triggers: creation/use of a new external deployment if no existing safe preview exists.
Rollback/reversibility: preview should be temporary and removable; canonical branch remains unmerged.
Deadline: before Issue #11 founder merge/release review.
