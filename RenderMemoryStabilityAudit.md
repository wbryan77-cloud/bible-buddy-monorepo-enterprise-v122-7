# Render Memory Stability Audit

**Date:** 2026-06-06  
**Priority:** CRITICAL (infrastructure — separate from doctrine quality)  
**Scope:** "Web Service exceeded its memory limit" on Render; connection errors; heap growth under chat load  
**Status:** AUDIT ONLY — no implementation, deploy, or push

---

## Executive summary

Render memory failures and Bible-answer quality failures are **different problems** that can present the same user symptom ("I had trouble connecting" or empty-looking replies).

| Symptom | Likely cause | Fix class |
|---------|--------------|-----------|
| HTTP 500, module not found | Deploy gap (`answerVerifier`) | **Fixed** in `1095f92` |
| "Web Service exceeded its memory limit" | Process OOM / SIGABRT (exit 134) | Infrastructure + code heap spikes |
| Empty or generic client message | `index.html` mask on falsy `reply` | Frontend contract |
| Connection error string from API | OpenAI 429/5xx or process restart mid-request | Quota + memory stability |

**Current Render config (`render.yaml`):** `plan: standard` (2 GB). Prior OOM documented on **512 MB Free** tier. Standard mitigates but does **not** eliminate spikes from stacked OpenAI calls, full evidence serialization, and production debug amplification.

---

## Infrastructure vs code — separation

### Infrastructure instability indicators

- Render dashboard shows memory pegged near plan limit before restart
- Exit status **134** or OOM killer in logs
- Failures correlate with **concurrent users** or **long chats**, not specific doctrine topics
- Process RSS grows over hours without traffic drop (leak suspicion)
- Failures stop after manual restart, return under load

### Code / architecture indicators

- Single-user local battery shows **135 MB RSS** but production fails at 2 GB → **concurrency × per-request spike**
- `maxAttempts: 4` + guard regen `maxAttempts: 2` → up to **6 OpenAI round-trips** per turn
- Evidence pack JSON duplicated in system prompt and user payload
- Sync `appendFileSync` on every chat when capture/trace enabled

### Doctrine quality indicators (not memory)

- HTTP 200, non-empty reply, but wrong Scripture or tradition drift
- `openAiCalled: true` with weak evidence — **evidence card gap**, not OOM

**Do not upgrade to Pro 4 GB as first move** unless Render metrics show sustained RSS > 1.6 GB on Standard with debug disabled and regen capped.

---

## Render configuration snapshot

From `render.yaml`:

| Setting | Value | Memory impact |
|---------|-------|---------------|
| `plan` | `standard` (2 GB) | Baseline headroom vs Free 512 MB |
| `BUDDY_DEBUG` | `"1"` | **Increases** response + trace size |
| `BUDDY_LIVE_TRACE` | `"1"` | **Increases** client payload + logging |
| `BUDDY_TEMPLATE_PROSE` | `"0"` | Reduces post-compose work ✅ |
| `BUDDY_DISABLE_STUDY_FALLBACK` | `"1"` | Reduces fallback chain ✅ |
| `PERSISTENCE` | `MEMORY` | No direct buddy-chat reference found |
| `express.json` limit | `10mb` (`server.js`) | Large inbound bodies possible |

**Contradiction:** `RenderMemoryStabilityNotes.md` recommends `BUDDY_CORE_DEBUG=0` in production; blueprint sets `BUDDY_DEBUG=1` and `BUDDY_LIVE_TRACE=1`.

---

## Per-request memory flow

