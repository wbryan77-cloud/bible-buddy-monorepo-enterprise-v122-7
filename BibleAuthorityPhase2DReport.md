# Bible Authority Phase 2D Report

**Date:** 2026-06-08  
**Phase:** 2D — Approved Support Graph + Precept Candidate Pathway  
**Status:** **COMPLETE**

---

## Executive summary

Phase 2D converts existing approved evidence into a measurable **Support Graph** and fixes reference normalization — without new doctrine, prompts, responders, or IOG.

| Goal | Result |
|------|--------|
| Reference normalization | ✅ `scriptureReferenceNormalizer.js` — 8/8 pairs |
| Approved support graph | ✅ `approvedSupportGraph.js` — 22 frozen edges |
| Dietary law affirmations | ✅ Acts 10:28, Acts 11, Lev 11 |
| Kingdom/heavens affirmations | ✅ Matt 6:10, John 14:3, Rev 21, Rev 5:10, John 13:33 |
| Support engine wiring | ✅ `supportGraphMatch` on every claim |
| Candidate queue pathway | ✅ `supportGraphCandidateQueue.js` |
| Precept discovery design | ✅ `PreceptDiscoveryDesign.md` |
| Tradition/model prior guard | ✅ contradiction edges in graph |
| No doctrine / prompt / responder changes | ✅ |

---

## Answers to final questions

### 1. How many Class C claims were eliminated?

- **Offline replay (27 baseline claims):** 9 eliminated → A/B
- **Live regression:** Class C **27 → 15** (−12 claims, −17pp of total claims due to OpenAI output variance)

### 2. New support accuracy?

**70%** (35/50 claims A+B), up from **53%**

### 3. New approval rate?

**78%** (7/9 topics), up from **22%** (2/9)

### 4. New degradation rate?

**22%** (2/9 topics), down from **78%**

### 5. What affirmations were added?

22 support graph edges — see `AffirmationCoverageReport.md`. Key additions: `acts10_28_people_not_food`, `acts11_gentile_clarification`, `john14_3_come_again`, `rev21_comes_down`, `rev5_10_reign_earth`, plus tradition-guard contradiction edges.

### 6. Which came from approved cards?

**All 22 edges** — transcribed from `bindingRules`, `cautionPassages`, `bibleFirstConclusion`, `commonMisreadings`, `primaryScriptures`, `supportingScriptures` on frozen cards.

### 7. Which came from approved catalogs?

Indirect chain edges from `threeHeavens` and `kingdomComesToEarth` teaching orders (class B path). Direct affirmations sourced from cards that reference catalog themes.

### 8. Did any new doctrine get introduced?

**No.** All edges derived from existing frozen assets.

### 9. Did any old loop/fallback/template system return?

**No.** Hard cutover regression **18/18 pass** — OpenAI remains final speaker; no responder/template/study-loop violations.

### 10. Is readiness now above 85?

**No — ~78%** mean topic readiness. Seven topics at 100%; Sabbath and Logos remain at 0%. Target 85 requires Phase 2E (Sabbath + Logos affirmation encoding).

### 11. What remains after Phase 2D?

| Gap | Claims | Next phase |
|-----|--------|------------|
| Sabbath affirmations | ~10 | 2E — encode from sabbath.card |
| Logos affirmations | ~6 | 2E — encode from messiahLogos.card |
| Holy evidence card | ~2 | 2E — admin-reviewed card + retrieval trigger |
| Acts 13:42-44 on sabbath card | 1 | Add to supportingScriptures |

### 12. How will future precept discovery work without auto-changing doctrine?

`supportGraphCandidateQueue.js` records proposals with `reviewRequired: true`, `autoApplied: false`. Admin promotes edges to `APPROVED_SUPPORT_EDGES` only after regression pass. See `PreceptDiscoveryDesign.md`.

---

## Architecture

### Before (2C)

```
claim → refInApproved (strict) → 5 legacy affirmations → often class C
```

### After (2D)

```
claim → refInApproved (range-aware)
      → approvedSupportGraph.match (22 edges + catalog chains)
      → bindingRules fallback
      → class A/B/C/D + supportGraphMatch
```

OpenAI still composes prose. BibleBuddy owns support proof.

---

## Implementation inventory

| Component | Path |
|-----------|------|
| Reference normalizer | `services/scriptureReferenceNormalizer.js` |
| Approved support graph | `services/approvedSupportGraph.js` |
| Candidate queue | `services/supportGraphCandidateQueue.js` |
| Evidence graph (upgraded) | `services/approvedEvidenceGraph.js` |
| Citation verifier (upgraded) | `services/claimSupportVerifier.js` |
| Support engine (upgraded) | `services/supportRelationshipEngine.js` |
| Ref normalization audit | `scripts/phase2dReferenceNormalizationAudit.js` |
| Class C offline replay | `scripts/phase2dClassCOfflineReplay.js` |

---

## Regression results

| Suite | Result |
|-------|--------|
| Validator fixtures | 9/9 |
| Phase 2B support regression | 7/9 approved, 70% accuracy |
| Hard cutover | 18/18 |
| Traceability matrix v2 | 100% supportReason |

---

## Reports generated

| Report | Path |
|--------|------|
| Phase 2D summary | `BibleAuthorityPhase2DReport.md` |
| Support graph | `ApprovedSupportGraphReport.md` |
| Affirmation coverage | `AffirmationCoverageReport.md` |
| Reference normalization | `ReferenceNormalizationReport.md` |
| Claim delta | `ClaimSupportDeltaReport.md` |
| Candidate queue plan | `SupportGraphCandidateQueuePlan.md` |
| Precept discovery design | `PreceptDiscoveryDesign.md` |

---

## Stop conditions — none triggered

- No new doctrine conclusions
- No IOG ingestion
- No responder prose
- No template answers
- No study-loop behavior
- No prompt rewrites
- No automatic doctrine approval

---

## Verdict

**Phase 2D complete.** BibleBuddy now encodes approved Scripture relationships in a reusable Support Graph. Support accuracy +17pp; approval rate +56pp. Sabbath, Logos, and Holy remain for Phase 2E.
