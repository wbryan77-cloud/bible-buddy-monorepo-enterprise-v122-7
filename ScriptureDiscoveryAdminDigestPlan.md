# Scripture Discovery Admin Digest Plan

**Phase:** 2J-E Part H — Design only
**Date:** 2026-06-08T23:14:40.609Z

> **Default: OFF.** Admin-controlled. Never auto-promotes.

## Authority preservation (Part K)

Discovery is not doctrine. Candidates may never bypass Scripture → Approved Evidence → Support Graph → BAE.

## Digest frequency

| Mode | Default | Env flag (proposed) |
|------|---------|---------------------|
| OFF | ✅ active | `BULK_DISCOVERY_DIGEST=off` |
| Daily | disabled | `BULK_DISCOVERY_DIGEST=daily` |
| Weekly | disabled | `BULK_DISCOVERY_DIGEST=weekly` |
| Monthly | disabled | `BULK_DISCOVERY_DIGEST=monthly` |

## Digest contents

- **New candidates since last run:** 29 total in current bulk run
- **High-score (≥95):** 8
- **Duplicate clusters:** 16
- **Approval recommendations:** 6 ready for human approval

### Daily (when enabled)
- Top 10 by supportScore
- New bulk queue entries
- Regression-failed promotion packages (from 2J-D)

### Weekly
- `BulkDiscoveryAdminReviewPackage.json` delta
- Topic cluster summary
- Acts 13 / Logos duplicate alerts

### Monthly
- Readiness projection rollup
- Source inventory changes
- IOG metadata registry status (transcript availability)

## Bulk workflows

| Workflow | Guard |
|----------|-------|
| Bulk approve support edges | Per-item regression + human sign-off |
| Bulk reject pastoral noise | score <40, no card alignment |
| Bulk hold | theological review flag |

## Promotion rule reminder

No candidate enters production unless: human approved, regression passes, authority score stable, zero ownership violations.
