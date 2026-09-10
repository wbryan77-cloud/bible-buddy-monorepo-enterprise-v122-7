# Issue #11 Current Architecture Trace

Goal ID: `GOAL-BB-ISSUE11`
Baseline: `1b4609a8549c0b5fed659f18b97573cda2497095`
Evidence branch: `issue-11-testing-readiness-evidence`
Latest verified characterization commit before this evidence update: `f0ab397d8ef2c8260fa3b05be714649a6d62b85f`

This trace records current-architecture evidence before any Issue #11 runtime implementation. It is deliberately characterization-first so old issue filenames are not recreated when newer functionality already supersedes them.

## 1. Resource review execution — current bottleneck

### Verified present

- `services/resourceIngestionReview.js` exists.
- It defines accepted resource types, required/optional metadata, review workflow, severity, admin-review packet construction, moderation rules, and human-approval protections.
- The service explicitly prohibits auto-publishing unreviewed material, prohibits treating AI review as final authority, requires human approval before knowledge ingestion, and requires copyright/usage-rights handling.

### Verified absent at the Issue #11 named integration points

- `routes/resourceReview.js` does not exist at the current baseline.
- `public/admin/resources.html` does not exist.
- `public/admin/` itself does not exist.
- The current `routes/` directory inventory contains no resource-review route by name.
- Full static inspection of current `server.js` found no resource-review/upload route import or mount.
- `tests/issue11ResourceReviewRouteWiring.test.js` now scans the checked-out `server.js`, all route modules under `routes/`, and Admin executable/navigation files under `admin/` directly rather than relying on GitHub symbol-search indexing. At commit `f0ab397d8ef2c8260fa3b05be714649a6d62b85f`, this characterization found no executable/Admin reference to `resourceIngestionReview` and no named resource-review surface in those scanned areas.

### Adjacent admin-flow check

- `routes/bibleAuthorityAdmin.js` implements a separate Bible-authority submission/import workflow.
- That flow is manual/text-oriented and does not establish the Issue #11 uploaded-resource review path; file-upload behavior is disabled rather than providing an equivalent resource-upload/review UI.
- Therefore the Bible-authority admin flow must not be counted as proof that the Issue #11 resource-review acceptance criterion is complete.

### Current conclusion

The **policy/review service exists but its executable intake/review route and Issue #11 resource UI are not wired at the named/current server integration layer**. Direct checked-out source characterization now supports that conclusion more strongly than symbol search alone. Before adding a route, remaining characterization is to rule out any differently named generic admin action that indirectly implements equivalent resource intake/review semantics. No duplicate route/UI should be introduced until that check is complete.

Status: **PARTIAL — service VERIFIED, named/exposed executable flow NOT PROVEN; differently named equivalent still being ruled out**.

## 2. Tester feedback — newer architecture already owns most of the old Issue #11 requirement

### `services/alphaFeedbackCapture.js`

Current feedback persistence records include:

- `feedbackId`
- `timestamp`
- `testerId`
- `sessionId`
- `environment`
- `usefulnessScore`
- `clarityScore`
- `pacingScore`
- `trustScore`
- `wouldReturn`
- notes / expected behavior / observed behavior
- category / type / event / metadata

Persistence is backed by a JSON repository path under `data/alpha/feedback-records.json` by default, with environment override support.

### `routes/alphaAdmin.js`

Current admin endpoints expose alpha status/summary/session/feedback data and use the alpha feedback/session/tester owners rather than a standalone Issue #11 quality-metrics store.

### `admin/alpha-dashboard.html`

A current admin UI consumes the alpha admin status, summary, sessions, and feedback endpoints and renders current testing/feedback state.

### Current conclusion

Do **not** create a duplicate `qualityMetrics.js`/parallel feedback store solely because the old issue named one. Current feedback architecture already owns substantial portions of the requirement.

Status: **PRESENT / CURRENT OWNER IDENTIFIED**.

## 3. Issue #11 metric crosswalk against current owners

| Original Issue #11 signal | Current owner / evidence | Status |
| --- | --- | --- |
| Session count | `adminCommandCenterAggregator` + runtime health / alpha summary | PRESENT |
| Latency | system-health and alpha latency summaries | PRESENT |
| Error count | runtime-health failed requests/timeouts/recent errors | PRESENT |
| Helpfulness | `alphaFeedbackCapture.usefulnessScore` | PRESENT semantically; acceptance wording should be characterized |
| Felt understood | `alphaFeedbackCapture.clarityScore` is related but not identical | PARTIAL — semantic equivalence not yet proven |
| Felt peaceful | no direct structured field proven in inspected current feedback owner | GAP CANDIDATE — repo-wide feedback owners still need check |
| Balance / pacing | `alphaFeedbackCapture.pacingScore` | PRESENT |
| Angry / sad / overwhelmed | no direct structured fields proven in inspected owner | GAP CANDIDATE |
| Too much scripture / not enough explanation / wrong / unsafe | notes/category can carry general feedback, but no direct structured fields proven | PARTIAL / GAP CANDIDATE |
| Resource review queue | command-center approval queue is currently associated with another approval/candidate domain; equivalence to uploaded-resource review is not proven | NOT EQUIVALENT UNTIL PROVEN |
| Recommendations | admin recommendation/decision infrastructure exists | PRESENT |

