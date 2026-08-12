# SprintResumeCheckpoint.md

## Status
**EMPTY_QUEUE_ROOT_CAUSE_PROVEN** — production DEFER of local wantId is obsolete

| Field | Value |
|---|---|
| Production snapshot | `data/bb-admin-production-readonly-snapshot.json` → queue `total:0` (real) |
| Target `8d1e5cca-…` | **LOCAL/EVIDENCE ONLY** — never in production snapshot |
| Auth | Solved (fingerprint match; not the blocker) |

## Root cause
Decision Queue federates gitignored `data/` files. Render ≠ local disk. Certify `queue_open_total` was **local_only**.

## Repair (local; commit/deploy pending)
- `learningRecordStore` durable → JSONL hydrate on boot
- Operator preflight `queueTotal`/`emptyStore`
- Certify + hydrate/empty-source tests

## Do not
Re-DEFER the local wantId on production. Generate/select a **production-native** FE candidate after hydrate deploy if durable FE rows exist.
