# OpenAI Execution Stability Audit

**Date:** 2026-06-07  
**Priority:** CRITICAL  
**Scope:** Diagnosis only — why OpenAI calls fail and users see connection fallbacks  
**Constraints honored:** No doctrine, evidence, validator, traceability, approval-gate, or runtime changes. No push. No deploy.

---

## Executive summary

The user-visible fallback **"I'm having trouble reaching the AI service right now. Please try again in a moment."** is **not** produced by OpenAI. It is synthesized locally when `composeReasonFirstReply` returns `openaiCalled: false`, and `openAiFirstCompanionRuntime` replaces the empty compose result with `buildConnectionErrorReply`.

**Two distinct failure classes block Phase 1B measurement:**

| Class | Symptom | `openaiCalled` | `claims[]` | Evidence in repo |
|-------|---------|----------------|------------|------------------|
| **A — API / client failure** | Connection message every turn, fast (~0.5–1s/turn) | `false` | missing | `401`, `openai_unavailable`, `429`, `ETIMEDOUT` in `coreDebug.errorMessage` / `runtime.connectionError` |
| **B — Infrastructure failure** | Connection message or HTTP 500 mid-load; Render restart logs | `false` (in-flight) | missing | Render "exceeded memory limit", exit **134**, process restart |

Phase 1B live measurement (`LiveAuthorityFailureDistribution.json`, 2026-06-07) shows **Class A** behavior: all 8 non-A topics returned `finalAnswerAuthor: "connection_error"`, `openaiCalled: false`, empty `claimsGenerated`, RSS growth only 78→137 MB (not OOM). A single-turn compose diagnostic in the same environment returned **`401 Incorrect API key provided`** — confirming API auth failure, not doctrine or measurement-script logic.

Render memory restart events (Class B) remain a **separate production risk** documented in prior audits and still architecturally possible under concurrent load even on Standard (2 GB).

---

## 1. OpenAI call path (production `/buddy/chat`)

| Step | File | Lines | Action |
|------|------|-------|--------|
| HTTP entry | `routes/buddy.js` | 55–56 | `runBuddy(...)` |
| Hard cutover router | `services/buddyBrain.js` | 1009–1016 | Always `runOpenAiFirstCompanionRuntime` (ignores `BUDDY_OPENAI_FIRST=0` with warning) |
| Runtime orchestration | `services/openAiFirstCompanionRuntime.js` | 44–129 | Build evidence pack, first `composeReasonFirstReply` |
| Compose loop | `services/reasonFirstComposer.js` | 198–403 | Build prompt, `callOpenAI`, validate, optional internal regen |
| HTTP client | `services/openaiClient.js` | 1–15 | Singleton `OpenAI` instance at module load |
| API call | `services/reasonFirstComposer.js` | 173–192 | `openai.chat.completions.create(...)` |
| Failure gate | `services/openAiFirstCompanionRuntime.js` | 144–159 | `buildConnectionErrorReply` when `!openaiCalled` |
| Finalize | `services/buddyBrain.js` | 674–798 | Memory/session persistence (always runs) |
| Response normalize | `routes/buddy.js` | 68–80 | `normalizePayload`; optional `coreDebug` |

**Active runtime:** `openAiFirstCompanionRuntime` only for `/buddy/chat`. `masterBuddyRuntime.js` is bypassed but still present in the repo (dead path for chat unless env forces legacy — cutover blocks it).

---

## 2. Timeout handling

| Finding | Detail |
|---------|--------|
| Application timeout | **None.** `callOpenAI` has no `AbortController`, no `timeout` option, no `Promise.race`. |
| SDK default | `openai` **^4.104.0** — requests use SDK default timeout (typically long, on the order of minutes). |
| Classification | `services/liveRequestTrace.js` **16–22** maps `timeout`, `ETIMEDOUT`, `ECONNRESET` in error strings to `OpenAITimeout` — but only **after** failure, no proactive cutoff. |
| User effect | Slow hangs possible under network stall; fast failures (401, connection reset) return in &lt;1s. |

---

## 3. Retry logic

