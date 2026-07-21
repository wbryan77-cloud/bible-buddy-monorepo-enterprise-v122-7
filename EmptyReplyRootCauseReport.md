# Empty Reply Root Cause Report

**Date:** 2026-06-01  
**Question traced:** `"What does Logos mean in John 1:1?"`  
**UI identity:** `public/index.html` Companion Chat (`userId: 'demo-user'`)  
**Method:** Repository static trace + local pipeline execution (`scripts/emptyReplyTrace.js`) — **no HTTP probes, no Render, no fixes.**

**Related:** `CompanionUIDivergenceReport.md`, `docs/regression-trace/empty-reply-trace-logos.json`

---

## Executive summary

The browser phrase `"I'm here with you. Tell me a little more."` is **not** proof that the backend returned that string. It fires when `index.html` evaluates `payload.reply` as **falsy** and substitutes its own fallback (`index.html:498`).

On **current cutover code** (`57b3f96` / `HEAD`), a successful `200` response from `/buddy/chat` **should not** produce an empty `reply` field when OpenAI fails — `openAiFirstCompanionRuntime` replaces the transient empty compose result with `buildConnectionErrorReply` (non-empty connection message). **`normalizePayload` does not strip `reply`.**

The **highest-confidence** explanations for falsy `payload.reply` in Companion UI are:

1. **Frontend parses HTTP error bodies without checking `res.ok` / `data.ok`** → `payload.reply` is `undefined` → client mask at line 498.
2. **HTTP `200` with `reply: ""`** after guard stripping or model empty JSON (cutover path allows pass-through).
3. **`runBuddy` throws** before `res.json` → `500` → same frontend bug as (1).
4. **Stale deploy** where `runBuddy` returns `null` / non-object → old server `normalizePayload` or throw on `reply.liveRequestTrace = trace`.

---

## PART A — Response shape trace

### A.1 Pipeline diagram

```
index.html sendMessage
  POST /buddy/chat
    routes/buddy.js handleBuddyChat
      runBuddy()                          [buddyBrain.js:987–1014]
        runOpenAiFirstCompanionRuntime()    [openAiFirstCompanionRuntime.js:39–333]
          composeReasonFirstReply()         [reasonFirstComposer.js:156–331]
          (optional guards / regen)         [openAiFirstCompanionRuntime.js:132–218]
          finalizeBuddyResponse()           [buddyBrain.js:673–796]
      normalizePayload(reply)               [routes/buddy.js:8–19, 47]
      res.json({ ok: true, reply: payload }) [routes/buddy.js:54]
  data = await res.json()                   [index.html:495]
  payload = data.reply (if object) else data [index.html:496]
  display payload.reply || FALLBACK         [index.html:498]
```

### A.2 Stage-by-stage field capture (Logos question, `demo-user`)

Local trace: `node scripts/emptyReplyTrace.js`  
Artifact: `docs/regression-trace/empty-reply-trace-logos.json`

| Stage | File | Function | Lines | `reply` value | `reply` type | Notes |
|-------|------|----------|-------|---------------|--------------|-------|
| OpenAI API failure (compose) | `reasonFirstComposer.js` | `composeReasonFirstReply` | 238–252 | `""` | string | **First empty assignment** when `!result.ok` |
| After connection fallback | `openAiFirstCompanionRuntime.js` | `runOpenAiFirstCompanionRuntime` | 132–138 | Connection error message (83 chars) | string | Replaces empty compose output |
| After `finalizeBuddyResponse` | `buddyBrain.js` | `finalizeBuddyResponse` | 673–796 | Same connection message | string | Polish only; does not clear |
| **Before `normalizePayload`** | `routes/buddy.js` | `handleBuddyChat` | 37 | Same | string | `runBuddy` return object |
| **After `normalizePayload`** | `routes/buddy.js` | `normalizePayload` | 8–9, 47 | **Unchanged** (pass-through) | string | Object returned as-is |
| **HTTP JSON `200`** | `routes/buddy.js` | `handleBuddyChat` | 54 | `{ ok: true, reply: { reply: "<connection message>", ... } }` | nested | `serializedLength`: 4749 in local trace |
| **index.html `payload`** | `index.html` | `sendMessage` | 496 | `payload.reply` = connection message | string | `clientFallbackUsed: false` |
| **index.html displayed** | `index.html` | `sendMessage` | 498 | Connection message shown | — | **Not** "Tell me a little more." |

**Local OpenAI outcome:** API `401` (invalid local key). Pipeline correctly substituted connection error; **reply was never empty at HTTP boundary.**

