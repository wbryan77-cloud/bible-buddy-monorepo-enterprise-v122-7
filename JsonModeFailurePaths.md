# JSON Mode Failure Paths

**Date:** 2026-06-07  
**Scope:** Every path that can hit `response_format: { type: 'json_object' }` and how JSON-mode 400 arises  
**Status:** Diagnosis only

---

## OpenAI JSON-mode 400 trigger

**Condition:** `chat.completions.create` with `response_format: { type: 'json_object' }` when **no message** in `messages[]` contains the substring `json` (case-insensitive per API behavior).

**Error:**

```
400: 'messages' must contain the word 'json' in some form,
to use 'response_format' type 'json_object'.
```

**Effect:** Request rejected before inference → `callOpenAI` catch → `openaiCalled: false` → connection fallback.

---

## Production path failure matrix

### FP-JSON-01 — Full BibleBuddy request (COMPLIANT)

| Attribute | Value |
|-----------|-------|
| **File** | `reasonFirstComposer.js` |
| **Lines** | 179–186 |
| **Trigger** | Normal `composeReasonFirstReply` with `coreRestoration: true` |
| **System JSON instruction** | Yes — `Return JSON only` + `Return JSON with` |
| **User JSON word** | No |
| **JSON-mode 400** | **Should not occur** |
| **User-visible if other error** | Connection message |

### FP-JSON-02 — User payload only (NON-COMPLIANT) — manual repro

| Attribute | Value |
|-----------|-------|
| **File** | N/A (manual / diagnostic) |
| **Trigger** | `messages: [{ role: 'user', content: '{"reply":"OK"}' }]` + `json_object` |
| **JSON word present** | **No** |
| **JSON-mode 400** | **Yes** |
| **User-visible** | N/A outside BibleBuddy |
| **Maps to user manual test** | **Yes** |

### FP-JSON-03 — System with JSON + user payload (COMPLIANT)

| Attribute | Value |
|-----------|-------|
| **File** | `reasonFirstComposer.js` |
| **Lines** | 183–185 |
| **Trigger** | Production message pair |
| **JSON word present** | System: `Return JSON only`, `Return JSON with`, `required JSON fields` |
| **JSON-mode 400** | **No** |

### FP-JSON-04 — `callOpenAI` with empty system prompt (HYPOTHETICAL)

| Attribute | Value |
|-----------|-------|
| **File** | `reasonFirstComposer.js` |
| **Lines** | 173–192 |
| **Trigger** | If `systemPrompt === ''` and user payload has no `json` word |
| **Reachable in production?** | **No** — `buildComposerSystemPrompt` always non-empty with JSON line |
| **JSON-mode 400** | Yes |

### FP-JSON-05 — `coreRestoration: false` compose (STILL COMPLIANT)

| Attribute | Value |
|-----------|-------|
| **File** | `reasonFirstComposer.js` |
| **Lines** | 165–167, 260–268 |
| **Trigger** | Compose without claims block |
| **JSON instruction** | `buildSystemPrompt` line 339 only (1×) |
| **JSON-mode 400** | **No** |
| **Production use** | Guard regen still passes `coreRestoration: true` |

### FP-JSON-06 — Post-response JSON parse failure (NOT JSON-mode 400)

| Attribute | Value |
|-----------|-------|
| **File** | `reasonFirstComposer.js` |
| **Lines** | 300–307 |
| **Trigger** | `safeJsonParse(result.raw)` fails |
| **HTTP status** | 200 from OpenAI |
| **`openaiCalled`** | **true** |
| **User-visible** | Raw or partial reply — not connection error |
| **Classification** | **D** (response shape), not JSON-mode request |

### FP-JSON-07 — Missing `claims[]` in model JSON (NOT JSON-mode 400)

| Attribute | Value |
|-----------|-------|
| **File** | `reasonFirstComposer.js` |
| **Lines** | 309–311, 331–338 |
| **Trigger** | Model returns JSON without `claims` |
| **`openaiCalled`** | **true** |
| **Validator** | May fail / regen / degrade downstream |
| **Classification** | **E** extraction gap, not 400 |

---

## All `json_object` call sites

| File | Line | System JSON instruction source | Compliant? |
|------|------|-------------------------------|------------|
| `reasonFirstComposer.js` | 182 | `buildComposerSystemPrompt` → `buildSystemPrompt` + claims block | **Yes** |
| `masterBuddyRuntime.js` | 365 | `buildSystemPrompt` + `MASTER_OPENAI_RULES` | **Yes** |
| `shadowReasonFirstRuntime.js` | 283 | `buildSystemPrompt` + shadow append | **Yes** |
| `bibleBuddyLiteRuntime.js` | 175 | `buildSystemPrompt` + lite append | **Yes** |
| `reasonFirstLiteRuntime.js` | 136 | `LITE_ROLE` explicit `Return JSON only` | **Yes** |
| `minimalReasonFirstRuntime.js` | 135 | `Return JSON only` in test role | **Yes** |
| `companionConversationExperimentRuntime.js` | 134 | `Return JSON only` in role | **Yes** |
| `companionOperatingModelExperiment.js` | 339 | `Return JSON only` in role | **Yes** |
| `responseStructureRemovalExperiment.js` | 131 | `Return JSON only` in structure removal prompt | **Yes** |

**No production code path** calls `json_object` without a system-message JSON instruction.

---

## Stripping / mutation paths (B — ruled out)

| Stage | Could remove `json` from outbound prompt? |
|-------|------------------------------------------|
| `applyPersonFirstCompanionHierarchy` | No — only replaces reflect/comfort lines |
| `slimEvidencePackForComposer` | No — evidence slice only |
| `stripInternalRuntimeLabels` | **Post-response only** |
| `polishCompanionReply` | **Post-response only** |
| `buildConnectionErrorReply` | **Post-failure only** |

---

## Decision: does JSON mode explain BibleBuddy failures?

```
IF error message contains "must contain the word 'json'"
  AND request was minimal user-only test
    → FP-JSON-02 (manual repro, not production bug)

IF error message contains "must contain the word 'json'"
  AND request was full runBuddy / composeReasonFirstReply
    → Investigate FP-JSON-04 (system prompt not sent) — unlikely

IF openaiCalled false with connection message
  AND error is 401/429/5xx
    → NOT JSON mode (class F)

IF openaiCalled true but claims empty
    → FP-JSON-07 (class E), NOT JSON mode request failure
```

---

## Related documents

- [JsonModeComplianceAudit.md](JsonModeComplianceAudit.md)
- [OpenAIJsonRequirementGapReport.md](OpenAIJsonRequirementGapReport.md)

**No fixes implemented.**