```
POST /buddy/chat
  → buddyBrain.runBuddy (40+ modules already loaded at boot)
  → enrichRuntimeContextWithMemory (reads buddy-memory.json, relationship stores)
  → buildRetrievalEvidencePack (cards, chains, history, memory slice)
  → composeReasonFirstReply
       maxAttempts: 4  ─┐
       each attempt:    │  systemPrompt += JSON.stringify(evidenceSlice, null, 2)
         callOpenAI      │  userPayload += duplicate evidence object
  → guards fail?         │
       composeReasonFirstReply again
       maxAttempts: 2  ─┘
  → finalizeBuddyResponse
       readMemoryStore + writeMemoryStore (full buddy-memory.json)
       appendSession → buddy-sessions.jsonl (full structured + runtimeContext)
  → routes/buddy.js
       buildLiveRequestTrace → appendFileSync live-request-trace.jsonl
       logLiveResponseCapture → appendFileSync live-response-capture.jsonl (full body)
  → res.json(payload + optional coreDebug + liveRequestTrace)
```

---

## Top 10 Render / memory risks (ranked by likelihood × impact)

| Rank | Risk | Likelihood | Impact | Evidence |
|------|------|------------|--------|----------|
| 1 | **Stacked OpenAI compose loops** (4 + 2 attempts) | High under guard failures | Critical heap spike per turn | `openAiFirstCompanionRuntime.js` 110–121, 172–201; `reasonFirstComposer.js` 165, 231–293 |
| 2 | **Evidence pack double-serialized** into system + user JSON | Every turn | High — multi-KB × attempts | `reasonFirstComposer.js` 99–128, 194–204 |
| 3 | **Production debug flags on** (`BUDDY_DEBUG`, `BUDDY_LIVE_TRACE`) | Always in render.yaml | High — fat responses + traces | `render.yaml` 19–22; `coreRestorationDebug.js`; `routes/buddy.js` 67–72 |
| 4 | **`liveResponseCapture` sync full-body write** | Every chat if route deployed | High — I/O + string retention | `liveResponseCapture.js` 53–62; `routes/buddy.js` 10–18 (**local uncommitted**) |
| 5 | **Full memory enrichment per turn** | Every non-crisis turn | Medium–high | `openAiFirstCompanionRuntime.js` 52; `buddyBrain.js` 484–513; `companionRelationshipOrchestrator.js` 100–125 |
| 6 | **Full `buddy-memory.json` read/write** per turn | Every finalize | Medium | `buddyBrain.js` 202–230, 423–481 |
| 7 | **`RECENT_SESSION_CACHE` unbounded Map** | Grows with unique userIds | Medium — leak-like | `buddyBrain.js` 84, 107–122 |
| 8 | **Dual JSONL append per request** (trace + sessions) | Every turn | Medium | `liveRequestTrace.js` 93–96; `buddyBrain.js` 759–772 |
| 9 | **`readAllSessions` full file load** on recall paths | Recall queries | Medium spike as file grows | `memoryRecallEngine.js` 55–58; `relationshipRecallEngine.js` 89–92 |
| 10 | **Heavy module graph at boot** | Every process start | Medium baseline RSS | `buddyBrain.js` 1–50+ requires; `RenderMemoryStabilityNotes.md` #4 unchecked |

---

## Detailed findings

### 1. OpenAI regeneration budget (highest code risk)

**Current behavior:**

| Stage | `maxAttempts` | File |
|-------|---------------|------|
| Initial compose | **4** | `openAiFirstCompanionRuntime.js:120` |
| Guard-triggered regen | **2** | `openAiFirstCompanionRuntime.js:199` |
| Inner composer default | 3 | `reasonFirstComposer.js:165` |

**Worst case:** 6 full API calls holding large prompt strings until GC.

**Inner validation loop** (`reasonFirstComposer.js` 231–293) may also retry on `validateReasonFirstReply` failure within each compose call.

**Recommendation:** Cap at **1 initial compose (maxAttempts: 2)** + **at most 1 guard regen (maxAttempts: 1)**. Total ≤ 3 API calls. Strip forbidden prose without regen when possible (already partially done at lines 211–217).

### 2. Evidence pack size

**Included in every OpenAI call:**

- `memory` (enriched — can include 40 relationship memories, timeline, journeys)
- `scripture`, `history`, `studyState`
- `evidenceCards` (up to 2 cloned cards)
- `discoveryReinforcement`
- `doctrine`, `concordanceHints`
- `conversationHistory`, `correctionLedger`, `companionThreadContext`