| Layer | Retries | File | Lines |
|-------|---------|------|-------|
| `callOpenAI` | **0** — single `create()` per invocation | `reasonFirstComposer.js` | 173–192 |
| Compose internal loop | **1 attempt** when `coreRestoration: true` (`attemptCap = 1`) | `reasonFirstComposer.js` | 211, 275–297 |
| Guard regen | **+1 compose** (another single attempt) if ownership/directness/forbidden/bible-only/claim guards fail | `openAiFirstCompanionRuntime.js` | 203–247 |
| **Max OpenAI HTTP calls per turn (current code)** | **2** (initial + guard regen) | — | — |

**No exponential backoff. No retry on 429/5xx/ECONNRESET.** Any transient API error on the first (or only) attempt becomes a connection fallback.

---

## 4. Guard regeneration calls

Triggered in `openAiFirstCompanionRuntime.js` **203–247** when first compose succeeds (`openaiCalled: true`) but any guard fails:

- `validateOwnershipReply`
- `evaluateDirectness`
- `detectForbiddenProse`
- `validateBibleOnlyAuthority`
- `validateClaimToScripture`

Regen calls `composeReasonFirstReply` again with `maxAttempts: 1`, `regenInstruction` from the failing guard.

| Outcome | `openaiCalled` | User-visible |
|---------|----------------|--------------|
| Regen succeeds | `true` | OpenAI-authored reply (possibly degraded) |
| Regen API fails | **stays `true`** if first compose succeeded — first reply kept | OpenAI reply (guards may still fail; degradation path may apply) |
| **First compose API fails** | `false` | Connection error — **regen never runs** |

Guard regen does **not** cause `openaiCalled: false` unless the **first** compose never reached OpenAI successfully.

---

## 5. Multiple OpenAI calls per turn

| Scenario | Calls | Notes |
|----------|-------|-------|
| Happy path | 1 | Compose passes all guards |
| Guard failure + regen | 2 | Second full prompt + evidence serialization |
| Crisis | 0 | `H.fallbackReply` — crisis copy, not connection message |
| Phase 1B measurement (9 topics + 5 case-study turns) | Up to **28** sequential calls | Script loops topics; no parallelism |

Each call serializes:

- **System prompt** with full evidence JSON (`buildComposerSystemPrompt` → ~14 KB for third heaven per measurement)
- **User payload** with duplicate `evidence` object (`reasonFirstComposer.js` **237–247**)

---

## 6. Memory growth per request

| Observation | Source |
|-------------|--------|
| Phase 1B topic `third_heaven`: RSS **78 → 137 MB** across 9 sequential topics | `LiveAuthorityFailureDistribution.json` |
| Per-turn finalize: read/write full `buddy-memory.json` | `buddyBrain.js` **177–191, 202–214** |
| Session append + `RECENT_SESSION_CACHE` Map (per userId, last 12 turns) | `buddyBrain.js` **84, 107–123** |
| `enrichRuntimeContextWithMemory` loads summaries, relationship, prayer, study, timeline | `buddyBrain.js` **484–513** |
| Evidence pack JSON size logged when `BUDDY_REQUEST_MEMORY_LOG=1` | `openAiFirstCompanionRuntime.js` **401–419** |
| Slimmer caps memory snippets (3), history (4 turns) | `evidencePackSlimmer.js` **5–48** |

**Measurement implication:** Phase 1B failures are **not** explained by memory exhaustion (RSS stayed &lt;140 MB). Production Render OOM is a **concurrency × spike** problem, not observed in sequential local measurement.

---

## 7. Render restart causes (correlation)

Documented in `RenderMemoryStabilityNotes.md`, `RenderStabilityVerificationReport.md`, `RenderMemoryStabilityAudit.md`:

