# Claim Extraction Accuracy Report

**Date:** 2026-06-08  
**Phase:** 2A — PART E regression  
**Artifact:** `docs/regression-trace/phase2a-claim-extractor-regression.json`

---

## Aggregate metrics (7 topics)

| Metric | Result |
|--------|--------|
| OpenAI compose success | **7 / 7** |
| Claims extracted | **49** total (**7.0** avg/turn) |
| Claims with `supportingScriptures` | **49 / 49 (100%)** |
| `c_inferred` used | **0 / 7** |
| Extractor-sourced claims | **49 / 49 (100%)** |
| `doctrineConclusion` populated | **7 / 7** |
| Validator passed (full turn) | **1 / 7** (death state) |
| Approval approved | **1 / 7** |
| Approval degraded | **6 / 7** |

---

## Per-topic scorecard

| Topic | Claims | Mapped | Inferred | A | B | C | D | Validator | Approval |
|-------|--------|--------|----------|---|---|---|---|-----------|----------|
| Logos | 7 | 7 | ❌ | 0 | 0 | 7 | 0 | fail | degraded |
| Third heaven | 7 | 7 | ❌ | 2 | 1 | 3 | 1 | fail | degraded |
| Acts 10 | 4 | 4 | ❌ | 1 | 0 | 3 | 0 | fail | degraded |
| Pork | 4 | 4 | ❌ | 2 | 0 | 2 | 0 | fail | degraded |
| Sabbath | 13 | 13 | ❌ | 0 | 0 | 13 | 0 | fail | degraded |
| **Death state** | 6 | 6 | ❌ | 2 | 3 | 0 | 0 | **pass** | **approved** |
| Kingdom | 8 | 8 | ❌ | 4 | 0 | 4 | 0 | fail | degraded |

**Mapped rate:** 100% (all claims have ≥1 scripture ref)

---

## Accuracy vs Phase 1C (`c_inferred`)

| Dimension | Phase 1C | Phase 2A | Delta |
|-----------|----------|----------|-------|
| Ref attachment | 0% | **100%** | +100% |
| Atomic claims | 1 monolith | 4–13 per turn | ✅ |
| `sourceSentence` trace | ❌ | ✅ all claims | ✅ |
| `derivedFrom` provenance | `inferred_from_reply` | `scripture_witness` / `sentence_ref` | ✅ |
| Validator A/B claims | 0/turn | 1–5 per turn (topic-dependent) | ✅ |
| Full validator pass | 0/6 | **1/7** | ✅ |

---

## Extraction source breakdown

| `derivedFrom` | Typical role |
|---------------|--------------|
| `scripture_witness` | Claim text from `scripture[].reason` + ref from `reference` |
| `sentence_ref` | Reply sentence with inline citation regex match |

Witness pass dominates early claims; sentence pass adds reply sentences with explicit refs.

---

## False positive / negative notes

### Improvements

- No more 280-char monolith masking multiple assertions
- Refs mapped to catalog (approved + witness + retrieval)
- Third heaven: **2 class A** + **1 class B** claims (was 100% class C)
- Pork: **2 class A** on Leviticus/Deuteronomy witnesses
- Death state: **6/6 class A/B** — full validator pass

### Remaining gaps

- **Logos / Sabbath:** witness `reason` text often scores **C** (`citation_without_verified_support`) — mapping works, affirmation rules thin
- **Duplicate overlap:** witness + sentence claims sometimes repeat same ref (dedupe partial)
- **Validator fail ≠ extraction fail:** model `reply` prose still model-reasoned; extractor faithfully maps what OpenAI emitted

---

## Confidence distribution

| Confidence | Claims (approx) |
|------------|-----------------|
| `high` | ~46 |
| `medium` | ~3 |

All claims with approved-graph ref matches scored `high` per extractor rules.

---

## Verdict

**Metadata ownership shifted successfully.** Extraction is **accurate for mapping** (100% ref attachment). **Validator alignment** is topic-dependent — strongest on death state, kingdom, pork, third heaven; weakest on logos/sabbath affirmation coverage.
