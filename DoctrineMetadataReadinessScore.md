# Doctrine Metadata Readiness Score

**Date:** 2026-06-07  
**Phase:** 1C — Authority Engine metadata layer readiness  
**Formula:** Measured compliance on raw OpenAI output (pre-inference)

---

## Overall readiness: **17 / 100**

Infrastructure is proven. **Doctrine metadata layer is not production-ready.**

---

## Dimension scores

| Dimension | Weight | Score | Raw metric | Notes |
|-----------|--------|-------|------------|-------|
| **Reply generation** | 15% | **15 / 15** | 6/6 | Doctrine prose delivered |
| **Evidence retrieval** | 10% | **10 / 10** | 6/6 cards | Pre-compose path solid |
| **Raw `claims[]` compliance** | 25% | **0 / 25** | 0/6 | Field missing every turn |
| **`doctrineConclusion` compliance** | 15% | **0 / 15** | 0/6 | Field missing every turn |
| **Claim scripture binding** | 15% | **0 / 15** | 0/6 with `supportingScriptures` | Inference leaves refs empty |
| **Schema enforcement** | 10% | **2 / 10** | `json_object` only | Valid JSON, wrong shape |
| **Validator utility** | 5% | **3 / 5** | Runs but input degraded | Can't score A/B without real claims |
| **Approval gate utility** | 5% | **2 / 5** | Degrades always | Symptom of upstream gap |

**Weighted total: 17 / 100**

---

## Pipeline stage readiness

| Stage | Ready? | Score |
|-------|--------|-------|
| Question → Evidence | ✅ | 100% |
| Evidence → OpenAI | ✅ | 100% |
| OpenAI → `reply` | ✅ | 100% |
| OpenAI → `claims[]` | ❌ | **0%** |
| OpenAI → `doctrineConclusion` | ❌ | **0%** |
| `claims[]` → validator (faithful) | ❌ | **0%** raw / 100% inferred |
| Validator → approval | ⚠️ | Functional but always C/degraded |
| End-to-end authority trace | ❌ | Metadata not model-authored |

---

## Inference dependency ratio

| Metric | Value |
|--------|-------|
| Turns requiring `c_inferred` | **6 / 6** (100%) |
| Turns with model-authored claims | **0 / 6** (0%) |
| Authority Engine driving from evidence | **0%** on raw output |

**Inference dependency ratio: 100%** — Authority Engine cannot operate on model-provided claim metadata today.

---

## `scripture[]` diversion score

Model populates legacy `scripture[]` instead of `claims[].supportingScriptures`:

| Topic | scripture[] count | claims[].supportingScriptures |
|-------|-------------------|-------------------------------|
| Logos | 3 | 0 |
| Third heaven | 7 | 0 |
| Acts 10 | 5 | 0 |
| Pork | 4 | 0 |
| Sabbath | 6 | 0 |
| Death state | 4 | 0 |

**Citation data exists in wrong field** — recoverable in theory via mapping, not happening today.

---

## Readiness gates (pass/fail)

| Gate | Threshold | Status |
|------|-----------|--------|
| G1 — Raw claims on ≥80% doctrine turns | 80% | ❌ **0%** |
| G2 — doctrineConclusion on ≥80% turns | 80% | ❌ **0%** |
| G3 — ≥1 supportingScripture per doctrine claim | 50% | ❌ **0%** |
| G4 — Validator pass without inference | 50% | ❌ **0%** |
| G5 — No `c_inferred` on doctrine turns | 0 inferred | ❌ **100% inferred** |

**0 / 5 gates passed.**

---

## Verdict

| Question | Answer |
|----------|--------|
| Is infrastructure ready? | **Yes** |
| Is metadata generation ready? | **No** (17/100) |
| Is further **doctrine/evidence** work justified first? | **No** |
| Is **structured claim generation** the blocking work? | **Yes** |

---

## Re-run command

```bash
unset OPENAI_API_KEY
export OPENAI_API_KEY=<valid-sk-key>
node scripts/phase1cClaimGenerationCompliance.js
```

**Artifact:** `docs/regression-trace/phase1c-claim-generation-compliance.json`
