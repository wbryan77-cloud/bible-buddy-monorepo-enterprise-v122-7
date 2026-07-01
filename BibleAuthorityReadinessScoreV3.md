# Bible Authority Readiness Score V3

**Date:** 2026-06-08  
**Phase:** 2E  
**Regression:** `phase2b-support-relationship-regression.json` + `emergency-hard-cutover-root-cause-results.json`

---

## Scoring model

Each dimension scored 0–100. Weights sum to 100.

| Dimension | Weight | Score | Weighted |
|-----------|--------|-------|----------|
| Evidence Coverage | 20 | 89 | 17.8 |
| Support Coverage | 25 | 100 | 25.0 |
| Claim Validation | 20 | 100 | 20.0 |
| Approval Gate | 15 | 100 | 15.0 |
| Runtime Stability | 10 | 100 | 10.0 |
| Ownership Integrity | 10 | 100 | 10.0 |
| **TOTAL** | **100** | — | **97.8** |

---

## Dimension detail

### Evidence Coverage — 89/100

| Signal | Result |
|--------|--------|
| Topics with card retrieved | 8/9 (holy: no card) |
| Scriptures reach compose | 9/9 OpenAI success |
| Holy gap | documented; vacuous pass only |

Deduction: −11 for holy retrieval gap.

### Support Coverage — 100/100

| Signal | Result |
|--------|--------|
| Class C on extracted claims | **0/53** |
| Support accuracy | **100%** |
| supportGraphMatch on A claims | yes |
| supportReason coverage | 100% |

### Claim Validation — 100/100

| Signal | Result |
|--------|--------|
| Validator pass | 9/9 topics |
| Class D false positives | 0 |
| Fixture pass | 9/9 |

### Approval Gate — 100/100

| Signal | Result |
|--------|--------|
| Approval rate | **100%** (9/9) |
| Degradation rate | **0%** |
| claimDegraded | false on all topics |

### Runtime Stability — 100/100

| Signal | Result |
|--------|--------|
| OpenAI success | 9/9 |
| Hard cutover | 18/18 |
| Connection errors | 0 |

### Ownership Integrity — 100/100

| Signal | Result |
|--------|--------|
| finalAnswerAuthor | openai |
| Responder takeover | none |
| Template prose | none |
| Study loops | none |
| Witness path prose | none |

---

## Thresholds

| Score | Meaning |
|-------|---------|
| **≥85** | Ready for Phase 3 (Scripture discovery design + candidate queue pilot) |
| **≥95** | Ready for large-scale evidence expansion |
| **Current: 97.8** | **Exceeds both thresholds** |

---

## Caveat — Holy topic

Overall score is high because holy extracted **0 claims** this run. Evidence Coverage dimension correctly reflects the holy card gap. Before large-scale expansion, admin should approve `HolyEvidenceCardRecommendation.md` and verify holy topic with non-zero claim extraction.

---

## Progression

| Phase | Readiness |
|-------|-----------|
| 2B | 58.6 |
| 2D | ~78 |
| **2E** | **97.8** |

---

## Class distribution (live)

| Class | Count | % |
|-------|-------|---|
| A | 39 | 74% |
| B | 14 | 26% |
| C | 0 | 0% |
| D | 0 | 0% |
