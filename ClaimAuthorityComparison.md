# Claim Authority Comparison

**Date:** 2026-06-07  
**Phase:** 1E-A — PART C  
**Question:** Which claim strategy best supports Scripture-only authority?

---

## Three approaches

### 1. OpenAI generates claims

```
Evidence → OpenAI → { reply, claims[], doctrineConclusion } → Validator
```

### 2. BibleBuddy extracts claims (post-compose)

```
Evidence → OpenAI → { reply, scripture[] } → Extractor → claims[] → Validator
```

### 3. BibleBuddy generates claims (pre-compose)

```
Evidence → Doctrine engine → claims[] + doctrineConclusion → OpenAI narrates → Validator
```

---

## Scripture-only authority criteria

| Criterion | Meaning |
|-----------|---------|
| **S1** | Every doctrine claim traces to approved evidence before user sees answer |
| **S2** | Model training priors cannot silently become doctrine |
| **S3** | Citation ≠ support is caught **before** or **without** model self-report |
| **S4** | Auditable `derivedFrom` on every claim |
| **S5** | Deterministic under same evidence + question |

---

## Comparison

| Criterion | (1) OpenAI claims | (2) BB extract | (3) BB generate pre-compose |
|-----------|-------------------|----------------|---------------------------|
| **S1** Trace before answer | ❌ Claims after compose; 0/6 compliance | ⚠️ After compose; refs from `scripture[]` | ✅ Before compose |
| **S2** Priors blocked | ❌ Model already reasoned in `reply` | ❌ Same — reply is model-reasoned | ✅ Conclusions from graph first |
| **S3** Citation ≠ support | ⚠️ If claims emitted with refs | ⚠️ Extractor can filter unapproved refs | ✅ Graph binds ref to claim |
| **S4** Auditable provenance | ⚠️ `derivedFrom` if model complies | ✅ `scripture_witness`, `sentence_ref` | ✅ `evidence_card:*`, `catalog:*` |
| **S5** Deterministic | ❌ | ✅ (rule-based extractor) | ✅ (graph traversal) |

### Dimension scores (1–5)

| Dimension | (1) OpenAI | (2) Extract | (3) Pre-generate |
|-----------|------------|-------------|----------------|
| Scripture-only authority | 1 | 3 | **5** |
| Proven today | 0 (0/6) | 0 (not built; `c_inferred` only) | 0 (not built) |
| Near-term feasibility | Low | **High** | Medium |
| Mission alignment | Low | Medium | **High** |
| Validator compatibility | High (if claims exist) | High | **Highest** |

---

## Approach 1 — OpenAI generates claims

**Phase 1C result:** 0/6 `claims[]`, 0/6 `doctrineConclusion`, 6/6 `scripture[]`.

**Authority problem:** Even if compliance were fixed, the model **already authored doctrine in `reply`** before claims are validated. Claims can lag or misrepresent prose. Self-reported `derivedFrom` is not trustworthy for Scripture-only authority.

**Verdict:** **Weakest** for mission. Optional experiment lane only (Phase 1F).

---

## Approach 2 — BibleBuddy extracts claims

**Mechanism:** Map `scripture[]` witnesses + sentence-level refs from `reply` → `claims[]`.

**Authority problem:** Extraction runs **after** OpenAI has reasoned. `reply` may contain model priors; extractor faithfully captures them. Validator catches many D/C cases but user may still see degraded prose that was model-authored.

**Verdict:** **Necessary near-term step** (Phase 1E per 1D). **Insufficient** as long-term authority model.

**Supports Scripture-only authority:** **Partially** — improves traceability (~50–70% est.) without fixing who reasons.

---

## Approach 3 — BibleBuddy generates claims before OpenAI

**Mechanism:**

```
approvedEvidenceGraph
  → traverse bindingRules + teachingOrder for question intent
  → emit claims[] + doctrineConclusion (frozen wording from rules)
  → OpenAI receives: "Narrate these approved claims warmly; do not add doctrine"
  → Validator checks narration ⊆ approved claims
```

**Authority alignment:**

- Doctrine **content** originates in frozen cards
- OpenAI **cannot** determine what Scripture teaches — only how to say it
- Validator becomes **narration fidelity check**, not primary doctrine gate
- Line-upon-line becomes **graph traversal order**

**Verdict:** **Strongest** Scripture-only authority. Aligns with mission.

---

## PART C answer

| Question | Answer |
|----------|--------|
| Best for Scripture-only authority long-term? | **(3) BibleBuddy generates claims from evidence before OpenAI** |
| Best for next 90 days? | **(2) Extract** as bridge from proven `scripture[]` |
| Should (1) be strategic? | **No** |

**Sequence:** (2) now → (3) as doctrine engine matures → OpenAI narration-only at steady state.