No new metric should be added until each GAP CANDIDATE is checked against all current feedback/reliability owners.

## 4. Fail-soft architecture

Current server route loading includes multiple optional/reliability modules protected by fail-soft import/mount behavior. Issue #11 resource integration should match current conventions and must not make application boot depend on optional resource-review functionality.

Status: **CURRENT PATTERN IDENTIFIED; future resource route must preserve it**.

## 5. OCR / transcript extraction

- Issue #11 named `services/ocrTranscriptPipeline.js`; that file is absent at the baseline.
- `resourceIngestionReview.js` contains a future extraction workflow marker/readiness fields, which are declarations rather than executable extraction.
- `package.json` includes `pdf-parse`, so an extraction implementation may exist elsewhere or the dependency may be unused.
- Code-search false negatives have already occurred for files later proven to exist, so search failure is not accepted as absence proof.

Status: **UNVERIFIED — architecture/path trace required before adapter creation**.

## 6. Executed verification ledger

### Targeted Issue #11 characterization

- Test: `tests/issue11ResourceReviewRouteWiring.test.js`
- Commit: `f0ab397d8ef2c8260fa3b05be714649a6d62b85f`
- GitHub Actions workflow run: `34482085529`
- Job: `102887393928`
- Result: **PASS** for the Issue #11 resource-review wiring characterization.
- The test directly verifies the human-approval/no-auto-publish policy strings remain present and scans checked-out server/route/Admin source for executable resource-review wiring.

### Broader regression state

- The broader `npm test` execution in the same CI run reported **11 failures outside this targeted characterization**.
- Therefore the targeted Issue #11 characterization is verified, but the repository-wide regression gate is **NOT GREEN** and must not be reported as passed.
- Those baseline failures require triage against `main` so Issue #11-specific regressions can be distinguished from pre-existing unrelated failures before the final full-regression acceptance gate.

## 7. Acceptance-state ledger

Issue #11 criterion | Evidence state
--- | ---
Render boots | NOT YET VERIFIED by Issue #11 live acceptance
Admin can open testing dashboard | UI/route artifacts PRESENT; live acceptance NOT YET TESTED
Testers can open alpha test | route artifact PRESENT; live acceptance NOT YET TESTED
Testers can submit feedback | current feedback route/service architecture PRESENT; live acceptance NOT YET TESTED
Admin can view summary metrics | current admin/aggregator architecture PRESENT; live acceptance NOT YET TESTED
Resource review plan visible | review service PRESENT; required/equivalent resource UI NOT PROVEN
Uploaded resource metadata can be recorded | executable resource intake/persistence path NOT PROVEN
Nothing ingested without human approval | policy guardrail PRESENT and targeted characterization PASS; downstream runtime enforcement NOT YET PROVEN
All new routes fail soft | current server pattern identified; resource route not yet implemented/proven
Targeted Issue #11 characterization | **PASS in CI at `f0ab397d...`**
Full regression | **NOT GREEN — 11 broader-suite failures observed; baseline triage required**

## 8. Corrections / reliability lessons

1. The initial Issue #11 route-wiring test inspected only `server.js` and was too narrow. It was broadened to direct checked-out scans of `server.js`, `routes/`, and `admin/`.
2. GitHub symbol search returned false negatives for code subsequently proven by direct repository reads. Negative symbol-search results are therefore not accepted as absence evidence for Issue #11.
3. An adjacent Bible-authority admin flow must not be mistaken for the requested resource-upload/review path merely because it contains admin/import semantics.
4. A passing targeted test does not imply a passing full regression; both states are recorded separately.

## 9. Next smallest executable steps

1. Finish semantic tracing of differently named generic Admin/import/intake actions to rule out an equivalent resource-upload/review path.
2. Trace all PDF/document/transcript extraction owners and actual `pdf-parse` usage without relying on code-search absence.
3. If no equivalent resource intake route exists, implement the smallest admin-protected, fail-soft resource metadata/review route reusing `resourceIngestionReview.js`, with persistence separated from knowledge ingestion and no auto-promotion path.
4. Add/execute characterization tests proving unapproved resources cannot cross the ingestion boundary.
5. Complete feedback-signal crosswalk and add only genuinely absent structured signals to the current owner.
6. Baseline-triage the 11 broader-suite failures against `main` before using full regression as an Issue #11 promotion signal.

## Risk / rollback

This document and characterization test remain non-production branch work. No runtime, doctrine, source, provenance, review, or deployment behavior changes. Rollback is branch abandonment/deletion. The draft PR must remain unmerged until all Issue #11 acceptance gates are directly proven.