### A.3 Simulated failure modes (same trace script)

| Scenario | HTTP status | `data` shape | `payload` after line 496 | `payload.reply` | Line 498 shows |
|----------|-------------|--------------|--------------------------|-----------------|----------------|
| Happy / connection-error 200 | 200 | `{ ok: true, reply: { reply: "..." } }` | inner object | truthy string | Server text |
| Empty reply 200 (hypothetical) | 200 | `{ ok: true, reply: { reply: "" } }` | inner object | `""` | **"Tell me a little more."** |
| Missing message | 400 | `{ ok: false, error: "message is required" }` | **whole `data`** | `undefined` | **"Tell me a little more."** |
| Server throw | 500 | `{ ok: false, error: "..." }` | **whole `data`** | `undefined` | **"Tell me a little more."** |

---

## PART B — Where `reply` is lost

### B.1 Field tracking: `reply`, `answer`, `message`, `text`, `content`

| Field | Used as output? | Where set | Reaches HTTP `reply.reply`? |
|-------|-----------------|-----------|----------------------------|
| **`reply`** | **Yes — canonical** | `normalizeStructured` → `structured.reply` → `finalizeBuddyResponse` → `normalizePayload` pass-through | **Yes** |
| `answer` | Alternate read only | `responseContract.js:8` reads `structured.reply \|\| structured.answer` | **No** — not written by `openAiFirstCompanionRuntime` |
| `message` | Input only | Request body / `normalizeInput` | **No** |
| `text` | Stream deltas only | `routes/buddy.js` `/stream` line 104–110 | **No** on `/chat` |
| `content` | OpenAI internal | `reasonFirstComposer.js` `callOpenAI` completion | **No** — parsed into JSON `reply` field |

**No stage maps `answer` → `reply` for the Companion `/chat` path.** If OpenAI returned `{ "answer": "Logos means..." }` without `reply`, `normalizeStructured` falls back to `result.raw` (full JSON string), not empty — see `reasonFirstComposer.js:255–258`, `buddyBrain.js:652`.

### B.2 First place `reply` becomes empty

| Order | Location | File | Function | Lines | Condition | Persisted to HTTP? |
|-------|----------|------|----------|-------|-----------|-------------------|
| **1** | Compose API error | `reasonFirstComposer.js` | `composeReasonFirstReply` | **241** | `!result.ok` from `callOpenAI` | **No** — replaced below |
| 2 | OpenAI client missing | `reasonFirstComposer.js` | `callOpenAI` | 132–133 | `!openai` | Same replacement |
| 3 | Guard strip (possible) | `openAiFirstCompanionRuntime.js` | strip forbidden/dangerous | 211–216 | Entire text matches forbidden patterns | **Yes** if `openaiCalled: true` and strip leaves `""` |
| 4 | Model empty JSON | `reasonFirstComposer.js` | `normalizeStructured` | 256–262 | `{ "reply": "" }` with `openaiCalled: true` | **Yes** — pass-through |

**First persistent empty `reply` on HTTP (cutover code):** only if **`openaiCalled: true`** and final `structured.reply` is `""` after compose/guards/finalize — **not** on API-failure path (that uses connection message).

**First place UI sees falsy `reply` (most common for mask):** `index.html:496–498` when `data.reply` is not a nested object (HTTP errors) or nested `reply` is `""` / missing.

### B.3 `normalizePayload` behavior — does it strip?

```8:19:routes/buddy.js
function normalizePayload(reply) {
  if (reply && typeof reply === 'object') return reply;
  return {
    reply: String(reply || "I'm having trouble reaching the AI service right now. Please try again in a moment."),
    // ...
  };
}
```

| `runBuddy` return | `normalizePayload` result | `reply` stripped? |
|-------------------|---------------------------|-------------------|
| Object with `reply: "..."` | **Same object reference** | **No** |
| Object with `reply: ""` | **Same object, empty string** | **No** |
| `null` / `undefined` | New object with connection message | **No** — substitutes non-empty fallback |
| String / number | Wrapped with connection message | **No** |

**`normalizePayload` never removes a non-empty `reply` and never converts a non-empty `reply` to empty.**

### B.4 `handleBuddyChat` throw before JSON

```45:45:routes/buddy.js
  reply.liveRequestTrace = trace;
```

If `runBuddy` returns `null` / `undefined`, this line **throws** → `catch` → `500 { ok: false, error }` → UI shows **"Tell me a little more."** (no `reply` field).

---

## PART C — Response contract audit

### C.1 Expected schema — `routes/buddy.js` (HTTP envelope)