| Cause | Mechanism | Connection to OpenAI failure |
|-------|-----------|------------------------------|
| **OOM kill (exit 134)** | Free 512 MB tier exceeded; Standard 2 GB mitigates | In-flight `chat.completions.create` aborts; next request hits cold process or errors |
| **Concurrent `/buddy/chat`** | No OpenAI semaphore; N users × 2 calls × large prompts | RSS spike toward plan limit |
| **Sync persistence** | `writeFileSync` on memory store; `appendFileSync` when trace/capture enabled | GC pressure + I/O blocking |
| **Heavy boot graph** | Large `require()` tree at `server.js` start | High baseline RSS leaves less headroom |
| **Misconfigured `OPENAI_API_KEY` on Render** | Key missing/rotated in dashboard | **Every** turn → connection error (Class A), process stays up |

Restart events + connection errors together suggest **Class B** (process died). Connection errors **without** restart on every turn suggest **Class A** (API/auth).

---

## 8. Request concurrency

| Mechanism | Behavior |
|-----------|----------|
| Express | Default — concurrent requests on single Node process |
| OpenAI gate | **None** — no queue, no rate limiter, no `p-limit` |
| Measurement script | Sequential `for` loop — no concurrency |
| Live beta (10–20 testers) | Multiple overlapping compose calls possible |

Under memory pressure, concurrent composes multiply heap spikes (duplicate 14 KB+ prompts × 2 attempts × N users).

---

## 9. Connection fallback triggers

The connection message is defined once:

```68:69:services/coreResponseGuards.js
const CONNECTION_ERROR_USER_MESSAGE =
  "I'm having trouble reaching the AI service right now. Please try again in a moment.";
```

Emitted via `buildConnectionErrorReply` (**71–91**).

---

## 10. Every failure path → `openaiCalled: false` / connection message

### Production path (live `/buddy/chat` and `runBuddy`)

| # | File | Lines | Trigger condition | User-visible effect |
|---|------|-------|-----------------|---------------------|
| 1 | `openaiClient.js` | 11–13 | `require('openai')` throws | `openai` stays `null` → row 2 |
| 2 | `reasonFirstComposer.js` | 174–176 | `!openai` (module failed to load) | `apiError: 'openai_unavailable'` → connection message |
| 3 | `reasonFirstComposer.js` | 190–297 | `chat.completions.create` throws (401, 403, 429, 5xx, ECONNRESET, ETIMEDOUT, DNS, etc.) | `openaiCalled: false`, `reply: ''` → connection message |
| 4 | `openAiFirstCompanionRuntime.js` | 144–159 | `!composed.openaiCalled` after step 3 | **`buildConnectionErrorReply`** — connection message, `admin_flags: ['core_connection_error']`, `finalAnswerAuthor: 'connection_error'` |
| 5 | `openAiFirstCompanionRuntime.js` | 62–100 | `safety.level === 'crisis'` | Crisis hotline text — **not** connection message; `openaiCalled: false` |
| 6 | `routes/buddy.js` | 21–24 | `normalizePayload`: `reply` is not an object (null/primitive) | Connection message at HTTP layer (secondary safety net) |
| 7 | `routes/buddy.js` | 92–100 | Uncaught exception in `handleBuddyChat` | HTTP **500** `{ ok: false, error }` — **not** connection message |

### Non-production / bypassed paths (not active for `/buddy/chat` cutover)

| # | File | Lines | Trigger | Effect |
|---|------|-------|---------|--------|
| 8 | `masterBuddyRuntime.js` | 362+ | Direct OpenAI in legacy runtime | Errors fall through legacy fallbacks — **not** current chat path |
| 9 | `reasonFirstBuddyRuntime.js` | 68–105 | Crisis / empty | `openaiCalled: false` — experiment runtime |
| 10 | `minimalReasonFirstRuntime.js` | 157–194 | Test harness failures | `openaiCalled: false` |
| 11 | `companionOperatingModelExperiment.js` | 372–442 | Experiment compose failure | `openaiCalled: false` |

### Operational false positive

| # | File | Lines | Issue |
|---|------|-------|-------|
| 12 | `openaiClient.js` | 10 | Logs **`✅ OpenAI client ready`** when module loads — **does not validate API key** |
| 13 | `buddyRuntimeConfig.js` | 56–58 | Warns only at **server startup** if key missing; invalid key not detected until first API call |

---

