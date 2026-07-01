# Frontend Execution Trace Report

**Date:** 2026-06-01  
**Priority:** CRITICAL  
**Scope:** Frontend-only trace — no fixes, deploy, push, doctrine, or runtime changes.

**Premise (from investigation):** Regression passes, OpenAI responds, `uiContractReproduce` receives valid nested JSON — yet Companion UI may still show `"I'm here with you. Tell me a little more."`

**Artifacts:** `docs/regression-trace/ui-contract-reproduce-logos.json`, `docs/regression-trace/frontend-execution-simulate.json`, `scripts/frontendExecutionSimulate.js`

---

## Executive finding

The exact phrase **only exists in one frontend file:** `public/index.html` line **498**.

There is **no** second render path, **no** message overwrite, **no** conversation restore, and **no** external JS on `index.html` that can replace a valid answer after fetch.

**Logical conclusion:** If the browser receives the same parsed JSON as `uiContractReproduce` (non-empty `data.reply.reply`), line 498 **cannot** emit the mask. The mask fires **if and only if** `payload.reply` is falsy at line 498. Any live mask while reproduce shows valid nested `reply` implies the **browser fetch outcome differs** from the Node reproduce script (status, body, or parse result) — not that a valid string was discarded post-parse.

---

## PART A — Actual UI identification

### Pages that call `/buddy/chat`

| Page | URL (typical) | HTML file | JS | Send handler | Mask phrase? |
|------|---------------|-----------|-----|--------------|--------------|
| **Companion Chat (homepage)** | **`/`** | **`public/index.html`** | **Inline `<script>` only** | **`sendMessage`** | **Yes — line 498** |
| Tester Chat | `/chat.html` (static) | `public/chat.html` | Inline | `sendToBuddy` | No — `'(no reply)'` |
| Beta | `/beta` | `public/beta.html` | Inline | `sendToBuddy` | No — `'(no reply)'` |
| Lab | `/lab.html` | `public/lab.html` | Inline + `/admin/ai/tester-chat` | Not `/buddy/chat` | N/A |
| Realtime | varies | `public/realtime-client.js` | Module | `/api/realtime/session` | N/A |

### Server routing (`server.js`)

| Route | Serves |
|-------|--------|
| `GET /` | `public/index.html` (line 151–152) |
| `GET /beta` | `public/beta.html` |
| `express.static(public)` | `/chat.html`, assets |
| `POST /buddy/chat` | `routes/buddy.js` (all pages above) |

### Which page shows the mask?

**Only `public/index.html`** — section **"Companion Chat"** (`<h2>Companion Chat</h2>`, line 391).

**Identification signals for live user:**

- Page title: *"Bible Buddy — Living Companion"*
- Dark gradient UI with orb stage
- Label: **Companion Chat**
- Hardcoded `userId: 'demo-user'` in fetch body
- Fallback text: *"I'm here with you. Tell me a little more."* (curly apostrophe in `I'm`)

If the user sees that **exact** phrase, they are on **`index.html`**, not `chat.html` or `beta.html`.

---

## PART B — Send button trace (`index.html`)

### Chain (button click → render)

| Step | File | Function / element | Lines |
|------|------|-------------------|-------|
| 1 | `public/index.html` | `<button type="submit">` inside `<form onsubmit="sendMessage(event)">` | 396–398 |
| 2 | `public/index.html` | `sendMessage(event)` — `event.preventDefault()` | 472–473 |
| 3 | `public/index.html` | Empty check `if (!message) return` | 474–475 |
| 4 | `public/index.html` | `addMessage('user', message)` | 477 |
| 5 | `public/index.html` | `setOrb('listening')` | 479 |
| 6 | `public/index.html` | `setTimeout(() => setOrb('thinking'), 420)` | 481 |
| 7 | `public/index.html` | `fetch('/buddy/chat', { POST, JSON body })` | 484–493 |
| 8 | `public/index.html` | `const data = await res.json()` | 495 |
| 9 | `public/index.html` | `const payload = data.reply && typeof data.reply === 'object' ? data.reply : data` | 496 |
| 10 | `public/index.html` | `setOrb(payload.orb_state \|\| 'speaking')` | 497 |
| 11 | `public/index.html` | **`addMessage('buddy', payload.reply \|\| MASK, ...)`** | **498** |
| 12 | `public/index.html` | `setTimeout(() => setOrb('idle'), 4200)` | 499 |
| 13 | `public/index.html` | `addMessage` → `div.textContent = text` → `messages.appendChild` | 449–460 |

### Alternate entry: Quick buttons

| Step | Function | Lines |
|------|----------|-------|
| `quickAsk(text)` | Sets input, calls `sendMessage(new Event('submit'))` | 467–469 |

### Not in chain

