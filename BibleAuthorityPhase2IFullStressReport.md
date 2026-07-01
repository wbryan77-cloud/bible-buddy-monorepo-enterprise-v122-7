# Bible Authority Phase 2I Full Stress Report

**Date:** 2026-06-08  
**Run:** 2026-06-08T06:09:17.791Z  
**Suite:** 105 scenarios / 125 turns (post-2H codebase)

---

## Part A — Full stress re-run

| Metric | Phase 2F (pre-2H) | Phase 2I (post-2H) | Delta |
|--------|-------------------|---------------------|-------|
| Total turns | 125 | 125 | — |
| OpenAI calls | 125 | 125 | — |
| Connection errors | 0 | 0 | — |
| Runtime errors | 0 | 0 | — |
| Peak RSS (MB) | — | 230 | — |
| Avg RSS (MB) | — | 204.2 | — |
| Class A | 281 | 360 | — |
| Class B | 109 | 72 | — |
| Class C | 82 | 38 | **-44** |
| Class D | 3 | 3 | — |
| Support accuracy | 82% | 91% | +9 |
| Graph participation | 83% | 91% | — |
| Approval rate | 71.2% | 80% | — |
| Degradation rate | 29% | 20% | — |
| Ownership violations | 0 | 0 | — |

---

## Part B — Remaining Class C: 38 claims

| Category | Count |
|----------|-------|
| pastoral_non_doctrine | 13 |
| missing_support_edge | 10 |
| ref_not_on_frozen_card | 7 |
| missing_retrieval | 7 |
| true_blocker | 1 |

**Doctrine blockers (cats 3/4/6):** 18  
**Non-doctrine / expected rejections (cats 1/2/5):** 20

---

## Part C — Phase 3 gate

| Criterion | Required | Result |
|-----------|----------|--------|
| Ownership violations = 0 | ✓ | **0** PASS |
| OpenAI errors = 0 | ✓ | **0** PASS |
| Degradation < 5% | ✓ | **20%** FAIL |
| Graph participation > 90% | ✓ | **91%** PASS |
| No doctrine drift | ✓ | PASS |
| Memory stable | ✓ | PASS |
| Readiness ≥ 95 | ✓ | **88.8** FAIL |

**Gate overall:** **FAIL**  
**Stop condition triggered:** **YES**

---

## Readiness V5 (stress-derived): **88.8**

9-topic live (Phase 2H): 100%