## Ranked root causes (probability)

| Rank | Cause | Probability | Primary evidence | Affects Phase 1B? |
|------|-------|-------------|------------------|-------------------|
| **1** | **Invalid / missing / rotated `OPENAI_API_KEY`** (401/403) | **Very high** (local + measurement) | Diagnostic compose `401`; `live-response-capture-run.json` `OpenAIAuthError`; all Phase 1B topics `connection_error` in &lt;6s | **Yes — primary blocker** |
| **2** | **No retry on transient API errors** (429, 5xx, ECONNRESET) | **High** (amplifier) | Single attempt in `callOpenAI`; no backoff | Yes — turns flaky failures into 100% fallback |
| **3** | **Render OOM → process restart (exit 134)** | **High** (production under load) | Render incident reports; `RenderMemoryStabilityNotes.md` | Intermittent — correlates with restart events |
| **4** | **Concurrent requests × 2 OpenAI calls × large evidence prompts** | **Medium–high** (production) | 14 KB+ system prompt × 2 attempts; no concurrency cap | Intermittent under beta load |
| **5** | **OpenAI rate limit 429** | **Medium** (burst testing) | Classified in `liveRequestTrace.parseApiError` | Intermittent |
| **6** | **Network timeout / connection reset** | **Medium** | No app timeout; SDK long wait possible | Intermittent |
| **7** | **`openai` module failed to load** (`openai_unavailable`) | **Low** when startup shows ready | `bible-only-authority-results.json` offline runs | Only if `require` fails |
| **8** | **Guard regen second call failure** | **Low** for `openaiCalled: false` | First compose must fail for connection path; regen failure keeps first success | Rare for connection message |
| **9** | **HTTP `normalizePayload` null reply** | **Very low** | Only if `runBuddy` returns non-object | Edge case |

---

## Phase 1B measurement linkage

When `openaiCalled: false`:

1. `composeReasonFirstReply` returns empty `reply`, no `claims[]`
2. Measurement classifies as **E** (claim extraction failure) — correct downstream signal, wrong root cause
3. `validatorDecision.postPassed: true` on empty reply is a **measurement artifact** (no claims to fail)

**Doctrine measurement is blocked by runtime instability (Class A or B), not by claim validators or retrieval.** Retrieval succeeded for 8/9 topics (`cardIds` present, ~14 KB evidence in prompt) while OpenAI never authored.

---

## Diagnostic commands (no code changes)

```bash
# Confirm key presence (not validity)
echo ${OPENAI_API_KEY:+KEY_SET}

# Server startup diagnostics
node -e "require('./services/buddyRuntimeConfig').logStartupDiagnostics()"

# Single compose probe (inspect apiError only — do not log full error to shared logs)
node -e "
const { composeReasonFirstReply } = require('./services/reasonFirstComposer');
const { buildRetrievalEvidencePack } = require('./services/retrievalEvidencePack');
(async () => {
  const pack = buildRetrievalEvidencePack({ userId: 'probe', message: 'What is the third heaven?', routingHintsOnly: true });
  const r = await composeReasonFirstReply({ userId: 'probe', mode: 'COMPANION', personaKey: 'ADAPTIVE_COMPANION', message: 'What is the third heaven?', safety: { level: 'standard' }, profile: {}, runtimeContext: {}, evidencePack: pack, coreRestoration: true });
  console.log({ openaiCalled: r.openaiCalled, apiError: (r.apiError||'').slice(0,80) });
})();
"
```

On Render: check **Logs** for `WARN: OPENAI_API_KEY missing`, **Metrics → Memory** before restart, and `runtime.connectionError` / `coreDebug.errorMessage` on failing chat responses.

---

## Related artifacts

- `OpenAICallFlowMap.md` — visual call flow
- `RenderRestartRootCauseAudit.md` — OOM/restart deep dive
- `docs/regression-trace/LiveAuthorityFailureDistribution.json` — Phase 1B live run
- `Phase1BMeasurementRepairReport.md` — measurement script repair (separate from OpenAI stability)

**No fixes implemented. No production logic modified in this audit.**
