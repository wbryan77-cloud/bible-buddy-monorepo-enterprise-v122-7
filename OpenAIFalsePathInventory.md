# OpenAI False Path Inventory

**Date:** 2026-06-07  
**Scope:** Every condition that yields `openaiCalled: false` on the live BibleBuddy chat path  
**Status:** Diagnosis only — no code changes

---

## Field naming (read carefully)

| Location | Field | Casing |
|----------|-------|--------|
| `composeReasonFirstReply` return | `openaiCalled` | lowercase `ai` |
| `structured.runtime` | `openAiCalled` | camelCase `Ai` |
| `runtime.coreDebug` / `coreDebug` | `openaiCalled` | lowercase `ai` |
| `buildConnectionErrorReply` runtime | `openAiCalled` | camelCase `Ai` |

Correct readers use: `reply.coreDebug?.openaiCalled ?? reply.runtime?.openAiCalled ?? reply.runtime?.coreDebug?.openaiCalled`

**Bug-prone reader:** `baePhase1bLiveMeasurement.js:173` — `!!dbg.openaiCalled` only (no `openAiCalled` fallback).

---

## Section A — Production `/buddy/chat` path (authoritative)

### A1. OpenAI client unavailable

| Attribute | Value |
|-----------|-------|
| **File** | `services/reasonFirstComposer.js` |
| **Lines** | 174–176 → 284–297 |
| **Trigger** | `require('./openaiClient')` exported `null` (module init threw) |
| **Error source** | Local: `'openai_unavailable'` |
| **User-visible** | Connection message via `buildConnectionErrorReply` |
| **`openaiCalled`** | `false` at compose return → runtime |

### A2. Chat Completions API exception (all HTTP/SDK errors)

| Attribute | Value |
|-----------|-------|
| **File** | `services/reasonFirstComposer.js` |
| **Lines** | 179–191 (catch) → 284–297 (early return) |
| **Trigger** | `openai.chat.completions.create(...)` throws |
| **Error source** | OpenAI SDK `e.message` — e.g. `401`, `403`, `429`, `500`, `context_length_exceeded`, `ECONNRESET`, `ETIMEDOUT` |
| **User-visible** | Connection message; `runtime.connectionError` = first 120 chars of error |
| **`openaiCalled`** | `false` |
| **Note** | **`responses.create` success does not prevent this** — different API method |

### A3. Stale/empty key in singleton client

| Attribute | Value |
|-----------|-------|
| **File** | `services/openaiClient.js` |
| **Lines** | 6–8 |
| **Trigger** | `process.env.OPENAI_API_KEY` empty/undefined at **first** `require('./openaiClient')` |
| **Error source** | SDK 401 on `chat.completions.create` → flows to A2 |
| **User-visible** | Connection message |
| **`openaiCalled`** | `false` |
| **Note** | Fresh `new OpenAI({apiKey})` in a test script can succeed while singleton still has empty key if env was set later |

### A4. Crisis safety short-circuit

| Attribute | Value |
|-----------|-------|
| **File** | `services/openAiFirstCompanionRuntime.js` |
| **Lines** | 62–100 |
| **Trigger** | `H.classifySafety(message)` → `safety.level === 'crisis'` |
| **Error source** | N/A — OpenAI never called |
| **User-visible** | Crisis hotline / 988 message — **not** connection message |
| **`openaiCalled`** | `false` (`runtime.openAiCalled: false`, `coreDebug.openaiCalled: false`) |

### A5. Compose returned `openaiCalled: false` → connection substitution

| Attribute | Value |
|-----------|-------|
| **File** | `services/openAiFirstCompanionRuntime.js` |
| **Lines** | 133, 144–159 |
| **Trigger** | `!!composed.openaiCalled === false` |
| **Error source** | `composed.apiError` or `composed.validation?.issues?.[0]` or `'openai_unavailable'` |
| **User-visible** | `"I'm having trouble reaching the AI service right now. Please try again in a moment."` |
| **`openaiCalled`** | `false`; `admin_flags: ['core_connection_error']`; `finalAnswerAuthor: 'connection_error'` |

### A6. Connection error template runtime flag

| Attribute | Value |
|-----------|-------|
| **File** | `services/coreResponseGuards.js` |
| **Lines** | 71–91 |
| **Trigger** | Called from A5 |
| **Error source** | Passed-in `error` string |
| **User-visible** | Connection message (same) |
| **`openaiCalled`** | `false` in `runtime.openAiCalled` inside template |

### A7. Process death mid-request (infrastructure)

| Attribute | Value |
|-----------|-------|
| **File** | (no catch) — `callOpenAI` await interrupted |
| **Lines** | `reasonFirstComposer.js:179` |
| **Trigger** | Render OOM / SIGKILL / manual restart during `create()` |
| **Error source** | Node process termination |
| **User-visible** | Connection error, HTTP 502, or dropped connection |
| **`openaiCalled`** | `false` if request completes fallback path; may not return at all |

---

## Section B — Paths that do NOT set `openaiCalled: false` (common misconceptions)

