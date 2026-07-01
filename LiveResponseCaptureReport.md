# Live Response Capture Report

**Date:** 2026-06-06  
**Priority:** CRITICAL  
**Question:** `"What does Logos mean in John 1:1?"`  
**UI:** Companion Chat (`public/index.html`, `userId: demo-user`)  
**Capture log:** `data/live-response-capture.jsonl`  
**Correlated run:** `docs/regression-trace/live-response-capture-run.json`  
**Request ID:** `9dfb98ac-67c8-4f0c-8d3a-cbec6e5efbdd`

**Constraints:** Local instrumented server (no deploy, no push). Temporary logging added per emergency capture spec.

---

## PART A — Server instrumentation

### Added files / hooks

| Component | Location |
|-----------|----------|
| Capture writer | `services/liveResponseCapture.js` → `data/live-response-capture.jsonl` |
| Route hook | `routes/buddy.js` → `emitBuddyChatJson()` immediately before every `res.json` on `/buddy/chat` |
| Reproduce runner | `scripts/liveResponseCaptureRun.js` |

### Fields logged per response

| Field | Source |
|-------|--------|
| `timestamp` | ISO at write time |
| `requestId` | `X-Request-Id` header or `crypto.randomUUID()` |
| `userId` | Request body |
| `message` | Request body |
| `httpStatus` | 200 / 400 / 500 |
| `responseBody` | Full JSON sent to client |
| `shape` | Derived validation (Part B) |

---

## PART B — Response shape validation (captured record)

**Server log entry** (`timestamp`: `2026-06-06T05:29:19.172Z`):

```json
{
  "ok": true,
  "reply": "<object>",
  "replyType": "object",
  "replyReply": "I'm having trouble reaching the AI service right now. Please try again in a moment.",
  "replyReplyType": "string",
  "replyReplyMissing": false,
  "replyReplyEmptyString": false,
  "replyUndefined": false,
  "replyNull": false,
  "runtimeUsed": "core_openai_first",
  "finalAnswerAuthor": "connection_error",
  "openaiCalled": false,
  "openaiResponseReceived": false
}
```

| Check | Result |
|-------|--------|
| `reply === undefined` | **false** |
| `reply === null` | **false** |
| `reply.reply === ""` | **false** |
| `reply.reply` missing | **false** |

---

## PART C — Browser reproduction (Companion UI path)

Matched by **`requestId`** and **`timestamp`** (~583 ms window).

### 1. Browser request payload (exact `index.html` body)

```json
{
  "userId": "demo-user",
  "mode": "COMPANION",
  "personaKey": "ADAPTIVE_COMPANION",
  "message": "What does Logos mean in John 1:1?"
}
```

`POST http://127.0.0.1:51406/buddy/chat`  
Header: `X-Request-Id: 9dfb98ac-67c8-4f0c-8d3a-cbec6e5efbdd`

### 2. Browser response payload

| Field | Value |
|-------|-------|
| HTTP status | **200** |
| `res.ok` | **true** |
| `data.ok` | **true** |
| `data.reply` | **object** |
| `data.reply.reply` | `"I'm having trouble reaching the AI service right now. Please try again in a moment."` |
| Raw body length | 5868 bytes |

### 3. Server response log entry

| Field | Value |
|-------|-------|
| `timestamp` | `2026-06-06T05:29:19.172Z` |
| `requestId` | `9dfb98ac-67c8-4f0c-8d3a-cbec6e5efbdd` |
| `userId` | `demo-user` |
| `message` | `What does Logos mean in John 1:1?` |
| `httpStatus` | `200` |
| `responseBody` | Identical to browser `parsed` JSON |

**Correlation:** Request ID match confirms browser and server saw the same envelope.

---

## PART D — Root cause proof

### Simulated `index.html` evaluation (lines 495–498)

```javascript
const data = await res.json();
const payload = data.reply && typeof data.reply === 'object' ? data.reply : data;
const displayed = payload.reply || 'I'm here with you. Tell me a little more.';
```

| Field | Captured value |
|-------|----------------|
| **`payload.reply`** | `"I'm having trouble reaching the AI service right now. Please try again in a moment."` |
| `payload.reply` type | **string** |
| `payload.reply` falsy? | **false** |
| `clientFallbackUsed` | **false** |
| **Text rendered to screen** | Connection message — **NOT** the mask |

