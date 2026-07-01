# Admin Workflow Consolidation Report

**Phase:** 2J-P Parts A–H
**Date:** 2026-06-09T01:55:40.377Z

## Before (fragmented)

Discovery → Recovery → G2R → Witness → Scoring → G/Y/R → Packages → Dashboards → Contradiction reports

## After (unified)

Discovery → Research Console → Human Review → Approval Workflow → Regression → Staging → Promotion

## Advisory action distribution

| Action | Count |
|--------|-------|
| approve (advisory) | 10 |
| hold (advisory) | 92 |
| reject (advisory) | 18 |

## Time savings projection

| Metric | Value |
|--------|-------|
| Prior review path | ~18 min/candidate across 6 layers |
| Console path | ~7 min/candidate |
| Projected savings | ~61% (~22 hours for 120 candidates) |

## Future discovery routing

All candidates written to `docs/evidence-candidates/console-queue.json` with:
- `reviewStatus` replaced by `primaryIssue` + `recommendedReviewAction`
- `aiSummary` for admin explanation
- `reviewRequired: true`, `autoApplied: false`
