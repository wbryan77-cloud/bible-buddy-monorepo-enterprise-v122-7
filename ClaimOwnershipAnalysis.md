# Claim Ownership Analysis

**Date:** 2026-06-07  
**Phase:** 1D — Claim Ownership Decision (diagnosis only)  
**Context:** Phase 1C proved OpenAI returns `reply` + `scripture[]` at 6/6 but `claims[]` + `doctrineConclusion` at 0/6

---

## Options under review

### OPTION 1 — OpenAI-owned claims

OpenAI generates `reply`, `claims[]`, `doctrineConclusion`. Validator consumes model-authored claims.

### OPTION 2 — BibleBuddy-owned claims

OpenAI generates `reply` only (or `reply` + legacy fields). BibleBuddy extracts `claims[]` locally. Validator consumes extracted claims.

---

## Evaluation matrix

| Dimension | Option 1 — OpenAI-owned | Option 2 — BibleBuddy-owned |
|-----------|-------------------------|----------------------------|
| **Reliability** | **Poor today (0/6)**. Proven unreliable against competing `buildSystemPrompt` schema. Theoretically fixable via `json_schema` + unified prompt. | **Depends on extractor quality**. Current `c_inferred` is 0% validator pass on live sample. Rule-based `scripture[]` mapping is more reliable than fighting empty `claims[]`. |
| **Determinism** | **Low** — model drift, temperature, prompt length, regen variance. Same question can emit different claim counts. | **High** — same `reply` + `scripture[]` → same extracted claims (rule-based). Reproducible in tests and audits. |
| **Render cost** | **Baseline** — one compose call. Slightly higher completion tokens if claims populated (+200–800 tokens est.). Regen on claim failure doubles cost. | **Lower or equal** — no extra API call for extraction. CPU-only post-processing. Avoids regen loops caused by missing claims. |
| **Complexity** | **Lower server code** if model complies. **Higher operational complexity** — prompt/schema tuning, compliance monitoring, model-version regression. | **Higher server code** — extractor, ref linker, sentence splitter. **Lower operational mystery** — behavior lives in versioned JS. |
| **Maintainability** | **Fragile** — dual schema conflict documented in Phase 1C. Every prompt change risks claim omission. Golden examples don't include claims. | **Controllable** — extraction logic is unit-testable (see `baeClaimValidatorFixtures.js` pattern). Evidence graph binding stays in repo. |
| **Auditability** | **Good when it works** — `derivedFrom` field intended for trace. **Poor today** — 100% inference masks model omission. | **Strong** — every claim records `derivedFrom: scripture_witness \| sentence_split \| evidence_card`. Full trace in `doctrineAnswerTrace`. |
| **Doctrine safety** | **Model declares its own support** — risk of citation laundering (cite approved ref, assert unsupported claim). Validator catches many D cases when claims+refs present. | **Server binds refs to assertions** — can require approved-graph refs only, reject unapproved citations before validator. Safer default if extractor is conservative. |
| **Long-term scalability** | **Scales with token cost** — more doctrine domains → longer claims arrays → larger completions. Multi-claim turns inflate JSON. | **Scales with code** — new cards add affirmation rules, not prompt surface. Extraction CPU is negligible vs OpenAI latency (~6s). |

---

## Score summary (1–5, higher = better for Authority Engine)

| Dimension | Option 1 | Option 2 |
|-----------|----------|----------|
| Reliability | 1 | 3 |
| Determinism | 2 | 5 |
| Render cost | 3 | 4 |
| Complexity (inverse: lower code burden) | 4 | 2 |
| Maintainability | 2 | 4 |
| Auditability | 2 | 5 |
| Doctrine safety | 3 | 4 |
| Scalability | 3 | 4 |
| **Total** | **20 / 40** | **31 / 40** |

---

## Strategic observation

Phase 1C shows the model has **already chosen a stable contract**: `reply` + `scripture[]`. Option 1 requires **changing model behavior** against a deeply embedded legacy schema in `buildSystemPrompt`. Option 2 **aligns with observed behavior** and moves authority logic into testable server code.

Option 1 remains viable as a **secondary lane** (schema enforcement experiment) but is not the lowest-risk path given 0/6 compliance.

---

## What each option optimizes

| Option | Optimizes for |
|--------|---------------|
| **Option 1** | Minimal server logic; trusts model for claim decomposition |
| **Option 2** | Deterministic authority trace; frozen evidence graph as source of truth |

**Bible Authority Engine goal** (evidence → traceable claims → validator) aligns more closely with **Option 2** given current model behavior.
