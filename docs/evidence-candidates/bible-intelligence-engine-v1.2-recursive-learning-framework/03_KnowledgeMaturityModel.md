# 03 — Knowledge Maturity Model

No learned item becomes doctrinal or production authority without governance.

## Required maturity fields vs repository

| Field | Learning records | Discoveries | Recommendations | Gap action |
|---|---|---|---|---|
| Source | `sourceEventIds` only | supporting IDs | discovery/hypothesis IDs | Add explicit `source` enum when patching list merge |
| Evidence | yes | coverage + IDs | via discovery | keep refs, not raw text |
| Confidence | yes | yes | via score factors | ok |
| Verification count | **missing** | **missing** | **missing** | add on MEASURE AGAIN |
| Last verified | **missing** | `lastSeen` ≠ verified | **missing** | set on replay/outcome |
| Superseded by | yes | yes | **missing** | add when replacing rec |
| Approval status | `adminStatus` | `adminStatus` | `adminStatus` | ok naming |
| Relationship graph | **missing** | **missing** | **missing** | link via `relationshipProjection` IDs |
| Related discoveries | **missing** | n/a | singular `discoveryId` | array when needed |
| Supporting benchmarks | **missing** | **missing** | test name strings | attach benchmark run IDs |
| Operational impact | **missing** | user/Founder impact proxies | cost/latency/privacy fields | unify field name |
| Retirement conditions | status `RETIRED` exists; **no conditions object** | **missing** | **missing** | add when outcome ineffective |

## Authority ladder (binding)

```
OBSERVED → CORRELATED → READY_FOR_ADMIN_REVIEW → APPROVED
→ human IMPLEMENT → VALIDATE → DEPLOY → VALIDATED_IN_PRODUCTION
→ PROMOTED | ROLLED_BACK | SUPERSEDED | RETIRED
```

Shadow discoveries/hypotheses/predictions **never** skip to doctrinal authority (`doctrinalAuthority: false` on relationship projection).

## Maturity rule

A record may advise Admin only when: evidence ≥ threshold, confidence set, approval path open, and mutation flags remain false until human deploy.
