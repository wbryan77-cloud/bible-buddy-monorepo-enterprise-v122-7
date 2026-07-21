# Bible Authority Engine Phase 2B Report

**Date:** 2026-06-08  
**Phase:** 2B — Support Relationship Engine  
**Status:** **COMPLETE** — implemented, wired, validated

---

## Executive summary

Phase 2B closes the gap between **verse citation** and **support verification**. Every doctrine claim now receives a `supportClass`, `supportReason`, and `confidence` before the validator and approval gate run.

| Goal | Result |
|------|--------|
| Create `supportRelationshipEngine.js` | ✅ |
| Output supportClass / supportReason / confidence | ✅ |
| Wire before validator | ✅ `claimToScriptureValidator` |
| Claim traceability matrix v2 | ✅ per-turn rows with all required fields |
| Target questions (9 topics) | ✅ live regression |
| Metrics captured | ✅ A/B/C/D, approval, degradation, support accuracy |
| `supportReason` on every claim | ✅ 57/57 (100%) |
| No doctrine / evidence / IOG changes | ✅ |

---

## Architecture change

### Before (Phase 2A)

```
claimExtractor → classifyDoctrineClaim (inline) → validator → approval
```

Claims had refs attached but limited explainability on *why* a ref did or did not support the claim.

### After (Phase 2B)

```
claimExtractor
  → supportRelationshipEngine.analyzeSupportRelationship (per claim)
  → claimToScriptureValidator (enriched with supportReason)
  → approval gate
  → claimTraceabilityMatrix v2
```

---

## Implementation inventory

| Component | Path |
|-----------|------|
| Support Relationship Engine | `services/supportRelationshipEngine.js` |
| Validator integration | `services/claimToScriptureValidator.js` |
| Traceability matrix v2 | `services/claimTraceabilityMatrix.js` |
| Doctrine trace | `services/doctrineAnswerTrace.js` |
| Regression runner | `scripts/phase2bSupportRelationshipRegression.js` |
| Regression JSON | `docs/regression-trace/phase2b-support-relationship-regression.json` |
| Matrix JSON | `docs/regression-trace/claim-traceability-matrix-v2.json` |

---

## Regression results (9 target topics)

| Topic | Claims | A | B | C | D | Support % | Validator | Approval |
|-------|--------|---|---|---|---|-----------|-----------|----------|
| Third heaven | 10 | 5 | 2 | 3 | 0 | 70% | fail | degraded |
| Kingdom | 8 | 6 | 0 | 2 | 0 | 75% | fail | degraded |
| Acts 10 | 4 | 2 | 0 | 2 | 0 | 50% | fail | degraded |
| Pork | 5 | 3 | 0 | 2 | 0 | 60% | fail | degraded |
| Sabbath | 10 | 0 | 0 | 10 | 0 | 0% | fail | degraded |
| Death state | 6 | 3 | 3 | 0 | 0 | 100% | **pass** | **approved** |
| Resurrection | 6 | 1 | 5 | 0 | 0 | 100% | **pass** | **approved** |
| Logos | 6 | 0 | 0 | 6 | 0 | 0% | fail | degraded |
| Holy | 2 | 0 | 0 | 2 | 0 | 0% | fail | degraded |

### Aggregate

| Metric | Value |
|--------|-------|
| Total claims | 57 |
| Class A | 20 |
| Class B | 10 |
| Class C | 27 |
| Class D | 0 |
| Support accuracy (A+B) | **53%** |
| Validator pass rate | 2/9 (22%) |
| Approval rate | 2/9 (22%) |
| Degradation rate | 7/9 (78%) |

---

## Validation

| Check | Result |
|-------|--------|
| `baeClaimValidatorFixtures.js` | 9/9 pass |
| `phase2aClaimExtractorUnitTest.js` | pass |
| `phase2bSupportRelationshipRegression.js` | 9/9 OpenAI success |
| All claims have `supportReason` | 57/57 |

---

## Reports generated

| Report | Path |
|--------|------|
| Support Relationship Engine | `SupportRelationshipEngineReport.md` |
| Claim Support Accuracy | `ClaimSupportAccuracyReport.md` |
| Claim Traceability Matrix v2 | `ClaimTraceabilityMatrixV2.md` |
| Phase 2B summary (this file) | `BibleAuthorityEnginePhase2BReport.md` |

---

## Findings

1. **Support verification works.** Claims that cite verses without frozen affirmation are correctly downgraded to class C with explicit reasons (e.g., Acts 10:28 on dietary card, Sabbath witnesses).

2. **Death state and resurrection are clean.** Both topics achieve 100% A+B support and full validator approval — confirming the engine + evidence graph alignment on well-covered cards.

3. **No false contradictions.** Zero class D on live output; D detection preserved in fixtures.

4. **Next bottleneck is affirmation coverage, not citation mapping.** Sabbath, logos, and holy fail because frozen affirmations or evidence packs are missing — not because refs are unmapped. This is a Phase 3 evidence-graph concern, outside 2B scope.

---

## Constraints honored

- No doctrine added
- No evidence cards added
- No IOG ingestion
- No automatic push/deploy
- Focus: support verification accuracy only

---

## Verdict

**Phase 2B is complete.** The pipeline now produces explainable claim-to-scripture support relationships on every turn. Stop point reached per spec.
