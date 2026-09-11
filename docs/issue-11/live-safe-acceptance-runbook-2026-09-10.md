# GOAL-BB-ISSUE11 — Live-Safe Acceptance Runbook

Date: 2026-09-10
Canonical PR: `#13` — `Issue #11: recover resource review testing readiness`
Canonical branch: `issue-11-testing-readiness-recovery-20260910`
Prepared from verified head: `1fe5cb35751409cbc2dabbdff135dd348eb3d485`
Decision gate: `BB11-LIVE-PREVIEW-20260910`

## Purpose

This runbook is the executable acceptance procedure for the remaining Issue #11 deployed-environment gate. It must be run only against a **non-production deployment pinned to the canonical PR #13 branch/head**. It does not authorize creation of a deployment, production mutation, merge, purchase, credential expansion, knowledge ingestion, or doctrine/source promotion.

## Preconditions — all must be true

1. Target URL is explicitly identified as non-production.
2. Deployment source is exactly `issue-11-testing-readiness-recovery-20260910`.
3. Deployment commit SHA is recorded and equals the approved canonical head or a later Chief-verified Issue-11-only head.
4. Target does not share a production write store for Issue #11 review-state acceptance. If storage isolation cannot be proven, perform read-only checks only and mark write-path live acceptance BLOCKED.
5. Admin token is supplied through the deployment's existing secret mechanism; never place it in git, CI logs, shell history captures, or this evidence packet.
6. No production URL is used as a substitute for the unmerged branch.

If any precondition fails: STOP the live acceptance, record the exact failed condition, and leave Issue #11 open.

## Evidence variables

Use local shell variables so secrets are not copied into commands committed to evidence:

```bash
export BB11_BASE_URL='https://<non-production-host>'
export BB11_EXPECTED_SHA='<approved-canonical-head-sha>'
export BB11_ADMIN_TOKEN='<provided-at-runtime-only>'
```

Do not echo `BB11_ADMIN_TOKEN`.

## Phase A — deployment identity and boot

Record deployment provider evidence showing branch and SHA before endpoint testing.

Then run:

```bash
curl -fsS "$BB11_BASE_URL/health"
```

Acceptance:
- HTTP success.
- Application reports healthy/booted response.
- Provider evidence proves deployed SHA equals `BB11_EXPECTED_SHA`.

Failure handling:
- SHA mismatch = HARD FAIL; do not continue.
- Health failure = record status/body without changing production or broadening credentials.

## Phase B — Admin/UI reachability

Read-only checks:

```bash
curl -fsS -o /dev/null -w '%{http_code}\n' "$BB11_BASE_URL/admin/resources.html"
curl -fsS -o /dev/null -w '%{http_code}\n' "$BB11_BASE_URL/admin/"
```

Acceptance:
- Resource-review UI is reachable.
- Existing Admin surface remains reachable or redirects according to existing application behavior.

Do not modify configuration to force a pass.

## Phase C — fail-closed authentication

Unauthenticated resource-review API access must fail:

```bash
curl -sS -o /tmp/bb11-unauth.json -w '%{http_code}\n' \
  "$BB11_BASE_URL/admin/resources/review-plan"
cat /tmp/bb11-unauth.json
```