- No `res.ok` check
- No `data.ok` check
- No `sendBtn.disabled`
- No external script tags on `index.html`
- No service worker in repo

---

## PART C — Raw response capture (Logos question)

### Reproduce setup (exact UI payload)

```json
POST /buddy/chat
{
  "userId": "demo-user",
  "mode": "COMPANION",
  "personaKey": "ADAPTIVE_COMPANION",
  "message": "What does Logos mean in John 1:1?"
}
```

**Command:** `node scripts/uiContractReproduce.js`

### Captured values (local Express mount)

| Field | Value |
|-------|-------|
| HTTP status | `200` |
| `res.ok` | `true` |
| `data.ok` | `true` |
| `data.reply` | `object` |
| `data.reply.reply` | `"I'm having trouble reaching the AI service right now. Please try again in a moment."` (local env: OpenAI 401; non-empty) |
| Raw body length | 5868 bytes |

### Simulated `index.html` render (lines 495–498)

| Field | Value |
|-------|-------|
| `payload` | `data.reply` (unwrapped object) |
| `payload.reply` | Same 83-char connection message |
| `clientFallbackUsed` | **`false`** |
| **Actual rendered text** | Connection message — **not** the mask |

### Simulated render when OpenAI succeeds (`frontendExecutionSimulate.js`)

| Field | Value |
|-------|-------|
| `data.reply.reply` | `"In John 1:1, Logos (Greek: λόγος) means..."` |
| `clientFallbackUsed` | **`false`** |
| **Rendered** | Full Logos answer |

### Where response vs render diverge

| Scenario | `data.reply.reply` | Rendered text | Divergence? |
|----------|-------------------|---------------|-------------|
| OpenAI success (simulated) | Non-empty string | Same string | **No** |
| UIContract local 200 | Non-empty connection msg | Same string | **No** |
| `reply: ""` on 200 | `""` | **MASK** | **Yes — line 498** |
| `ok: false` (400/500/404) | `undefined` | **MASK** | **Yes — line 496→498** |
| `data.reply: null` | `null` | **MASK** | **Yes** |
| `data.reply: {}` | `undefined` | **MASK** | **Yes** |
| `data.reply: []` | `undefined` | **MASK** | **Yes** |

**If live UI shows the mask while reproduce shows valid nested `reply`, the browser did not receive the same shape at line 495** (or fetch failed before parse — but that uses catch message on line 502, not the mask).

---

## PART D — Frontend exception audit

### `public/index.html`

| Location | Behavior | Discards valid reply? |
|----------|----------|----------------------|
| `try` 483–499 | Normal path | No |
| `catch` 500–502 | Shows *"I had trouble connecting just now..."* | **Different text — not mask** |
| Line 498 `\|\| MASK` | Substitutes when `payload.reply` falsy | **Replaces falsy — not discarding truthy** |

### Other public pages (for comparison)

| File | Error handling | Mask? |
|------|----------------|-------|
| `chat.html` | `if (!res.ok) throw`; `if (!data.ok) throw` | No |
| `beta.html` | Same pattern | No |
| `chat.html` | Silent `catch (_)` only in `getOrCreateUserId` localStorage | No reply impact |

### Default / fallback messages in `public/`

| File | Line | Text |
|------|------|------|
| **`index.html`** | **498** | **`I'm here with you. Tell me a little more.`** |
| `index.html` | 502 | `I had trouble connecting just now...` |
| `index.html` | 394 | Static intro: `Hey, I'm here. Want to talk...` (not mask) |
| `chat.html` | 288 | `(no reply)` |
| `beta.html` | 268 | `(no reply)` |

**No silent catch** on the fetch path in `index.html`. Valid non-empty `payload.reply` is passed directly to `addMessage` → `textContent`.

---

## PART E — Render overwrite audit

| Hypothesis | Evidence | Verdict |
|------------|----------|---------|
| 1. Correct answer briefly received | No code reads response twice; single `addMessage` after fetch | **No brief-then-lost path in source** |
| 2. Another function overwrites bubble | `#messages` only mutated in `addMessage` via `appendChild` | **No overwrite** |
| 3. State update replaces text | No React/state; only `setOrb` updates orb labels (445–446) | **No** |
| 4. Conversation refresh replaces DOM | No refresh, reload, or history load | **No** |
| 5. Typing indicator cleanup replaces answer | `setOrb('idle')` at 499 — orb only, not messages | **No** |

**Timers on send path:**

| Timer | Line | Effect |
|-------|------|--------|
| 420 ms | 481 | `setOrb('thinking')` |
| 4200 ms | 499 | `setOrb('idle')` |

Neither touches `#messages`.

---

## PART F — `demo-user` contamination

### Frontend (`index.html`)

