# Claim Support Delta Report

**Date:** 2026-06-08  
**Baseline:** Phase 2B (pre-2D)  
**Current:** Phase 2D live regression

---

## Aggregate delta

| Metric | Phase 2B | Phase 2D | Delta |
|--------|----------|----------|-------|
| Total claims | 57 | 50 | −7 (OpenAI output variance) |
| Class A | 20 | 21 | +1 |
| Class B | 10 | 14 | +4 |
| Class C | 27 | 15 | **−12** |
| Class D | 0 | 0 | 0 |
| Support accuracy (A+B) | 53% | **70%** | **+17pp** |
| Validator pass (topics) | 2/9 | **7/9** | +5 |
| Approval rate | 22% | **78%** | +56pp |
| Degradation rate | 78% | **22%** | −56pp |
| `supportReason` coverage | 100% | 100% | — |

---

## Offline Class C replay (27 Phase 2C claims)

| Metric | Value |
|--------|-------|
| Class C claims replayed | 27 |
| Eliminated (→ A/B) | **9** |
| Still C | 18 |
| New D | 0 |

### Eliminated claims (9)

| Topic | claimId | New class | Graph match |
|-------|---------|-----------|-------------|
| third_heaven | c_witness_5 | A | matt6_10_kingdom_on_earth |
| third_heaven | c_witness_6 | A | rev21_comes_down |
| third_heaven | c_sent_10 | A | matt6_10_kingdom_on_earth |
| kingdom | c_witness_2 | A | john14_3_come_again |
| kingdom | c_sent_6 | A | matt6_10_kingdom_on_earth |
| acts_10 | c_witness_3 | A | acts10_28_people_not_food |
| acts_10 | c_sent_4 | A | acts10_28_people_not_food |
| pork | c_witness_3 | A | acts10_28_people_not_food |
| pork | c_witness_4 | A | acts11_gentile_clarification |

### Still Class C (18)

- Sabbath: 10 claims
- Logos: 6 claims
- Holy: 2 claims

---

## Topic approval delta

| Topic | 2B Approval | 2D Approval |
|-------|-------------|---------------|
| third_heaven | degraded | **approved** |
| kingdom | degraded | **approved** |
| acts_10 | degraded | **approved** |
| pork | degraded | **approved** |
| death_state | approved | **approved** |
| resurrection | approved | **approved** |
| sabbath | degraded | degraded |
| logos | degraded | degraded |
| holy | degraded | approved* |

*Holy: 0 claims extracted this run — validator skipped; not a support-graph fix.

---

## Regression safety

| Check | Result |
|-------|--------|
| `baeClaimValidatorFixtures.js` | 9/9 pass |
| `emergencyHardCutoverRegression.js` | **18/18 pass** |
| Responder takeover | none |
| Template prose | none |
| Study loops | none |
| Witness path prose | none |
| OpenAI final speaker | confirmed |

---

## Memory

No new long-running processes. Support graph built per-turn from frozen edges (O(edges × claims)).