**Success (`200`):**

```json
{
  "ok": true,
  "reply": {
    "reply": "<string — user-visible answer>",
    "scripture": [],
    "mode": "companion",
    "confidence": "low|medium|high",
    "memory_used": false,
    "suggested_settings_change": null,
    "orb_state": "speaking",
    "safety_level": "standard",
    "admin_flags": [],
    "runtime": { },
    "quality": { },
    "coreDebug": null
  }
}
```

Optional: `coreDebug`, `liveRequestTrace` on inner `reply` object.

**Failure:**

| Status | Body |
|--------|------|
| 400 | `{ "ok": false, "error": "message is required" }` |
| 500 | `{ "ok": false, "error": "<exception message>" }` |

**Contract rule:** User-visible text lives at **`response.reply.reply`** (nested), not at top-level `reply` string.

### C.2 Actual schema — `openAiFirstCompanionRuntime` / `finalizeBuddyResponse`

Return value of `runBuddy` (before route envelope):

```json
{
  "reply": "<string>",
  "scripture": [],
  "mode": "companion",
  "confidence": "low|medium|high",
  "memory_used": false,
  "safety_level": "standard",
  "admin_flags": [],
  "orb_state": "speaking",
  "runtime": {
    "buddyRuntime": "core_openai_first",
    "masterRoute": "reason_first_openai | core_connection_error | crisis",
    "openAiCalled": true|false,
    "coreDebug": { }
  },
  "quality": { "score": 0-100, "issues": [], "passed": true },
  "coreDebug": { }
}
```

OpenAI system prompt contract (`buddyBrain.js:339–351`) requires model JSON with top-level **`reply`** field (not `answer`).

### C.3 Contract comparison — mismatch analysis

| Aspect | Route expects | Runtime produces | Frontend expects | Mismatch? |
|--------|---------------|------------------|------------------|-----------|
| Envelope | `{ ok, reply: object }` | Object passed to `normalizePayload` | `data.reply` must be **object** | **Only if `data.reply` is string/null** |
| User text field | `reply.reply` string | `structured.reply` string | `payload.reply` string | **Aligned when envelope correct** |
| Empty string | Allowed pass-through | Possible if guards strip all | Treated as **falsy** → mask | **Yes — semantic mismatch** |
| Error responses | `ok: false`, no `reply` | N/A | **Not handled** — parses as payload | **Yes — critical UI bug** |
| `answer` field | Not used | Not emitted | Not read | No |
| `text` / `content` | Not on `/chat` | Not emitted | Not read | No |

**Primary schema mismatch:** Frontend treats **`""` as failure** (fallback), while backend treats **`""` as valid pass-through** on `200 OK`. Secondary mismatch: frontend ignores **`ok: false`** on error responses.

---

## PART D — Frontend expectations (`index.html`)

### D.1 Required fields

| Field | Required? | Usage |
|-------|-----------|-------|
| `data.reply` | **De facto required** (as object) | Line 496: must be `typeof === 'object'` to unwrap correctly |
| `payload.reply` | **Required for real answer** | Line 498: displayed text |
| `payload.orb_state` | Optional | Line 497: orb animation |
| `payload.scripture` | Optional | Line 498: scripture block |
| `data.ok` | **Ignored** | Never checked |
| `res.ok` | **Ignored** | Never checked |

### D.2 Parsing logic

```495:498:public/index.html
        const data = await res.json();
        const payload = data.reply && typeof data.reply === 'object' ? data.reply : data;
        setOrb(payload.orb_state || 'speaking');
        addMessage('buddy', payload.reply || 'I'm here with you. Tell me a little more.', payload.scripture || []);
```

### D.3 Branch matrix

| Response shape | `payload` after 496 | `payload.reply` | User sees |
|----------------|---------------------|-----------------|-----------|
| `{ ok: true, reply: { reply: "Logos means..." } }` | inner object | `"Logos means..."` | OpenAI/server text |
| `{ ok: true, reply: { reply: "" } }` | inner object | `""` | **"Tell me a little more."** |
| `{ ok: true, reply: { reply: null } }` | inner object | `null` | **"Tell me a little more."** |
| `{ ok: true, reply: "string at wrong level" }` | **whole `data`** | `undefined` | **"Tell me a little more."** |
| `{ ok: true, reply: null }` | **whole `data`** | `undefined` | **"Tell me a little more."** |
| `{ ok: false, error: "..." }` | **whole `data`** | `undefined` | **"Tell me a little more."** |
| `{ ok: true, reply: { nested: { reply: "..." } } }` | inner object | `undefined` | **"Tell me a little more."** |
| Network / JSON throw | catch block | N/A | Different message (line 502) |