### Answer: when would the mask display?

At the moment the UI would show *"I'm here with you. Tell me a little more."*, **`payload.reply` must be falsy:**

| `payload.reply` value | Mask? | Typical cause |
|----------------------|-------|----------------|
| **undefined** | **Yes** | `{ ok: false, error }` — no nested `reply`; `index.html` ignores `data.ok` |
| **null** | **Yes** | `{ ok: true, reply: null }` or nested `reply: null` |
| **empty string `""`** | **Yes** | `{ ok: true, reply: { reply: "" } }` |
| **missing object** | **Yes** | `{ ok: true, reply: {} }` → `payload.reply` undefined |
| **non-empty string** | **No** | Valid server answer (this capture) |

### This capture vs reported symptom

| Observation | Proof |
|-------------|-------|
| Server sent valid nested `reply.reply` | `shape.replyReplyMissing: false`, length 83 |
| UI would **not** use mask for this response | `clientFallbackUsed: false` |
| Reported live mask | **Not reproduced** by this capture — requires **different** browser response than logged here |

### First location value becomes falsy (mask path — proven by simulation, not this capture)

**File:** `public/index.html`  
**Line:** **496** (unwrap) or **498** (fallback OR)

```
When data.ok === false OR data.reply is not a proper object with non-empty .reply:
  → payload.reply becomes undefined | null | ""
  → line 498 substitutes mask
```

**Control proof (HTTP 500 shape, not this Logos run):**

```json
{ "ok": false, "error": "..." }
```

→ `payload = data` → `payload.reply` = **undefined** → mask at **line 498**.

---

## PART E — Deliverable summary

### RAW REQUEST

```http
POST /buddy/chat
Content-Type: application/json
X-Request-Id: 9dfb98ac-67c8-4f0c-8d3a-cbec6e5efbdd

{"userId":"demo-user","mode":"COMPANION","personaKey":"ADAPTIVE_COMPANION","message":"What does Logos mean in John 1:1?"}
```

### RAW RESPONSE

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"ok":true,"reply":{"reply":"I'm having trouble reaching the AI service right now. Please try again in a moment.",...}}
```

(Full body in `docs/regression-trace/live-response-capture-run.json` → `browserResponse.rawBody`.)

### SERVER RESPONSE (logged)

One line in `data/live-response-capture.jsonl` — `requestId` `9dfb98ac-67c8-4f0c-8d3a-cbec6e5efbdd`, `httpStatus` 200, `shape.replyReply` non-empty.

### UI VALUE OF `payload.reply`

```
"I'm having trouble reaching the AI service right now. Please try again in a moment."
```

**Type:** string  
**Falsy:** no  
**Mask used:** no  
**Displayed:** same connection message

### FIRST FALSITY LOCATION (for mask symptom)

**Not reached in this capture.**

When mask **does** fire:

| Step | Location | What becomes falsy |
|------|----------|-------------------|
| 1 | `index.html:496` | `data.reply` not object → `payload` = error body → `payload.reply` **undefined** |
| 2 | `index.html:498` | `payload.reply \|\| MASK` → mask string emitted |

---

## Conclusion

1. **Instrumented capture is live** — every `/buddy/chat` JSON response is logged to `data/live-response-capture.jsonl` with shape validation.

2. **This Logos reproduction** (Companion UI payload, matched requestId) returned **HTTP 200** with **non-empty** `reply.reply`. **`payload.reply` was truthy** — the UI mask **did not apply**.

3. **The mask phrase is not in the server response** for this capture. It is only injected client-side when `payload.reply` is falsy (`index.html:498`).

4. **To capture the exact response that causes the live mask**, repeat on the environment where the mask appears: check `data/live-response-capture.jsonl` for that request and compare `shape.replyReplyMissing`, `shape.replyReplyEmptyString`, and `httpStatus`. Expect **`httpStatus` ≠ 200** or **`reply.reply` empty/missing** when mask is shown.

---

## Reproduce

```bash
node scripts/liveResponseCaptureRun.js
tail -1 data/live-response-capture.jsonl | jq .
```

---

**STOP — report only. Instrumentation remains for ongoing capture. No deploy. No push.**

**End of report.**
