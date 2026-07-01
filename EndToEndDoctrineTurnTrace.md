# End-to-End Doctrine Turn Trace

**Date:** 2026-06-07  
**Question:** *"What does Logos mean in John 1:1?"*  
**Runtime:** Production `runBuddy` → `openAiFirstCompanionRuntime`  
**Artifact:** `docs/regression-trace/e2e-doctrine-env-parity-audit.json`  
**Status:** **PIPELINE PROVEN** (`pipelineProven: true`)

---

## Stage timeline

| Marker | Timestamp (UTC) | Duration |
|--------|-----------------|----------|
| `retrievalStarted` | 2026-06-07T23:11:49.703Z | — |
| `retrievalCompleted` | 2026-06-07T23:11:49.713Z | **10 ms** |
| `composeStarted` | 2026-06-07T23:11:49.713Z | — |
| `openaiRequestSent` (raw capture) | 2026-06-07T23:11:49.760Z | — |
| `openaiResponseReceived` | ✅ (raw, 6363 ms) | — |
| `runBuddyStarted` | 2026-06-07T23:12:01.384Z | — |
| `composeCompleted` | 2026-06-07T23:12:12.643Z | **~23 s total** |
| `validatorStarted` | 2026-06-07T23:12:12.643Z | post-compose |
| `validatorCompleted` | 2026-06-07T23:12:12.643Z | — |
| `approvalGateStarted` | 2026-06-07T23:12:12.643Z | — |
| `approvalGateCompleted` | 2026-06-07T23:12:12.643Z | — |

---

## Retrieval

| Field | Value |
|-------|-------|
| Topic | `messiah_logos` |
| Card IDs | `messiahLogos` |
| `evidencePackSize` | **11,258 bytes** |
| `evidenceRefs` | Embedded in card JSON (no flat top-level ref list) |

---

## Compose / OpenAI

| Field | Value |
|-------|-------|
| `openaiCalled` | **true** |
| `openaiSuccess` | **true** |
| `openaiRequestSent` | ✅ |
| `openaiResponseReceived` | ✅ |
| Request bytes | 29,864 |
| Response bytes | 1,850 |
| Tokens | 8,518 prompt + 476 completion = **8,994 total** |
| `regenCount` | **1** |
| `openaiAttempts` | **2** |
| `errorMessage` | `null` |
| Connection fallback | **not used** |

---

## Claims

| Field | Value |
|-------|-------|
| `claimsGenerated` count | **1** |
| `claimId` | `c_inferred` (inferred from reply — see RawOpenAIResponseAudit) |
| `supportingScriptures` | `[]` in final claim object |

---

## Validator

| Field | Value |
|-------|-------|
| Executed | ✅ |
| `passed` | **false** |
| Classification | **C** (unsupported / no approved evidence binding) |
| `validatorDecision` | Rejected |

---

## Approval gate

| Field | Value |
|-------|-------|
| Executed | ✅ |
| Decision | **`degraded`** |
| `claimDegraded` | **true** |
| `admin_flags` | `claim_validation_degraded` |

---

## Final answer

> In John 1:1, the term "Logos" means "Word" in Greek and refers to Jesus as the divine Word who was with God in the beginning and is God Himself. This reveals Jesus as the eternal, creative, and personal expression of God, fulfilling Old Testament promises about the Messiah. The passage connects Jesus to God's creative power in Genesis and shows Him as the Word made flesh in John 1:14. Scripture does not state that directly.

---

## Memory

| | RSS (MB) | Heap used (MB) |
|--|----------|----------------|
| Before | 72 | 15 |
| After | 151 | 37 |
| Delta | **+79** | +22 |

Not an OOM event (peak 151 MB ≪ 2 GB Render plan).