**Duplication:** Same slice in system prompt (`JSON.stringify(evidenceSlice, null, 2)`) and `userPayload.evidence`.

**Recommendation:**

- Single serialization path (system **or** user, not both with full pretty-print)
- Slim memory slice: top 3 memories, truncate assistant history to 200 chars
- `RenderMemoryStabilityNotes.md` item "Cap runtimeContext.memory" — **still unchecked**

### 3. Logging and tracing

| Logger | Sync? | Grows? | Production default |
|--------|-------|--------|-------------------|
| `live-request-trace.jsonl` | Yes (`appendFileSync`) | Unbounded | ON (`BUDDY_LIVE_TRACE=1`) |
| `live-response-capture.jsonl` | Yes | Unbounded | ON if uncommitted `routes/buddy.js` deployed |
| `buddy-sessions.jsonl` | Async append | Unbounded | Always |
| `buddy-quality-events.jsonl` | Various | Unbounded | If quality scoring writes |

**`liveRequestTrace`** includes `memoryUsage.rssMB` / `heapUsedMB` — good for observability, does not cap growth.

**Recommendation:**

- Gate `logLiveResponseCapture` behind `BUDDY_CAPTURE=1` (default off)
- One-line structured log per request: `{ requestId, ms, openaiCalled, regenerated, heapMB, rssMB }`
- Do not attach full `liveRequestTrace` to client payload in production

### 4. Session and memory stores

**Mitigation already shipped:**

- `getRecentSessions` tail-reads last **512 KB** of `buddy-sessions.jsonl` (`buddyBrain.js` 138–150)

**Still open:**

- `readAllSessions` loads entire file for recall engines
- `updateUserMemory` reads/writes full `buddy-memory.json` each turn
- `RECENT_SESSION_CACHE` — no LRU eviction

### 5. Module graph / lazy loading

`buddyBrain.js` synchronously requires grief, health, prayer, sabbath, relationship, study modules at boot even though `runBuddy` only calls `openAiFirstCompanionRuntime`.

`RenderMemoryStabilityNotes.md` recommends lazy-require `masterBuddyRuntime` — **not done**.

**Recommendation:** Lazy-require non-hot-path engines; keep cutover path imports minimal.

### 6. Standard 2 GB vs Pro 4 GB

| Scenario | Recommendation |
|----------|----------------|
| RSS peaks < 1.2 GB after debug off + regen cap | **Stay Standard** |
| RSS sustained > 1.7 GB with ≤ 5 concurrent chats | **Upgrade Pro 4 GB** |
| RSS grows linearly over 24h idle | **Memory leak investigation** before upgrade |
| OOM only on Free tier | **Standard already correct** |

Local single-user battery: **28 MB heap / 135 MB RSS** (`LiveRuntimeVerificationReport.md`) — understates production concurrency.

---

## Connection error correlation

| User sees | Backend state | Memory related? |
|-----------|---------------|-----------------|
| "I'm having trouble reaching the AI service" | `buildConnectionErrorReply` | Only if OOM caused OpenAI client failure |
| HTTP 500 `{ ok: false, error: "..." }` | Uncaught exception or missing module | Crash — not always OOM |
| "I'm here with you. Tell me a little more." | **Client mask** (`index.html:498`) | No — falsy `reply` |
| Render "memory limit exceeded" | Platform kill | **Yes** |
| OpenAI 429 | Quota | No — but triggers connection-error reply |

---

## Recommendations (ops + code — do not implement in this audit)

### Immediate ops (no code deploy)

1. Set `BUDDY_DEBUG=0` and `BUDDY_LIVE_TRACE=0` on Render unless actively debugging.
2. Confirm deployed commit does **not** include uncommitted `liveResponseCapture` route wiring.
3. Manual restart after env change; watch Render memory graph for 24h.
4. Limit beta to ≤ 5 concurrent testers during profiling.
5. Confirm no `express.static('data')` in production.

### Short-term code (Phase 1 stability)

