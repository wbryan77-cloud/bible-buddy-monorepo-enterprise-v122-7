# Claim Generation Scorecard

**Date:** 2026-06-07  
**Phase:** 1C — Raw model compliance test  
**Model:** `gpt-4.1-mini`  
**Method:** Production `buildComposerSystemPrompt` + `chat.completions.create` (pre-validator)  
**Artifact:** `docs/regression-trace/phase1c-claim-generation-compliance.json`

---

## Aggregate (6 doctrine questions)

| Metric | Score |
|--------|-------|
| Compose success | **6 / 6** (100%) |
| `reply` populated | **6 / 6** (100%) |
| Raw `claims[]` populated | **0 / 6** (0%) |
| Raw `claims[]` empty array | **0 / 6** |
| Raw `claims[]` **missing field** | **6 / 6** (100%) |
| Raw `doctrineConclusion` populated | **0 / 6** (0%) |
| Raw `doctrineConclusion` empty string | **0 / 6** |
| Raw `doctrineConclusion` **missing field** | **6 / 6** (100%) |
| `scripture[]` populated | **6 / 6** (100%) |
| Post-normalize inferred claim | **6 / 6** (100%) |

---

## Per-topic scorecard

| Topic | Question | Reply? | Raw claims? | Raw doctrineConclusion? | scripture[] | Inferred? | Latency |
|-------|----------|--------|-------------|-------------------------|-------------|-----------|---------|
| **Logos** | What does Logos mean in John 1:1? | ✅ | ❌ missing | ❌ missing | 3 refs | ✅ `c_inferred` | 4.0s |
| **Third heaven** | What is the third heaven? | ✅ | ❌ missing | ❌ missing | 7 refs | ✅ | 5.7s |
| **Acts 10** | Does Acts 10 make pork clean? | ✅ | ❌ missing | ❌ missing | 5 refs | ✅ | 4.8s |
| **Pork** | Can I eat pork? | ✅ | ❌ missing | ❌ missing | 4 refs | ✅ | 6.6s |
| **Sabbath** | How do we keep the Sabbath holy? | ✅ | ❌ missing | ❌ missing | 6 refs | ✅ | 7.8s |
| **Death state** | What happens when we die? | ✅ | ❌ missing | ❌ missing | 4 refs | ✅ | 5.2s |

---

## Token usage (raw compose)

| Topic | Prompt tokens | Completion tokens | Response bytes |
|-------|---------------|-------------------|----------------|
| Logos | 8,518 | 345 | 1,374 |
| Third heaven | 11,334 | 559 | 2,169 |
| Acts 10 | 10,544 | 372 | 1,393 |
| Pork | 10,517 | 450 | 1,726 |
| Sabbath | 9,974 | 562 | 2,227 |
| Death state | 7,844 | 410 | 1,573 |

---

## Post-normalize recovery (not raw model output)

| Topic | Normalized claims | doctrineConclusion source |
|-------|-------------------|---------------------------|
| All 6 | 1 × `c_inferred` | Last inferred claim (280 char slice) |

**Inference is not model compliance** — it is pipeline fallback.

---

## Interpretation

| Path | Works? |
|------|--------|
| Question → Evidence | ✅ |
| Evidence → OpenAI | ✅ |
| OpenAI → `reply` | ✅ **100%** |
| OpenAI → `claims[]` | ❌ **0%** |
| OpenAI → `doctrineConclusion` | ❌ **0%** |
| OpenAI → `scripture[]` | ✅ **100%** (legacy schema) |
| Inference → validator | ⚠️ Always class **C** (no `supportingScriptures`) |

**Primary bottleneck confirmed:** structured doctrine metadata generation at the model output layer.
