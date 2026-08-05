# 08 — Implementation Readiness

## Certification intent

Repository evidence supports a **smallest implementation**, not a new architecture sprint.

## Scope (one patch)

**Owner:** `learningRecordStore` + `recommendationIntelligence`  
**Files (expected):**
1. `services/learningRecordStore.js` — `listLearningRecords` merges `learning-record-index.json` (and durable transitions if present) onto JSONL rows so `adminStatus` / recurrence reflect reality; optionally append a compact transition projection line or rewrite index-backed view only (prefer non-mutating JSONL + merge-on-read).
2. `services/recommendationIntelligence.js` — build `rejectedFingerprints` from the **same** `fingerprintPackage` inputs (store fingerprint on reject transition or recompute identically).
3. `tests/bieV11aReasoningIntelligence.test.js` (or focused new cases) — reject → list shows REJECTED; rebuild recommendations → suppressed.

**Out of scope:** stream instrumentation, evaluator dispatcher, graph DB, deploy automation, doctrine/prompt changes.

## One regression

Assert: create learning record → `transitionLearningRecord(..., 'REJECTED')` → `listLearningRecords` returns `adminStatus: 'REJECTED'` → `buildRankedRecommendations` sets `suppressedAsUnchangedRejection` for unchanged package.

## One deployment

Ship only after local suite green; verify health SHA; Admin reject probe (auth) optional.

## One benchmark

Operate on an existing Founder family (e.g. resurrection chronology): reject or approve once; confirm it does not reappear unchanged; if approved, human implements separately and records outcome later.

## Rollback

`git revert <impl-sha>` — no schema migration required if merge-on-read.

## Stop conditions

- Any change that mutates doctrine/Scripture/production answers without Admin+human deploy
- Any second learning store or queue
