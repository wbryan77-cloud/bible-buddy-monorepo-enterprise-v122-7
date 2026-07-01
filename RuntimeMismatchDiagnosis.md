# Runtime Mismatch Diagnosis

**Date:** 2026-06-07  
**Purpose:** PART F — Classify compose failures (infrastructure only, not doctrine)  
**Artifact:** `docs/regression-trace/e2e-doctrine-env-parity-audit.json`

---

## Bottleneck classification (A–G)

| Code | Category | Applies to proof run? | Applies to prior blocked runs? |
|------|----------|----------------------|------------------------------|
| **A** | Environment mismatch | ❌ | ✅ **PRIMARY** |
| **B** | OpenAI client mismatch | ❌ | ❌ |
| **C** | Runtime mismatch | ❌ | ❌ |
| **D** | Claims pipeline failure | ⚠️ Partial (raw `claims[]` empty) | N/A (never reached) |
| **E** | Validator failure | ✅ Post-compose | N/A |
| **F** | Approval gate failure | ✅ Degraded (not blocked) | N/A |
| **G** | Memory / Render instability | ❌ | ❌ (local RSS 151 MB) |

---

## Proof run — infrastructure classification

| Category | Applies? |
|----------|----------|
| Infrastructure | ❌ |
| Authentication | ❌ |
| Environment | ❌ (valid `sk-proj` key) |
| Client initialization | ❌ |
| Runtime mismatch | ❌ |
| Memory | ❌ (+79 MB RSS) |
| Rate limit | ❌ |
| Network | ❌ |
| Prompt size | ❌ (29 KB) |
| JSON parse | ❌ |
| OpenAI API | ❌ (success) |

**`failureClassification.primary`:** `NONE`

---

## Prior blocked runs — infrastructure classification

| Category | Applies? | Evidence |
|----------|----------|----------|
| **Authentication** | ✅ | HTTP 401 |
| **Environment** | ✅ | Key len 257, prefix `william`, not `sk-` |
| Client initialization | ❌ | Singleton ready |
| Runtime mismatch | ❌ | Same `runBuddy` path |
| Memory | ❌ | RSS < 150 MB |
| Prompt size | ❌ | ~30–46 KB |
| Doctrine failure | ❌ **Not classified** | Compose never completed |

---

## Runtime path confirmation

```
runBuddy (buddyBrain.js:1015)
  → runOpenAiFirstCompanionRuntime
    → buildRetrievalEvidencePack ✅
    → composeReasonFirstReply ✅
      → callOpenAI → openaiClient singleton ✅
    → validateClaimToScripture ✅
    → guards + approval ✅
    → finalizeBuddyResponse ✅
```

`BUDDY_RUNTIME=legacy` in Render config does **not** bypass this path.

---

## responses.create vs runBuddy — explained

| Observation | Explanation |
|-------------|-------------|
| User terminal: `responses.create` SUCCESS | Valid `sk-proj` export in that shell |
| Agent shell: `runBuddy` FAILED | Different `OPENAI_API_KEY` (corrupted) in agent process |
| Same codebase, both APIs | Same singleton — no client mismatch |
| Proof run: both succeed | Same fingerprint `a38b6209` across probes |

**Not a runtime mismatch.** Environment variable parity failure between shells/processes.

---

## First failure point (historical vs current)

| Context | First failure point |
|---------|---------------------|
| Prior audits | **Authentication** at `callOpenAI` (401) — before validators |
| Proof run | **Validator** (class C) — after successful compose |

---

## Singleton frozen-key hazard

If `openaiClient` is required before valid `OPENAI_API_KEY` is set:

1. Client initializes with wrong key
2. All subsequent calls 401
3. `unset` + `export` in same process **does not fix** — must restart Node

This explains intermittent "fixed export but still failing" in long-lived agent shells.