| Condition | File | Lines | Actual `openaiCalled` |
|-----------|------|-------|-------------------------|
| Doctrine validator fails post-compose | `openAiFirstCompanionRuntime.js` | 203–209 | **true** (triggers regen, not false) |
| Claim validator fails | `openAiFirstCompanionRuntime.js` | 250–259 | **true** (degradation, not false) |
| Guard regen API fails | `openAiFirstCompanionRuntime.js` | 242–247 | **true** (first reply kept) |
| Empty `claims[]` from model | `reasonFirstComposer.js` | 309–311 | **true** if API succeeded |
| Empty `reply` string from model | `reasonFirstComposer.js` | 188–189 | **true** (`ok: true` even if `raw === ''`) |
| Forbidden phrase stripped | `openAiFirstCompanionRuntime.js` | 262–268 | **true** |
| `finalizeBuddyResponse` memory/session IO | `buddyBrain.js` | 675–798 | **unchanged** |

---

## Section C — HTTP / route layer (secondary)

### C1. `normalizePayload` non-object reply

| Attribute | Value |
|-----------|-------|
| **File** | `routes/buddy.js` |
| **Lines** | 21–24 |
| **Trigger** | `runBuddy` returned non-object |
| **Error source** | Local |
| **User-visible** | Connection message in HTTP body |
| **`openaiCalled`** | Not set — no `runtime` on synthetic object |

### C2. Uncaught exception in `handleBuddyChat`

| Attribute | Value |
|-----------|-------|
| **File** | `routes/buddy.js` |
| **Lines** | 92–100 |
| **Trigger** | Unhandled throw in `runBuddy` |
| **User-visible** | HTTP 500 `{ ok: false, error: e.message }` — **not** connection message |
| **`openaiCalled`** | N/A |

---

## Section D — Bypassed / non-chat runtimes (not `/buddy/chat` cutover)

| File | Lines | Trigger | `openaiCalled` |
|------|-------|---------|----------------|
| `reasonFirstBuddyRuntime.js` | 71, 99, 105 | Crisis / empty fallback | `false` |
| `minimalReasonFirstRuntime.js` | 157, 194 | Test harness | `false` |
| `reasonFirstLiteRuntime.js` | 177, 216, 244 | Lite runtime errors | `false` |
| `companionOperatingModelExperiment.js` | 372, 415, 442 | Experiment | `false` |
| `companionConversationExperimentRuntime.js` | 167, 205, 232 | Experiment | `false` |
| `responseStructureRemovalExperiment.js` | 164, 205, 232 | Experiment | `false` |
| `masterBuddyRuntime.js` | 362+ | Legacy (bypassed by cutover) | varies |

**`buddyBrain.runBuddy` does not route to these** (line 1015–1016).

---

## Section E — Observability false negatives

### E1. Measurement script missing `openAiCalled` fallback

| Attribute | Value |
|-----------|-------|
| **File** | `scripts/baePhase1bLiveMeasurement.js` |
| **Lines** | 99–101, 173–174, 247 |
| **Trigger** | `coreDebug` absent AND `runtime.coreDebug` absent AND `runtime.openAiCalled === true` |
| **Error source** | Reader logic — not runtime |
| **Recorded** | `openaiCalled: false` in measurement JSON |
| **Actual runtime** | May be `true` |

Normally `attachDebug` (`openAiFirstCompanionRuntime.js:358`) sets `runtime.coreDebug.openaiCalled`, so E1 is edge-case unless finalize strips it.

### E2. Production HTTP without debug flags

| Attribute | Value |
|-----------|-------|
| **File** | `services/coreRestorationDebug.js` |
| **Lines** | 5–11, 38–40 |
| **Trigger** | `NODE_ENV=production`, `BUDDY_DEBUG=0` |
| **Effect** | `reply.coreDebug` omitted from HTTP payload |
| **Mitigation** | `reply.runtime.openAiCalled` still present on structured object |

---

## Section F — Error string → false path mapping

| Error substring | False path ID | Classified in `liveRequestTrace.js` |
|-----------------|---------------|-------------------------------------|
| `openai_unavailable` | A1 | `OpenAIError` |
| `401`, `403` | A2, A3 | `OpenAIAuthError` |
| `429`, `quota` | A2 | `OpenAIQuotaExceeded` |
| `timeout`, `ETIMEDOUT`, `ECONNRESET` | A2, A7 | `OpenAITimeout` |
| `context_length` | A2 | `OpenAIError` |
| (none — crisis keywords) | A4 | — |
| Connection message + `core_connection_error` | A5, A6 | `buildConnectionErrorReplyUsed: true` |

---

## Ranked causes: SDK works, BibleBuddy false

| Rank | Cause | False path |
|------|-------|------------|
| **1** | **API surface mismatch** — `responses.create` ≠ `chat.completions.create` | A2 |
| **2** | **Singleton client initialized before key in env** | A3 → A2 |
| **3** | **Large prompt / context length** on doctrine turns | A2 |
| **4** | **`json_object` response_format** on Chat Completions | A2 |
| **5** | **429 / transient network** — no retry, single attempt | A2 |
| **6** | **Render OOM mid-flight** | A7 |
| **7** | **Measurement reader omitting `openAiCalled`** | E1 |

---

## Quick identification checklist

| Observation | Likely false path |
|-------------|-------------------|
| `responses.create` OK, `chat.completions.create` fails | A2 (surface mismatch) |
| `coreDebug.errorMessage` contains `401` | A2/A3 |
| `finalAnswerAuthor: connection_error` + connection text | A5 |
| Crisis text with 988 | A4 |
| `apiError: openai_unavailable` | A1 |
| `runtime.openAiCalled: true` but measurement JSON `openaiCalled: false` | E1 |
| Failure only under concurrent load + Render restart event | A7 |

**No fixes implemented.**