Acceptance: `401` (or the application's canonical unauthorized status) and no review data disclosure.

Authenticated review-plan check:

```bash
curl -fsS \
  -H "Authorization: Bearer $BB11_ADMIN_TOKEN" \
  "$BB11_BASE_URL/admin/resources/review-plan"
```

Acceptance: review plan is returned and continues to state/encode human review before ingestion.

## Phase D — missing-metadata rejection

Only if the target has isolated non-production persistence:

```bash
curl -sS -o /tmp/bb11-missing.json -w '%{http_code}\n' \
  -X POST \
  -H "Authorization: Bearer $BB11_ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{"title":"BB11 acceptance probe"}' \
  "$BB11_BASE_URL/admin/resources/submit"
cat /tmp/bb11-missing.json
```

Acceptance: `400` and no resource is persisted as approved/ingested.

If persistence isolation cannot be proven, skip this phase and record `BLOCKED — storage isolation unproven` rather than testing against a production/shared write store.

## Phase E — valid non-production review submission

Only if isolated non-production persistence is proven. Use synthetic metadata; do not upload copyrighted/user content.

```bash
curl -fsS \
  -X POST \
  -H "Authorization: Bearer $BB11_ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{
    "title":"BB11 synthetic live acceptance resource",
    "author_or_speaker":"Bible Buddy QA",
    "language":"en",
    "category":"issue11_live_acceptance",
    "resource_type":"study_notes",
    "summary":"Synthetic non-production metadata used only to verify the Issue #11 human-review boundary.",
    "notes":"Delete with the temporary environment; never promote or ingest.",
    "source_links":[]
  }' \
  "$BB11_BASE_URL/admin/resources/submit" \
  | tee /tmp/bb11-valid-submit.json
```

Required response assertions:
- status/state is `pending_human_review`;
- `human_review_required` is true;
- `approved_for_knowledge_ingestion` is false;
- `ingestion.allowed` is false;
- no response indicates automatic promotion/publication/ingestion.

Any contrary field is a HARD FAIL and blocks merge/release review.

## Phase F — Alpha feedback and Admin summary visibility

Use read-only Admin/summary endpoints where available and a synthetic feedback submission only when the preview's persistence is isolated.

Acceptance evidence must prove:
- Alpha feedback route is reachable under the current application mount;
- Admin summary/testing surface remains reachable;
- feedback capture does not mutate doctrine, approve learning, or trigger resource ingestion;
- structured Issue #11 feedback dimensions remain compatible with existing summary owners.

If endpoint names differ from the checkpoint assumptions, inspect the mounted canonical branch before running a guessed write request. Do not invent an endpoint or broaden public access to make this phase pass.

## Phase G — fail-soft behavior

Exercise only malformed/non-destructive requests already covered by application contracts. Confirm a rejected Issue #11 request does not crash the application:

```bash
curl -fsS "$BB11_BASE_URL/health"
```

after the rejection checks.

Acceptance: service remains healthy; no route failure takes down the application.

## Phase H — post-live canonical regression

After live-safe acceptance/disposition, run or trigger the canonical CI on the exact branch head. Required evidence:
- deterministic suite green;
- syntax checks green;
- local server boot + `/health` green;
- full `tests/*.test.js` suite green;
- Admin smoke green.

Do not mark Issue #11 release-ready until the post-live regression is successful or a failure is baseline-triaged and explicitly dispositioned.

## Evidence receipt template

Record:

```text
Goal: GOAL-BB-ISSUE11
PR: #13
Branch: issue-11-testing-readiness-recovery-20260910
Deployed SHA:
Preview/staging URL identifier (no secrets):
Provider proof of branch/SHA:
Storage isolation proof:
Health: PASS/FAIL
Admin UI: PASS/FAIL
Unauth auth gate: PASS/FAIL
Authenticated review plan: PASS/FAIL
Missing metadata: PASS/FAIL/BLOCKED
Valid synthetic submission: PASS/FAIL/BLOCKED
Human-review/no-ingestion assertions: PASS/FAIL/BLOCKED
Alpha/Admin summary: PASS/FAIL/BLOCKED
Fail-soft health recheck: PASS/FAIL
Post-live CI run:
Corrections made:
Residual risks:
Rollback performed/available:
Founder gate status:
```

Never record tokens, API keys, cookies, database URLs, or other secrets in the receipt.

## Rollback

The live-safe target must be temporary/removable. On failure:
1. stop testing;
2. preserve response/status evidence without secrets;
3. do not merge PR #13;
4. remove/disable the temporary preview when permitted by the approved deployment action;
5. revert only the Issue #11 defect on the same canonical branch if code correction is required;
6. rerun targeted tests and full regression before another live attempt.

Production remains untouched throughout this procedure.

## Current decision boundary

Repository evidence currently proves only CI plus production-style Render configuration; it does not expose a repository-defined preview/staging workflow. Therefore this runbook completes the safe reversible preparation, but **does not itself authorize or create a deployment**.

Next gate: use an already-existing verified non-production deployment if one is surfaced, otherwise founder approval remains required for a temporary preview under decision `BB11-LIVE-PREVIEW-20260910`.