1. **Per-request memory logging** — log `rssMB`, `heapUsedMB`, `evidencePackBytes`, `openaiAttempts`, `regenerated` at end of `runOpenAiFirstCompanionRuntime`.
2. **Max one guard regen** — already one regen block; reduce inner `maxAttempts`.
3. **Smaller evidence packs** — slim memory; remove pretty-print `null, 2`.
4. **Disable heavy debug in production** — `coreRestorationDebug` off when `NODE_ENV=production` unless explicit flag.
5. **Gate `liveResponseCapture`** — env flag, default off.
6. **LRU cap on `RECENT_SESSION_CACHE`** — e.g. 500 users max.

### Medium-term

1. Tail-read or index for `memoryRecallEngine` / `relationshipRecallEngine`.
2. Lazy-require cold-path modules in `buddyBrain.js`.
3. Evidence pack builder cache for static JSON (continuity, concordance plan) — load once per process.
4. Disk rotation for JSONL files (daily truncate or size cap).

### Upgrade decision

**Upgrade to Render Pro 4 GB only if:** after debug-off and regen-cap deploy, metrics show repeated OOM or RSS > 1.7 GB under expected beta load.

---

## Memory logging proposal (spec only)

Add to `openAiFirstCompanionRuntime` return path and `liveRequestTrace`:

```json
{
  "memory": {
    "rssMB": 0,
    "heapUsedMB": 0,
    "heapTotalMB": 0,
    "evidencePackApproxBytes": 0,
    "openaiAttempts": 0,
    "regenerated": false
  }
}
```

Log one JSON line to stdout (not full evidence pack). Enables correlating failed chats with Render metrics timeline.

---

## What is NOT a memory issue

- Wrong third-heaven doctrine → evidence/validator gap (`PostCrashBibleBuddyRestorationPlan.md`)
- Study-loop text in reply → template responder or guard miss (not heap)
- Missing `answerVerifier` → deploy gap (crash, not OOM) — fixed `1095f92`
- OpenAI quota 429 → billing/quota

---

## Top 10 memory risks summary table

| # | Risk | Mitigation priority |
|---|------|---------------------|
| 1 | 4+2 OpenAI attempt stack | P0 — cap attempts |
| 2 | Duplicate evidence JSON in prompts | P0 — single slim serialization |
| 3 | `BUDDY_DEBUG` + `BUDDY_LIVE_TRACE` in prod | P0 — env change |
| 4 | `liveResponseCapture` full body sync write | P0 — gate or remove |
| 5 | Full memory enrichment to OpenAI | P1 — slim slice |
| 6 | Full buddy-memory.json R/W per turn | P1 — incremental or debounce |
| 7 | Unbounded session cache Map | P1 — LRU |
| 8 | Growing JSONL files + sync trace | P2 — rotation, async |
| 9 | Full session file read on recall | P2 — tail-read |
| 10 | Heavy boot module graph | P2 — lazy require |

---

## Recommended next implementation phase (infrastructure only)

**Phase 1A — Ops (same day):** Disable prod debug flags; verify Render memory dashboard; confirm no capture route in deployed commit.

**Phase 1B — Code (next PR):** Memory logging + regen cap + slim evidence serialization + gate capture.

**Phase 1C — Measure (48h):** If stable on Standard, defer 4 GB upgrade. If not, upgrade + continue code slimming.

**Do not mix** doctrine restoration (Evidence Cards, validators) in the same PR as memory work — separate deploy risk.

---

## Related documents

- `RenderMemoryStabilityNotes.md` — prior OOM notes (2026-06-01)
- `RenderStabilityVerificationReport.md` — Free tier OOM context
- `RenderParityFixReport.md` — crash fix `1095f92`
- `LiveRuntimeVerificationReport.md` — local RSS baseline
- `EmptyReplyRootCauseReport.md` — client mask vs connection error
- `PostCrashBibleBuddyRestorationPlan.md` — doctrine restoration (separate track)

**End of memory audit — audit only.**
