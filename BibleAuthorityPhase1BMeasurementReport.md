# Bible Authority Phase 1B Measurement Report

**Date:** 2026-06-07
**Status:** LIVE MEASUREMENT COMPLETE
**Constraints:** No doctrine/evidence/validator/retrieval changes; no push/deploy

## Part A — Live OpenAI trace

9 doctrine topics measured with real OpenAI.

## Part B — Live failure distribution (D/E/F/G)

```json
{
  "D": 0,
  "E": 8,
  "F": 0,
  "G": 0
}
```

| Code | Count |
|------|-------|
| D (OpenAI ignored evidence) | 0 |
| E (Claim extraction failure) | 8 |
| F (Validator missed) | 0 |
| G (Gate allowed unsupported) | 0 |
| A (pre-live evidence missing) | 1 |
| NONE (no live failure) | 0 |
| H (runtime) | 0 |

Artifact: `docs/regression-trace/LiveAuthorityFailureDistribution.json`

## Part C — Third heaven case study

**First unsupported doctrine entry:** Turn n/a — "n/a" — failure **NONE**

See `docs/regression-trace/third-heaven-case-study.json`.

## Part D — Authority scorecard

See [AuthorityScorecard.md](AuthorityScorecard.md).

## Part E — Decision gate (diagnosis only)

**Recommended bottleneck:** 2. Claim extraction (E)

Based on measured distribution, prioritize the component with highest D/E/F/G count. Do not add evidence or validators until bottleneck is confirmed across two live runs.

**No fixes implemented. No push. No deploy.**
