# Doctrine Pipeline Verdict

**Date:** 2026-06-07  
**Priority:** CRITICAL  
**Audit:** E2E Doctrine Turn Proof + Environment Parity  
**Artifact:** `docs/regression-trace/e2e-doctrine-env-parity-audit.json`  
**Script:** `scripts/e2eDoctrineProofAndEnvParity.js`

---

## Final verdict

### **`pipelineProven: true`**

A complete doctrine turn through production `runBuddy` succeeded with valid environment credentials. Infrastructure bottleneck is **resolved for local measurement**. Remaining post-compose outcomes are **authority-layer**, not connectivity.

---

## PART H — Required answers

### 1. Did OpenAI successfully compose a doctrine answer?

**YES.**

- `openaiCalled: true`
- `openaiSuccess: true`
- Raw response: 1,850 bytes JSON, 476 completion tokens
- Final user-visible answer delivered (post-degradation)

### 2. Did `claims[]` exist?

**YES in pipeline; PARTIAL in raw OpenAI.**

| Stage | `claims[]` |
|-------|------------|
| Raw OpenAI (pre-validator) | `[]` empty |
| After `claimNormalizer` | **1** claim (`c_inferred`) |
| Final `runBuddy` response | **1** claim |

### 3. Did validators execute?

**YES.**

- `validateClaimToScripture` ran
- Result: `passed: false`, classification **C**, decision **Rejected**

### 4. Did approval gate execute?

**YES.**

- Decision: **`degraded`**
- Flag: `claim_validation_degraded`
- Answer shipped (not connection-blocked)

### 5. What is the first actual failure point?

| Context | First failure point |
|---------|---------------------|
| **Prior blocked audits** | **Authentication** — `callOpenAI` 401 (Environment A) |
| **Proof run** | **Validator** — class C unsupported claim (post-compose E) |

Infrastructure first-failure is **not** in the proof run. Authority first-failure is validator rejection of inferred claim without scripture bindings.

### 6. Is the bottleneck infrastructure or doctrine?

| Layer | Verdict |
|-------|---------|
| **Infrastructure** | ✅ **PROVEN** — retrieval, evidence, prompt, compose, JSON parse all pass |
| **Doctrine / authority** | ⚠️ **Post-compose** — raw `claims[]` empty; validator class C; approval degraded |

**Not a doctrine-card or retrieval failure.** OpenAI composed; validator judged claim unsupported.

### 7. Is further doctrine work justified before fixing that bottleneck?

**NO** for evidence expansion, new Evidence Cards, IOG ingestion, or new validators.

| Work type | Justified now? | Reason |
|-----------|----------------|--------|
| New Evidence Cards | **No** | `messiahLogos` card retrieved; infrastructure proven |
| Doctrine expansion | **No** | Compose succeeds |
| New validators | **No** (per instructions) | Existing validator executed correctly |
| Authority / claims extraction tuning | **Separate track** | Raw OpenAI omits `claims[]`; infer path scores C |
| Render `OPENAI_API_KEY` verification | **Yes** | Cannot live-probe; dashboard secret unverified |
| Agent/shell env hygiene | **Yes** | Polluted key caused false "compose broken" signal |

---

## Bottleneck matrix (A–G)

| Code | Label | Status |
|------|-------|--------|
| A | Environment mismatch | **Was root cause** of prior failures; **fixed** in proof run |
| B | OpenAI client mismatch | **Ruled out** |
| C | Runtime mismatch | **Ruled out** |
| D | Claims pipeline failure | **Partial** — raw `claims[]` empty; infer recovery works |
| E | Validator failure | **Observed** — class C (post-compose, not blocking) |
| F | Approval gate failure | **Observed** — degraded, not blocked |
| G | Memory / Render instability | **Ruled out** for measured failures |

---

## Deliverables index

| Report | Path |
|--------|------|
| OpenAI Client Trace | `OpenAIClientTraceReport.md` |
| Environment Parity | `EnvironmentParityReport.md` |
| End-to-End Turn Trace | `EndToEndDoctrineTurnTrace.md` |
| Raw OpenAI Response | `RawOpenAIResponseAudit.md` |
| Claims Pipeline | `ClaimsPipelineVerification.md` |
| Runtime Mismatch | `RuntimeMismatchDiagnosis.md` |
| Render Memory | `RenderMemoryCorrelationReport.md` |
| **This verdict** | `DoctrinePipelineVerdict.md` |
| JSON artifact | `docs/regression-trace/e2e-doctrine-env-parity-audit.json` |

---

## Stop condition

Diagnosis complete. No evidence, validators, doctrine, deploy, push, or authority changes implemented.

**Re-run command:**

```bash
unset OPENAI_API_KEY
export OPENAI_API_KEY=<valid-sk-key>
node scripts/e2eDoctrineProofAndEnvParity.js
```

Expected: `pipelineProven: true`, `keyFingerprint` stable for same key.
