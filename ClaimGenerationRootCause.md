# Claim Generation Root Cause

**Date:** 2026-06-07  
**Phase:** 1C — PART D classification  
**Artifacts:** `phase1c-claim-generation-compliance.json`, `e2e-doctrine-env-parity-audit.json`

---

## Classification matrix

| Code | Cause | Applies? | Evidence |
|------|-------|----------|----------|
| **A. Prompt weakness** | ✅ **PRIMARY** | Competing JSON schemas; `claims[]` instruction buried after legacy shape |
| **B. Missing examples** | ✅ **CONTRIBUTING** | Zero few-shot examples with populated `claims[]` / `doctrineConclusion` |
| **C. Schema weakness** | ✅ **PRIMARY** | `json_object` only — no `json_schema` required fields |
| **D. Model behavior** | ✅ **CONTRIBUTING** | 100% adherence to `reply` + `scripture[]` legacy pattern |
| **E. Parsing loss** | ❌ **RULED OUT** | `safeJsonParse` succeeds; fields absent in raw JSON |
| **F. Post-processing loss** | ⚠️ **MASKING** | `c_inferred` hides missing claims; creates validator-facing C claims |

---

## First actual failure point

```
composeReasonFirstReply
  → callOpenAI
    → chat.completions.create
      → model returns JSON WITHOUT claims[] or doctrineConclusion   ← FIRST FAILURE
  → safeJsonParse                                              ✅
  → normalizeStructured                                        ✅ (claims: [])
  → normalizeClaims                                            ⚠️ infers c_inferred
  → validateClaimToScripture                                   C / rejected
  → approval gate                                              degraded
```

**First failure:** **Model JSON field generation** (before any BibleBuddy post-processing).

---

## Root cause chain (ordered)

### 1. Competing canonical schemas (A + C)

`buildSystemPrompt` defines a **complete, concrete JSON example** with `scripture[]` but without `claims[]` or `doctrineConclusion`. This appears **first** in the system prompt.

`CLAIM_EXTRACTION_INSTRUCTION` adds text requirements **later** but:
- Does not update the canonical JSON example
- Does not remove or supersede the `scripture[]` schema
- Uses prose "required" without API enforcement

**Measured:** 6/6 responses use exact `topLevelKeys` from base schema.

### 2. No structural enforcement (C)

`callOpenAI` uses:

```javascript
response_format: { type: 'json_object' }
```

OpenAI accepts any valid JSON object. Empty or missing `claims` is **legal**.

### 3. No worked examples (B)

No golden example, user payload template, or inline JSON sample shows:

```json
"claims": [{ "claimId": "c1", "claim": "...", "supportingScriptures": ["John 1:1"], ... }]
```

### 4. Model preference for familiar shape (D)

Model fills `scripture[]` richly (3–7 entries per turn) — demonstrating JSON capacity and doctrine reasoning — but routes citations to the **wrong field** for the Authority Engine.

### 5. Silent recovery masks the defect (F)

`normalizeClaims` creates `c_inferred` with:
- `supportingScriptures: []`
- `derivedFrom: 'inferred_from_reply'`
- `confidence: 'low'`

Pipeline appears to have claims; validator always sees ungrounded C claims. **No compose retry triggers on missing claims[]** — only on claim content failure after inference.

### 6. Parsing is not the problem (E ruled out)

`parseLoss.claimsLostInParse: true` in compliance JSON means **inference ran because raw was missing** — not that parser dropped claims.

---

## What is NOT the root cause

| Ruled out | Why |
|-----------|-----|
| Infrastructure | Compose 6/6 success |
| Authentication | Valid key, no 401 |
| Retrieval | Evidence cards present all topics |
| Validator bug | Correctly rejects ungrounded inferred claims |
| Approval gate bug | Correctly degrades |
| Doctrine content | Model produces doctrine `reply` + `scripture[]` |

---

## Bottleneck code mapping (A–G from E2E audit)

| Prior code | Phase 1C status |
|------------|-----------------|
| A Environment | Resolved |
| B OpenAI client | Resolved |
| C Runtime mismatch | Resolved |
| **D Claims pipeline** | **CONFIRMED — raw metadata absent** |
| E Validator | Symptom — rejects inferred claims |
| F Approval | Symptom — degrades |
| G Memory | Not contributing |

---

## Diagnosis-only stop

No fixes implemented. Recommended fix **categories** (for future sprint, not this task):

1. Unify JSON schema in prompt (single canonical shape including `claims[]`)
2. Adopt `json_schema` with `required: ["reply", "claims", "doctrineConclusion"]`
3. Add few-shot claim examples
4. Fail compose when raw `claims.length === 0` instead of inferring
5. Map `scripture[]` → `claims[]` as interim bridge (post-processing — not doctrine change)