**Comparison:** `chat.html:278–288` and `beta.html:266–268` check `res.ok` and `data.ok` before display; **`index.html` does not.**

---

## PART E — Root cause ranking

### E.1 Exact stage where reply disappears (from UI perspective)

| Rank | Stage | Mechanism | User sees mask? |
|------|-------|-----------|-------------------|
| **1** | `index.html:498` | `payload.reply \|\| FALLBACK` when `payload.reply` falsy | **Yes — always here** |
| **2** | `index.html:496` | Error body used as `payload` when `data.reply` not object | **Yes** |
| **3** | `openAiFirstCompanionRuntime.js:211–216` | Guard strip reduces `structured.reply` to `""` while `openaiCalled: true` | Yes (after 200) |
| **4** | `reasonFirstComposer.js:241` | `reply: ''` on API error | **No on cutover** — replaced at 132–138 |
| **5** | `routes/buddy.js:45` | Throw if `runBuddy` null → 500 | Yes (via #2) |

### E.2 Object before / after key transitions (Logos, local trace)

**Before `normalizePayload` (API failure path):**

```json
{
  "reply": "I'm having trouble reaching the AI service right now. Please try again in a moment.",
  "replyLength": 83,
  "openAiCalled": false,
  "finalAnswerAuthor": "connection_error"
}
```

**After `normalizePayload`:** identical (pass-through object).

**HTTP JSON:** `{ "ok": true, "reply": { "reply": "<same 83-char string>", ... } }`

**UI:** displays connection message — **mask not used.**

**Transient compose-only (not on wire):**

```json
{
  "composeReasonFirstReply.structured.reply": "",
  "openaiCalled": false,
  "apiError": "401 ..."
}
```

### E.3 Does OpenAI answer exist but get discarded?

| Path | OpenAI answer exists? | Discarded? |
|------|----------------------|------------|
| API success | Yes in `composed.structured.reply` | **No** — polished and returned |
| API failure (cutover) | No | N/A — connection message substituted; **not empty** |
| API failure compose | No (`reply: ''` briefly) | Replaced before HTTP — **not discarded user text** |
| Guard strip all text | May have existed | **Possibly** — stripped to `""`, then client masks |
| Frontend error parse | Server may have set `reply` on 500 body | **Never read** — UI uses wrong object |

### E.4 Is `normalizePayload` stripping it?

**No.** It only wraps non-objects. Empty string pass-through is the issue, not stripping.

### E.5 Is frontend expecting wrong schema?

**Partially.**

- Correct for happy path: expects `data.reply` object with string `payload.reply` — **matches** cutover backend.
- **Wrong for errors:** does not require `data.ok` or nested `reply` on failures.
- **Wrong semantically:** treats `reply: ""` as “show generic prompt” instead of showing empty or server error text.

### E.6 Backend vs frontend schema

| | Backend (200) | Frontend needs | Aligned? |
|---|---------------|----------------|----------|
| Nested `reply.reply` string | Yes | Yes | **Yes** |
| `ok: false` errors | No `reply` field | Checks nothing | **No** |
| Empty string | Valid 200 | Falsy → mask | **No** |

---

## Conclusions

1. **The browser masks failures** at `public/index.html:498` whenever `payload.reply` is falsy — including HTTP **400/500** responses that the UI never validates.

2. **On cutover code, `normalizePayload` is not the empty-reply culprit** — it pass-throughs objects unchanged, including `reply: ""`.

3. **The first code assignment of `reply: ""`** is `composeReasonFirstReply` on OpenAI failure (`reasonFirstComposer.js:241`), but **`openAiFirstCompanionRuntime` replaces it** before HTTP unless `openaiCalled: true` with a stripped-empty final reply.

4. **Local Logos trace with API failure** produced a **non-empty** connection message end-to-end; **`clientFallbackUsed: false`**. The exact phrase **"Tell me a little more."** appears only in simulated **400/500** parsing or hypothetical **empty `reply: ""` on 200**.

5. **Regression PASS does not exercise** `index.html` parsing or HTTP error handling — so regression can pass while UI shows the mask.

---

## Artifacts

| File | Purpose |
|------|---------|
| `scripts/emptyReplyTrace.js` | Reproducible local pipeline trace |
| `docs/regression-trace/empty-reply-trace-logos.json` | Captured stage outputs |
| `CompanionUIDivergenceReport.md` | Client mask discovery |

**No fixes. No deploy. No push.**

**End of report.**
