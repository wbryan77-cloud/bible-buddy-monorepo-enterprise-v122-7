# 02 — Learning Loop Repair

## Changes

### `learningRecordStore.js`
- `listLearningRecords` merges index overlay (`adminStatus`, `packageFingerprint`, recurrence, measuredOutcome)
- `createLearningRecord` stores `packageFingerprint` / `discoveryId`
- `transitionLearningRecord` resolves + persists `packageFingerprint` on index, transition, durable learningRecords + recommendations

### `recommendationIntelligence.js`
- `fingerprintFromLearningRecord` uses same formula as `fingerprintPackage`
- `collectRejectedFingerprints` from REJECTED learning records + durable transitions
- Learning-record creation stores `packageFingerprint` + `discoveryId`

### Tests
- `tests/bieV12aRecursiveLearningLoop.test.js` (4 cases)

## Non-goals
No doctrine/prompt/runtime/architecture changes.
