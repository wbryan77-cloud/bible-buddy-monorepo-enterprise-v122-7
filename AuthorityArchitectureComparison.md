# Authority Architecture Comparison

**Date:** 2026-06-07  
**Phase:** 1E-A — PART B  
**Status:** Diagnosis only

---

## Architectures compared

### MODEL-FIRST (current production)

```
Evidence pack → OpenAI reasoning + reply → Validation → (degrade) → User
```

OpenAI reads evidence and **determines** what Scripture teaches. Validators catch drift after the fact.

### EVIDENCE-FIRST

```
Evidence pack → BibleBuddy reasoning graph → Structured doctrine payload → OpenAI narration → User
```

BibleBuddy traverses binding rules, catalog chains, and approved refs to **produce** teachable conclusions. OpenAI turns approved structure into natural language only.

### HYBRID (staged target)

```
Evidence pack → BibleBuddy doctrine conclusions + claims[] → OpenAI prose generation → Validation → User
```

BibleBuddy owns claims and conclusions before compose. OpenAI narrates; validators confirm narration did not add doctrine.

---

## Evaluation matrix

| Dimension | MODEL-FIRST | EVIDENCE-FIRST | HYBRID |
|-----------|-------------|----------------|--------|
| **Doctrine safety** | ⚠️ Low–medium — model priors leak (Phase 1C: rich reply, wrong metadata) | ✅ High — conclusions from frozen graph | ✅ High — conclusions pre-bound |
| **Traceability** | ❌ Poor — 0/6 claims, `c_inferred` | ✅ Full — every claim has `derivedFrom: evidence_card:*` | ✅ Strong — claims exist before prose |
| **Maintainability** | ⚠️ Prompt drift, schema conflict | ✅ Rules in code + cards | ✅ Incremental path from today |
| **Cost** | 1 API call | 1 API call (+ CPU graph) | 1 API call |
| **Scalability** | Token growth with evidence | CPU graph cheap; prompt shrinks (narration only) | Balanced |
| **Mission alignment** | ❌ **Poor** — OpenAI determines doctrine | ✅ **Strong** — Scripture graph determines doctrine | ✅ **Good** — staged migration |
| **Companion quality** | ✅ High — model fluency | ⚠️ Risk of robotic if narration weak | ✅ Model still authors warmth |
| **Time to ship** | ✅ Already live | ❌ Largest build | ✅ Phased from 1D decision |

### Scores (1–5, higher = better for mission)

| Architecture | Doctrine safety | Traceability | Mission fit | **Total** |
|--------------|-----------------|--------------|-------------|-----------|
| MODEL-FIRST | 2 | 1 | 1 | **4 / 15** |
| EVIDENCE-FIRST | 5 | 5 | 5 | **15 / 15** |
| HYBRID | 4 | 4 | 4 | **12 / 15** |

---

## MODEL-FIRST — detail

**Strengths**

- Infrastructure proven (Phase 1B/E2E)
- Natural, warm doctrine prose
- Single compose call

**Weaknesses**

- `CORE_RESTORATION` explicitly assigns reply authorship to OpenAI
- Competing JSON schemas (`scripture[]` vs `claims[]`)
- Validator always runs **after** model has already reasoned
- Phase 1C: 100% `c_inferred`, 0% model `claims[]`
- Mission statement contradicts architecture

**Long-term fit:** **Bridge only**, not destination.

---

## EVIDENCE-FIRST — detail

**Strengths**

- Binding rules executed in code, not hoped for in prompts
- `teachingOrder` becomes traversal order, not hint
- OpenAI cannot introduce unsupported doctrine if it only narrates
- Auditable: `doctrineAnswerTrace` reflects graph path

**Weaknesses**

- Requires doctrine reasoning graph (beyond today's validator)
- Narration quality depends on prompt discipline
- Largest engineering lift

**Long-term fit:** **Mission-aligned destination.**

---

## HYBRID — detail

**Strengths**

- Reuses proven retrieval + cards + validator
- Phase 1D: extract claims from `scripture[]` + reply (near-term)
- Phase 2+: generate claims from evidence **before** OpenAI
- OpenAI keeps companion fluency

**Weaknesses**

- Intermediate state still allows some model reasoning in prose until narration contract tightens
- Two ownership models during migration

**Long-term fit:** **Recommended migration path** to evidence-first.

---

## Recommendation (architectural direction)

**Target:** EVIDENCE-FIRST via **HYBRID** staging.

Do not remain on MODEL-FIRST as the strategic end state.
