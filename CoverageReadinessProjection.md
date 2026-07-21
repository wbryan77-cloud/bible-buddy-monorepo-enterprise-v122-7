# Coverage Readiness Projection

**Phase:** 2G Part F  
**Current readiness (V4):** 82.4  
**Current Class C:** 82 / 475 claims (17.3%)  
**Current degradation:** 29%

---

## Projection model

Assumes fixes add support graph edges / affirmation rules from **existing frozen cards only** (no new doctrine). Each resolved Class C claim improves support accuracy and reduces turn degradation proportionally.

| Scenario | Claims fixed | Remaining Class C | Support accuracy | Degradation rate | Conv. stability | **Projected readiness** |
|----------|--------------|-------------------|------------------|------------------|-----------------|------------------------|
| Current (2F) | 0 | 82 | 82% | 29% | 71.2% | **82.4** |
| P0 fixed | 57 | 25 | 94.1% | 8.8% | 91.2% | **93.2** |
| P0 + P1 fixed | 71 | 11 | 97.1% | 4% | 96% | **95.8** |
| P0 + P1 + P2 fixed | 82 | 0 | 99.4% | 0% | 100% | **97.9** |

---

## P0 scope (57 claims)

- sabbath_cluster (missing_affirmation + missing_chain): 19
- isaiah58_sabbath_edge (missing_support_edge): 14
- general_cluster (missing_affirmation + missing_chain + missing_retrieval_trigger): 13
- death_resurrection_cluster (missing_retrieval_trigger + missing_chain): 11

## P1 scope (14 claims)

- holy_cluster (missing_affirmation + missing_retrieval_trigger): 9
- pastoral_no_evidence_card (missing_card): 5

## P2 scope (11 claims)

- kingdom_cluster (missing_affirmation + missing_retrieval_trigger): 4
- dietary_cluster (missing_affirmation): 3
- caution_without_teaching_chain (missing_chain): 3
- unmapped_doctrine_claim (weak_claim_extraction): 1
