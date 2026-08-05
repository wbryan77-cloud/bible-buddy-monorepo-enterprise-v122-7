# 09 — Final Engineering Decision

## Certification

```
SMALLEST_IMPLEMENTATION_READY
```

## Why not RECURSIVE_FRAMEWORK_READY

The observe/explain/recommend/approve **machinery** exists, but recursive improvement is **blocked**:

1. `listLearningRecords` ignores Admin transitions (JSONL remains READY).
2. Rejection suppression uses a different fingerprint than `fingerprintPackage`.
3. MEASURE AGAIN has no owner yet (acceptable after first real repair).

Until (1)+(2) ship, the engine accumulates shadow intelligence without learning from decisions.

## Why not ADDITIONAL_EVIDENCE_REQUIRED

Code-path proof is sufficient (`learningRecordStore.js:161-242`, `recommendationIntelligence.js:51-62` vs `fingerprintPackage`). Production FEL dual-write Admin probe remains optional, not blocking this readiness call.

## Exact next action

One patch: materialize learning-record status on read + unify rejection fingerprint → one regression → deploy → operate Founder mark loop.  
**No new architecture phase.**

## SHAs

| Role | SHA |
|---|---|
| Pre-v1.2 audit tip | `99cb4c3` |
| v1.1A implementation | `d8b584a` |
| Production health (at audit) | `99cb4c3` |

## Rollback for future impl

`git revert <v1.2-impl-sha>`

## Remaining limitations (accepted)

- Stream path unobserved
- Cost estimates placeholder
- Numeric prediction calibration deferred
- Indexed books still unused
- Deploy remains human

## Exact next bottleneck after smallest patch

Human-operated loop: Founder mark → Admin decision → smallest repair → measure outcome — still not a feature sprint.
