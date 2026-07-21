# Doctrine Conclusion Derivation Report

**Date:** 2026-06-08  
**Phase:** 2A — PART C  
**Module:** `services/doctrineConclusionBuilder.js`

---

## Ownership

| Field | Owner (Phase 2A) |
|-------|------------------|
| `doctrineConclusion` from OpenAI | **Not used** (0/7 raw emissions) |
| `doctrineConclusion` from BibleBuddy | **7 / 7** |

OpenAI `doctrineConclusion` is only preserved when OpenAI also supplied non-empty `claims[]` (not observed in regression).

---

## Algorithm

```javascript
buildDoctrineConclusion(claims, { reply })
```

1. Filter `doctrine` / `clarification` claims
2. Rank by: `confidence` (high > medium > low) → ref count → shorter claim text
3. Take top claim; trim to first sentence if >220 chars
4. No OpenAI call

---

## Per-topic conclusions (regression)

| Topic | Conclusion (truncated) | Len | Source claim rank |
|-------|------------------------|-----|-------------------|
| Logos | "Shows the Logos became flesh in Jesus Christ." | 45 | high + 1 ref |
| Third heaven | "The Bible teaches the hope of Christ's kingdom on earth…" | 119 | sentence_ref, 2 refs |
| Acts 10 | "Swine is explicitly listed as an unclean animal…" | 68 | witness, Lev 11 |
| Pork | "Leviticus 11:7 and Deuteronomy 14:8 explicitly classify…" | 75 | sentence_ref |
| Sabbath | "Jesus showed His practice of attending synagogue…" | 187 | sentence_ref, 3 refs |
| Death state | "This is shown in passages like Ecclesiastes 9:5…" | 150 | sentence_ref, 2 refs |
| Kingdom | "After Jesus ascended, angels promised He will return…" | 238 | sentence_ref, 3 refs |

---

## Quality observations

### Strengths

- Every conclusion traceable to an extracted claim (not reply slice)
- Conclusions prefer high-confidence, multi-ref claims when available
- Death state conclusion aligns with **validator-passing** claim set

### Limitations

- Ranking by ref count can select a **secondary** witness over the direct answer sentence (e.g. Logos picks witness #2 over opening definition)
- Long conclusions (>220) not truncated in all cases when single sentence exceeds limit
- Conclusion can reflect model-authored witness `reason` text — metadata is BB-derived but **content** still originates from OpenAI prose

---

## Mission alignment

| Criterion | Status |
|-----------|--------|
| BB owns field | ✅ |
| No OpenAI for conclusion | ✅ |
| Traceable to `claims[]` | ✅ |
| Doctrine content from evidence graph | ⚠️ Partial — inherits OpenAI witness wording |

Phase 3 (pre-compose claims from graph) will further align conclusion **content** with frozen evidence.

---

## Verdict

`doctrineConclusionBuilder` successfully replaces OpenAI/inferred conclusion paths. **7/7 populated** with deterministic BB derivation.