| Mechanism | Present? |
|-----------|------------|
| `localStorage` / `sessionStorage` | **No** |
| Conversation restore on load | **No** |
| Memory hydration UI | **No** |
| Prior session replay | **No** |
| `demo-user` usage | **Only** in `fetch` body line 488 |

**`demo-user` cannot overwrite a rendered answer on the client** — there is no client-side memory or replay layer on `index.html`.

### Backend (out of scope for fix, noted for completeness)

`demo-user` affects server profile/sessions when building the reply, but does **not** cause the frontend mask. Server would still return `data.reply.reply` as a string; client would render it unless falsy.

---

## PART G — Required summary

### ACTUAL PAGE

**`public/index.html`** served at **`/`** — **Companion Chat** section.

### ACTUAL SEND CHAIN

```
Submit button (398)
→ sendMessage (472)
→ fetch /buddy/chat (484)
→ res.json() (495)
→ payload unwrap (496)
→ addMessage (498)
→ div.textContent (452)
```

### ACTUAL RESPONSE (uiContract reproduce, Logos)

- HTTP **200**
- `data.ok` **true**
- `data.reply.reply` **non-empty string** (connection message in local trace; Logos prose when OpenAI succeeds)

### ACTUAL RENDERED TEXT (simulated from reproduce JSON)

- **Connection path:** `"I'm having trouble reaching the AI service right now..."`
- **OpenAI success path:** Full Logos explanation
- **Mask:** **Not rendered** for either valid nested reply shape

### FIRST DIVERGENCE POINT

**File:** `public/index.html`  
**Function:** `sendMessage`  
**Line:** **498** (expression: `payload.reply || 'I'm here with you. Tell me a little more.'`)

**Exact transformation:**

```
INPUT:  payload.reply  (must be falsy: undefined | null | "" | 0 | false | NaN)
OUTPUT: "I'm here with you. Tell me a little more."
```

**Upstream divergence (line 496)** when `payload.reply` is undefined:

```javascript
const payload = data.reply && typeof data.reply === 'object' ? data.reply : data;
// If data.reply is null/undefined/primitive → payload = whole data object
// If data.ok === false → payload.reply is undefined → MASK
// If data.reply is {} or [] → payload.reply undefined → MASK
```

### Exact line: valid answer → mask

| Condition at line 498 | `payload.reply` | Result |
|-----------------------|-----------------|--------|
| Valid OpenAI answer in `data.reply.reply` | `"In John 1:1, Logos..."` | **Valid answer shown** |
| UIContract nested connection message | 83-char string | **Connection message shown** |
| HTTP error body `{ ok: false, error }` | `undefined` | **MASK** |
| Empty nested `{ reply: "" }` | `""` | **MASK** |

**There is no line where a truthy `payload.reply` string becomes the mask.** The mask only substitutes **falsy** `payload.reply`.

---

## Reconciling “valid JSON in reproduce” vs “mask in browser”

| Observation | Implication |
|-------------|-------------|
| Reproduce gets `200` + nested non-empty `reply` | Simulated index renders that string — **not** mask |
| Live UI shows mask | Browser **must** have falsy `payload.reply` at line 498 |
| Regression passes with OpenAI | Backend can produce valid `reply.reply`; browser may still get **different** response (404 route, 500 throw, proxy error, empty nested reply) |
| Defect is frontend-side | **Yes** — mask logic and missing `ok`/status checks; **not** post-render discard |

### Most likely browser-only failure modes (ranked)

| Rank | Cause | Why mask |
|------|-------|----------|
| 1 | `fetch` returns `ok: false` (500/404/400) — **no check in index.html** | `payload.reply` undefined |
| 2 | `200` with `reply.reply: ""` | Empty string falsy |
| 3 | `200` with `reply: null` or `{}` | `payload.reply` undefined/null |
| 4 | Stale **HTML** unlikely — same line 498 in repo | Still mask-on-falsy |
| 5 | Wrong page | User would see `(no reply)` not this exact phrase |

### Recommended browser verification (no code change)

In DevTools → Network → `POST /buddy/chat` on live site:

1. HTTP status
2. Response body `reply.reply`
3. Compare to line 498 evaluation

If `reply.reply` is non-empty in Network tab but UI shows mask, that would contradict current source (would require injected script or DOM extension) — **not found in repository**.

---

## Files referenced

| Path | Role |
|------|------|
| `public/index.html` | **Only mask source**; inline send/render |
| `public/chat.html` | Alternate UI — different fallback |
| `public/beta.html` | Beta UI — different fallback |
| `server.js` | `/` → index.html |
| `scripts/uiContractReproduce.js` | HTTP path reproduce |
| `scripts/frontendExecutionSimulate.js` | Line 498 simulation matrix |

---

**STOP — report only. No fixes. No deploy. No push.**

**End of report.**
