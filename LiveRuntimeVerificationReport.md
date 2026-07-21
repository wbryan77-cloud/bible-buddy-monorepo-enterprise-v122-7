# Live Runtime Verification Report

**Date:** 2026-06-05  
**Priority:** CRITICAL  
**Scope:** OpenAI-first path, live request tracing, API-failure behavior  
**Status:** VERIFIED (configuration + failure path) — **OpenAI happy-path blocked by quota**

---

## Executive summary

Local runtime is correctly configured for the **OpenAI-first companion path** (`legacy` → `openAiFirstCompanionRuntime`). Startup diagnostics, per-request live tracing, and API-failure handling all behave as specified.

All **6 required test messages passed** under current conditions. Because OpenAI returns **429 quota exceeded**, every turn exercised the **connection-error path** (Part D) rather than live OpenAI answers (Part C happy-path criteria). No witness triplets, study fallback, Sabbath history loops, or relationship enrichment appeared.

**Render live dashboard was not queried in this run.** `render.yaml` declares the required env vars and Standard plan; applying that config to the live service is a manual Render step (no push performed per instructions).

---

## Part A — Environment check

### Required production configuration

| Variable | Required | Local verification | `render.yaml` declared |
|----------|----------|-------------------|------------------------|
| `OPENAI_API_KEY` | present (secret) | ✅ present | ✅ `sync: false` |
| `BUDDY_RUNTIME` | `legacy` | ✅ `legacy` | ✅ `legacy` |
| `BUDDY_TEMPLATE_PROSE` | `0` | ✅ disabled | ✅ `"0"` |
| `BUDDY_DISABLE_STUDY_FALLBACK` | `1` | ✅ disabled | ✅ `"1"` |
| `BUDDY_OPENAI_FIRST` | unset or `1` | ✅ unset → on | not set (defaults on) |
| `NODE_ENV` | `production` | development (local) | ✅ `production` |

### Startup diagnostics (safe, no secrets)

Implemented in `services/buddyRuntimeConfig.js`, invoked from `server.js` on listen.

**Sample local startup output:**

```
=== BibleBuddy Runtime Startup ===
runtime mode: legacy → openAiFirstCompanionRuntime
template prose: disabled
study fallback: disabled
OpenAI ready: true
final answer author mode: openai
NODE_ENV: development
heapUsedMB: 3
rssMB: 38
==================================
```

On Render (`NODE_ENV=production`), the same block will print with `NODE_ENV: production`.

### Additional tracing flags (repo)

| Variable | Value in `render.yaml` | Purpose |
|----------|------------------------|---------|
| `BUDDY_DEBUG` | `1` | Exposes `coreDebug` on responses |
| `BUDDY_LIVE_TRACE` | `1` | Exposes `liveRequestTrace` on `/buddy/chat` and `/buddy/stream` |

---

## Part C — Live request trace (6-message battery)

**Script:** `scripts/liveRuntimeVerification.js`  
**Artifact:** `docs/regression-trace/live-runtime-verification.json`  
**Result:** **6/6 PASS**

| ID | Message | Runtime | Route | OpenAI | Author | Template | Study FB | Witness | Sabbath hist |
|----|---------|---------|-------|--------|--------|----------|----------|---------|--------------|
| t01 | Can I eat pork? Yes or no? | `core_openai_first` | `core_connection_error` | false* | `connection_error` | false | false | false | false |
| t02 | How do we keep the Sabbath holy? | `core_openai_first` | `core_connection_error` | false* | `connection_error` | false | false | false | false |
| t03 | What does Logos mean in John 1:1? | `core_openai_first` | `core_connection_error` | false* | `connection_error` | false | false | false | false |
| t04 | How many heavens… | `core_openai_first` | `core_connection_error` | false* | `connection_error` | false | false | false | false |
| t05 | Rough day / let go of someone | `core_openai_first` | `core_connection_error` | false* | `connection_error` | false | false | false | false |
| t06 | You didn't answer my question | `core_openai_first` | `core_connection_error` | false* | `connection_error` | false | false | false | false |

\* OpenAI API called but returned **429 quota exceeded** → `buildConnectionErrorReplyUsed: true`

### Per-request trace fields (logged)

Each `/buddy/chat` and `/buddy/stream` request now logs to `data/live-request-trace.jsonl` and optionally returns `liveRequestTrace` when `BUDDY_LIVE_TRACE=1`:

- `runtimeUsed`, `routeUsed`, `openaiCalled`, `openaiResponseReceived`
- `finalAnswerAuthor`, `templateUsed`, `fallbackUsed`, `studyFallbackUsed`
- `sourceGroundedResponderUsed`, `sabbathHistoryDeepResponderUsed`, `buildConnectionErrorReplyUsed`
- `errorName`, `errorMessage`, `httpStatus`, `memoryUsage`

### Memory at end of battery

- Heap: **28 MB**
- RSS: **135 MB** (local Node process, single-user battery)

---

## Part D — API failure behavior

**Verified:** When OpenAI fails with 429/quota:

| Requirement | Result |
|-------------|--------|
| No study fallback | ✅ `studyFallbackUsed: false` all tests |
| No witness responder | ✅ no witness triplet text |
| No personalized fallback | ✅ no study-loop prose |
| No relationship enrichment | ✅ `relationshipEnrichmentUsed: false` |
| Transparent user message | ✅ exact: *"I'm having trouble reaching the AI service right now. Please try again in a moment."* |

`errorName`: `OpenAIQuotaExceeded` on all 6 turns.

---

## Part C — Happy-path criteria (pending quota restore)

These criteria **cannot be fully confirmed** until OpenAI quota/billing is restored:

- `openaiCalled=true` and `finalAnswerAuthor=openai`
- `templateUsed=false`, `fallbackUsed=false`
- `studyFallbackUsed=false`
- No witness triplets / “You've been studying…” / unsolicited Sabbath history

**Re-run after quota fix:**

```bash
BUDDY_RUNTIME=legacy BUDDY_TEMPLATE_PROSE=0 BUDDY_DISABLE_STUDY_FALLBACK=1 BUDDY_DEBUG=1 \
node scripts/liveRuntimeVerification.js
```

---

## Implementation map

| Component | File |
|-----------|------|
| Startup diagnostics | `services/buddyRuntimeConfig.js`, `server.js` |
| Live request trace | `services/liveRequestTrace.js`, `routes/buddy.js` |
| Connection error message | `services/coreResponseGuards.js` |
| OpenAI-first runtime | `services/openAiFirstCompanionRuntime.js` |
| Verification script | `scripts/liveRuntimeVerification.js` |

---

## Blockers before production sign-off

1. **OpenAI quota** — restore billing/plan so happy-path turns return `finalAnswerAuthor=openai`.
2. **Render env sync** — confirm live dashboard matches `render.yaml` (see `RenderStabilityVerificationReport.md`).
3. **No push** until user approves post-verification.

---

## Verdict

| Area | Status |
|------|--------|
| Runtime routing (OpenAI-first) | ✅ PASS |
| Template / study fallback disabled | ✅ PASS |
| Startup diagnostics | ✅ PASS |
| Live request tracing | ✅ PASS |
| API failure behavior (Part D) | ✅ PASS |
| OpenAI happy-path answers (Part C) | ⏳ BLOCKED (429 quota) |
| Live Render env confirmed | ⏳ PENDING manual dashboard check |

**Overall:** Configuration and failure-path verification **complete**. Full live answer verification **blocked on OpenAI quota**.
