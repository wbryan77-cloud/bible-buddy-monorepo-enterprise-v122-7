# 07 — Growth Safety Matrix

Only capabilities with measured recursive benefit are candidates. Each row must prove non-duplication.

## Candidate A — Learning-record status materialization (REQUIRED)

| Field | Value |
|---|---|
| Owner | `learningRecordStore` |
| Purpose | Make APPROVED/REJECTED/DEFERRED visible to Admin + ranking |
| Inputs | JSONL records + index + durable transitions |
| Outputs | Listed records with current `adminStatus`, `measuredOutcome` |
| Dependencies | `founderExperienceDurableStore` (optional merge) |
| Operational cost | O(n) merge on list; negligible |
| Rollback | revert patch; JSONL unchanged |
| Success metric | Rejected family does not reappear unchanged in ranked packages |
| Failure metric | Stale READY status after Admin reject |
| Reason | Closes LEARN; without it intelligence cannot improve |
| Non-duplication proof | Extends existing store; no new queue/engine |

## Candidate B — Single rejection fingerprint (REQUIRED with A)

| Field | Value |
|---|---|
| Owner | `recommendationIntelligence` |
| Purpose | Unchanged rejected packages stay suppressed |
| Inputs | package fields + prior rejections |
| Outputs | `suppressedAsUnchangedRejection` |
| Dependencies | Candidate A |
| Operational cost | hash only |
| Rollback | revert |
| Success metric | fingerprint equality on unchanged repair |
| Failure metric | repeat identical recommendation after REJECTED |
| Reason | Outcome learning |
| Non-duplication proof | Fixes existing function; no second recommender |

## Candidate C — `/buddy/stream` observe parity (DEFER until A+B)

| Field | Value |
|---|---|
| Owner | `routes/buddy.js` + `experienceTraceAdapter` |
| Purpose | Streaming path enters same ledger |
| Success metric | stream turns emit QUESTION_RECEIVED/ANSWER_GENERATED |
| Non-duplication | same adapter, not new ledger |
| Defer reason | LEARN break is higher leverage |

## Candidate D — `recordMeasuredOutcome` (DEFER until first human repair)

| Field | Value |
|---|---|
| Owner | `learningRecordStore` |
| Purpose | MEASURE AGAIN after deploy |
| Success metric | `measuredOutcome` populated within measurement window |
| Defer reason | Needs a real approved repair to measure |

## Explicitly rejected growth

- New graph database
- New evaluation vendor
- New companion runtime
- Auto-deploy from recommendations
- Broad prompt rewrite
