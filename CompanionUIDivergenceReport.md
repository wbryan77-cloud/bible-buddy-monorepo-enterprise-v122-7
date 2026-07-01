# Companion UI Divergence Report

**Date:** 2026-06-01  
**Scope:** Repository analysis only — no HTTP probes, no Render calls, no fixes proposed.  
**Symptom:** Live Companion UI shows instant `"I'm here with you. Tell me a little more."` for all questions.  
**Local regression:** `scripts/emergencyHardCutoverRegression.js` — 18/18 PASS (direct `runBuddy`).

---

## 1. Executive summary

The **exact** user-visible string `"I'm here with you. Tell me a little more."` is authored in **one production UI location** in the current repository:

| Priority | File | Function | Lines | Role |
|----------|------|----------|-------|------|
| **Primary (current repo)** | `public/index.html` | `sendMessage` | **498** | **Client-side fallback** when `payload.reply` is falsy |
| Historical (pre-cutover server) | `routes/buddy.js` @ `e5d388e` | `normalizePayload` | 6–17 | Server fallback when `runBuddy` returns non-object |
| Non-production mirrors | `tests/sprint2RepairRoute.test.js`, `scripts/sprint213AcceptanceHttp.js`, `scripts/sprint214AcceptanceHttp.js` | `normalizePayload` copies | 17–19 | Test harness only |
| Detectors only (never emit) | `services/coreResponseGuards.js`, `services/forbiddenProseGuard.js` | pattern lists | 20 / 13 | Strip/detect — do not generate this text |

**Committed cutover (`57b3f96`, current `HEAD`):** `routes/buddy.js` `normalizePayload` no longer emits this phrase; it uses the connection-error message instead. Therefore, on deployed cutover code, the **only** path that produces this **exact** wording is **`public/index.html:498`**, triggered when the HTTP response reaches the browser with a **falsy** `reply` field.

**First divergence** between local regression PASS and Companion UI:

> Regression reads `runBuddy()` return value directly and never applies the `index.html` client fallback. Companion UI always passes through HTTP + JSON parsing and substitutes line 498 whenever `payload.reply` is empty, null, or undefined — including when the server returns HTTP errors that the UI does not check.

---

## 2. Exact source — file, function, line range

### 2.1 Primary source (Companion Chat UI)

```498:498:public/index.html
        addMessage('buddy', payload.reply || 'I'm here with you. Tell me a little more.', payload.scripture || []);
```

- **File:** `public/index.html`
- **Function:** `sendMessage` (async, lines 472–504)
- **Line range:** **498** (fallback string); surrounding handler **472–504**
- **Condition:** `payload.reply` is falsy (`""`, `null`, `undefined`, `0`)
- **Note:** Uses Unicode curly apostrophe in `I'm` (U+2019), matching user-visible text.

### 2.2 Historical server source (pre-cutover only)

At commit `e5d388e` (before hard cutover):

```javascript
// routes/buddy.js normalizePayload (e5d388e, lines 6–17)
function normalizePayload(reply) {
  if (reply && typeof reply === 'object') return reply;
  return {
    reply: String(reply || 'I'm here with you. Tell me a little more.'),
    // ...
  };
}
```

At **`57b3f96` / current `HEAD`**, this was replaced with:

```8:19:routes/buddy.js
function normalizePayload(reply) {
  if (reply && typeof reply === 'object') return reply;
  return {
    reply: String(reply || "I'm having trouble reaching the AI service right now. Please try again in a moment."),
    // ...
  };
}
```

### 2.3 Similar but NOT exact matches (different user-visible text)

| File | Lines | Text |
|------|-------|------|
| `services/buddyBrain.js` | 361, 585 | `"I'm here with you. Tell me what you'd like help with..."` |
| `services/personalizedFallback.js` | 24 | Same as above |
| `services/coreResponseGuards.js` | 68–69 | `"I'm having trouble reaching the AI service right now..."` |

These do **not** produce the exact `"Tell me a little more."` phrase.

---

## 3. Caller chains that can reach the phrase

### Chain A — Current repo, Companion Chat (`index.html`) — **PRIMARY**

```
User clicks Send (index.html:398, type="submit")
  → sendMessage(event)                          [index.html:472]
  → event.preventDefault(); trim message        [index.html:473–475]
  → (empty message blocked client-side)         [index.html:475]
  → fetch POST /buddy/chat                      [index.html:484–493]
       body: { userId: 'demo-user', mode: 'COMPANION',
                personaKey: 'ADAPTIVE_COMPANION', message }
  → express.json() body parse                   [server.js:12]
  → app.use('/buddy', buddy router)             [server.js:95]
  → router.post('/chat')                        [routes/buddy.js:58]
  → handleBuddyChat({ body, res })              [routes/buddy.js:22]
  → (empty message → 400, else continue)        [routes/buddy.js:31–34]
  → runBuddy({ userId, testerId, sessionId, cohort, mode, personaKey, message })
                                                [routes/buddy.js:37]
  → runOpenAiFirstCompanionRuntime(H, ...)      [buddyBrain.js:1013–1014]
  → composeReasonFirstReply → OpenAI            [openAiFirstCompanionRuntime.js:110–121]
  → finalizeBuddyResponse                       [openAiFirstCompanionRuntime.js:320–333]
  → normalizePayload(reply)                     [routes/buddy.js:47]
       (object pass-through even if reply: "")
  → res.status(200).json({ ok: true, reply: payload })  [routes/buddy.js:54]
  → data = await res.json()                     [index.html:495]
       ⚠ NO res.ok check
       ⚠ NO data.ok check
  → payload = data.reply && typeof data.reply === 'object' ? data.reply : data
                                                [index.html:496]
  → addMessage('buddy', payload.reply || 'I'm here with you. Tell me a little more.', ...)
                                                [index.html:498]  ← EXACT PHRASE EMITTED
```

### Chain B — Pre-cutover server path (if live still on `e5d388e` runtime)

```
(same UI through handleBuddyChat)
  → runBuddy → runMasterBuddyRuntime          [buddyBrain.js @ e5d388e]
  → template responders / generateOpenAnswer / personalizedFallback
  → if runBuddy returns null | undefined | string (non-object)
  → normalizePayload → server emits "Tell me a little more."  [routes/buddy.js @ e5d388e:9]
  → JSON { ok: true, reply: { reply: "I'm here with you. Tell me a little more.", ... } }
  → index.html:498 — payload.reply is truthy → displays server text (client fallback NOT used)
```

### Chain C — HTTP error responses masked by client fallback (current `index.html`)

```
sendMessage → fetch /buddy/chat
  → 400 { ok: false, error: 'message is required' }     [routes/buddy.js:32]
  → OR 500 { ok: false, error: e.message }                [routes/buddy.js:63]
  → index.html does NOT check res.ok or data.ok           [index.html:495–498]
  → payload = data (data.reply is not an object)
  → payload.reply === undefined → line 498 fallback       ← EXACT PHRASE
```

**Catch block** (`index.html:500–502`) only runs on network/JSON parse failures and shows a **different** message (`"I had trouble connecting just now..."`), not `"Tell me a little more."`.

### Chain D — Other UIs hitting `/buddy/chat` (different fallback text)

| UI | File | Fallback if empty reply |
|----|------|---------------------------|
| Tester Chat | `public/chat.html:288` | `'(no reply)'` |
| Beta | `public/beta.html:268` | `'(no reply)'` |
| Companion Chat | `public/index.html:498` | **`'I'm here with you. Tell me a little more.'`** |

Only **Companion Chat** on `index.html` produces the exact symptom string.

### Chain E — Test/acceptance harnesses (non-production)

```
scripts/sprint213AcceptanceHttp.js:19
scripts/sprint214AcceptanceHttp.js:16
tests/sprint2RepairRoute.test.js:17
  → normalizePayload copies with "Tell me a little more." fallback
```

---

## 4. Trigger analysis — what causes the phrase?

| Trigger | Can produce exact phrase? | Mechanism | Verdict |
|---------|---------------------------|-----------|---------|
| **Empty message** | **No** (normal send) | Client blocks at `index.html:475`; server returns 400 at `routes/buddy.js:31–33` before `runBuddy` | Not the path for typed questions |
| **Malformed payload** | **Possible** | Bad JSON → `req.body` `{}` → `message ''` → 400 → UI ignores `ok` → client fallback | Edge case; would also be instant |
| **Missing `mode`** | **No** | Defaults `'COMPANION'` in `routes/buddy.js:27` and `buddyBrain.normalizeInput:619` | Not a trigger |
| **Missing `personaKey`** | **No** | Defaults `'ADAPTIVE_COMPANION'` in `routes/buddy.js:28` and `normalizeInput:620` | Not a trigger |
| **Session contamination (`demo-user`)** | **Unlikely for this exact phrase** | `index.html:488` hardcodes `userId: 'demo-user'`; affects profile/sessions in `openAiFirstCompanionRuntime:48–49` but does not emit this string server-side on cutover code | May worsen reply quality; does not author this phrase |
| **OpenAI bypass** | **No (cutover code)** | When OpenAI fails: `reasonFirstComposer.js:238–252` → `openaiCalled: false` → `buildConnectionErrorReply` → **different** message (`coreResponseGuards.js:68–69`) | Skips OpenAI but does **not** produce "Tell me a little more" on server |
| **Runtime selection** | **Only if stale deploy** | Current `runBuddy` locked to `openAiFirstCompanionRuntime` (`buddyBrain.js:1013–1014`). Pre-cutover: `runMasterBuddyRuntime` (`e5d388e`) | Stale deploy → template path; exact phrase only if `runBuddy` returns non-object + old `normalizePayload` |
| **Validation failure** | **Indirect** | Failed validation may leave `structured.reply` empty while `openaiCalled: true`; `normalizePayload` passes object through; **client** substitutes line 498 | Possible on cutover code |
| **Falsy `reply` on 200 OK** | **Yes — primary** | Server returns `{ ok: true, reply: { reply: "" } }` → `index.html:498` | **Most likely cutover-path mechanism** |
| **HTTP 4xx/5xx without UI guard** | **Yes** | `index.html` lacks `res.ok` / `data.ok` checks → treats error body as payload → `payload.reply` undefined → line 498 | **Likely for instant failures** |

### OpenAI skip conditions on current cutover path

| Condition | File | Function | Lines | `openAiCalled` | User-visible server `reply` |
|-----------|------|----------|-------|----------------|------------------------------|
| Crisis safety | `openAiFirstCompanionRuntime.js` | `runOpenAiFirstCompanionRuntime` | 57–95 | `false` | `fallbackReply` (crisis protocol) |
| OpenAI API error | `reasonFirstComposer.js` | `composeReasonFirstReply` | 238–252 | `false` | Replaced by `buildConnectionErrorReply` (`openAiFirstCompanionRuntime.js:132–138`) |
| Successful compose | `reasonFirstComposer.js` | `composeReasonFirstReply` | 325–331 | `true` | OpenAI-authored `structured.reply` |
| Guard strip to empty | `openAiFirstCompanionRuntime.js` | strip forbidden/dangerous | 211–217 | `true` (still) | May become `""` → client fallback |

**On cutover code, OpenAI skip does not directly author `"Tell me a little more."`** — that text is client-side unless the live server is still on pre-cutover `normalizePayload`.

---

## 5. Companion UI trace (send → final answer)

### 5.1 UI layer

| Step | File | Function / element | Lines |
|------|------|-------------------|-------|
| Section label | `public/index.html` | `<h2>Companion Chat</h2>` | 391 |
| Send control | `public/index.html` | `<form onsubmit="sendMessage(event)">` + `<button type="submit">` | 396–398 |
| Quick-send | `public/index.html` | `quickAsk(text)` → `sendMessage` | 467–469 |
| Handler | `public/index.html` | `sendMessage` | 472–504 |
| Fetch payload | `public/index.html` | `JSON.stringify({ userId: 'demo-user', mode: 'COMPANION', personaKey: 'ADAPTIVE_COMPANION', message })` | 487–492 |
| Response parse | `public/index.html` | `payload = data.reply && typeof data.reply === 'object' ? data.reply : data` | 496 |
| Display | `public/index.html` | `addMessage('buddy', payload.reply \|\| FALLBACK, ...)` | 498 |

### 5.2 Route layer

| Step | File | Function | Lines |
|------|------|----------|-------|
| Mount | `server.js` | `mountRoute('Buddy routes', '/buddy', './routes/buddy')` | 95 |
| POST handler | `routes/buddy.js` | `router.post('/chat', ...)` | 58–65 |
| Core handler | `routes/buddy.js` | `handleBuddyChat` | 22–55 |
| Body defaults | `routes/buddy.js` | `mode`, `personaKey`, `message` defaults | 27–29 |
| Brain entry | `routes/buddy.js` | `runBuddy({ userId, testerId, sessionId, cohort, mode, personaKey, message })` | 37 |
| Envelope | `routes/buddy.js` | `res.json({ ok: true, reply: normalizePayload(reply) })` | 47–54 |

### 5.3 Runtime layer (current `HEAD` / `57b3f96`)

| Step | File | Function | Lines |
|------|------|----------|-------|
| Input normalize | `services/buddyBrain.js` | `normalizeInput` | 611–633 |
| Runtime lock | `services/buddyBrain.js` | `runBuddy` → `runOpenAiFirstCompanionRuntime` | 987–1014 |
| Evidence (hints only) | `services/openAiFirstCompanionRuntime.js` | `buildRetrievalEvidencePack({ routingHintsOnly: true })` | 98–107 |
| Composer | `services/openAiFirstCompanionRuntime.js` | `composeReasonFirstReply` | 110–121 |
| OpenAI call | `services/reasonFirstComposer.js` | `callOpenAI` loop | 231–236 |
| Connection fallback | `services/openAiFirstCompanionRuntime.js` | `buildConnectionErrorReply` when `!openaiCalled` | 132–138 |
| Guards / polish | `services/openAiFirstCompanionRuntime.js` | ownership, directness, forbidden prose | 149–218 |
| Finalize | `services/buddyBrain.js` | `finalizeBuddyResponse` | 673–796 |
| Return | `services/openAiFirstCompanionRuntime.js` | `return H.finalizeBuddyResponse(...)` | 320–333 |

---

## 6. First divergence: local regression PASS vs Companion UI

### 6.1 Side-by-side

| Dimension | Local regression (`emergencyHardCutoverRegression.js`) | Companion UI (`public/index.html`) |
|-----------|--------------------------------------------------------|-------------------------------------|
| **Entry** | `require('../services/buddyBrain').runBuddy(...)` | `fetch POST /buddy/chat` |
| **Route layer** | **Bypassed** — no `routes/buddy.js` | `handleBuddyChat` + `normalizePayload` |
| **userId** | Fresh per test: `cutover-${id}-${Date.now()}` | Hardcoded `'demo-user'` |
| **sessionId** | Not sent | Not sent |
| **Active conversation** | `clearActiveConversation(userId)` before each test | Never cleared for `demo-user` |
| **Client fallback** | **None** — uses `reply.reply` directly | **Line 498** substitutes exact phrase |
| **HTTP error handling** | N/A | **Missing** — no `res.ok` / `data.ok` |
| **Empty reply handling** | Scored as violation / connection message check | **Masked** by client fallback |
| **Runtime (repo @ 57b3f96)** | `openAiFirstCompanionRuntime` | Same **if** live runs `57b3f96` |
| **Observed outcome** | 18/18 PASS | Instant `"Tell me a little more."` |

### 6.2 First divergence point (ordered)

1. **`public/index.html:498`** — Client-side `payload.reply || 'I'm here with you. Tell me a little more.'`  
   Regression never executes this line. **This is the first code that can emit the exact symptom text on cutover deploy.**

2. **`public/index.html:495–496`** — No `res.ok` / `data.ok` guard before reading `payload.reply`  
   Regression never parses HTTP envelopes.

3. **`scripts/emergencyHardCutoverRegression.js:109–114` vs `index.html:487–491`** — Direct `runBuddy` vs HTTP; different `userId` strategy.

4. **`routes/buddy.js:47–48`** — `normalizePayload` pass-through of objects with `reply: ""`  
   Regression reads `runBuddy` output before this layer; UI depends on it not fixing empty strings.

5. **Deploy parity (unverified without HTTP)** — If live process has not picked up `57b3f96`, divergence is earlier: `runBuddy → runMasterBuddyRuntime` (`e5d388e`) plus server `normalizePayload` at `e5d388e:9`.

### 6.3 Why regression passes but UI shows fallback

Regression success means `runBuddy` returns objects with **non-empty** `reply.reply` and `coreDebug.openaiCalled === true` for happy-path tests.

The UI can still show `"Tell me a little more."` when:

- The HTTP response has `reply.reply` falsy on a 200 OK (server object pass-through + client substitution), **or**
- The HTTP response is an error object (`ok: false`) that the UI mis-parses as payload (no `reply` field), **or**
- Live server code differs from `57b3f96` (stale `masterBuddyRuntime` + old server `normalizePayload`).

Regression does not detect any of these because it never exercises `index.html` or HTTP.

---

## 7. Root-cause ranking (repository evidence only)

| Rank | Hypothesis | Confidence | Evidence |
|------|------------|------------|----------|
| **1** | **Client fallback at `index.html:498` fires because `payload.reply` is falsy** | **85%** | Only production source of exact phrase on `57b3f96`; `normalizePayload` no longer emits it server-side |
| **2** | **UI does not check `res.ok` / `data.ok`** — error responses parsed as empty reply | **60%** | `index.html:495–498` vs `chat.html:278–288` / `beta.html:266–268` which do check |
| **3** | **Server returns 200 with `reply: ""`** (guard strip, validation edge, or compose edge) | **40%** | `normalizePayload` passes objects unchanged (`routes/buddy.js:8–9`); forbidden strip can empty text (`forbiddenProseGuard.js:33–38`) while `openAiCalled` stays true |
| **4** | **Live deploy stale** — still on `e5d388e` `masterBuddyRuntime` + server `normalizePayload` | **35%** | Cannot verify without HTTP; local HEAD is `57b3f96`; prior investigation noted pre-push gap |
| **5** | **`demo-user` session contamination** | **15%** | Shared id at `index.html:488`; affects memory/profile but cutover path skips relationship enrichment; does not author this phrase |
| **6** | **Missing mode / personaKey** | **0%** | Defaults on server and in `normalizeInput` |
| **7** | **Empty message** | **0%** for normal typing | Blocked client and server |

---

## 8. OpenAI skip summary (Companion UI path, cutover code)

| Scenario | OpenAI called? | Server `reply` text | UI shows "Tell me a little more"? |
|----------|----------------|---------------------|-----------------------------------|
| Happy path | Yes | OpenAI prose | No |
| API failure / no key | No | Connection error message | No (unless `reply` lost in transit) |
| Crisis | No | Crisis `fallbackReply` | No |
| `reply: ""` on 200 OK | Yes or No | `""` | **Yes** (client line 498) |
| HTTP 400/500 | Maybe never reached | N/A | **Yes** (UI ignores `ok`) |
| Pre-cutover `runBuddy` → `null` | Depends on master runtime | Server old normalizePayload | **Yes** (server or client) |

---

## 9. Files referenced

| Path | Relevance |
|------|-----------|
| `public/index.html` | Companion Chat UI; **exact phrase source (line 498)** |
| `public/chat.html` | Alternate UI; different fallback |
| `public/beta.html` | Beta UI; different fallback |
| `routes/buddy.js` | `/buddy/chat` handler, `normalizePayload` |
| `server.js` | Route mount, JSON middleware |
| `services/buddyBrain.js` | `runBuddy`, `normalizeInput`, `finalizeBuddyResponse` |
| `services/openAiFirstCompanionRuntime.js` | Current sole runtime |
| `services/reasonFirstComposer.js` | OpenAI compose + API error handling |
| `services/coreResponseGuards.js` | `buildConnectionErrorReply` |
| `services/forbiddenProseGuard.js` | Detects/strips exact phrase if present in model output |
| `scripts/emergencyHardCutoverRegression.js` | Local PASS path (direct `runBuddy`) |
| `services/masterBuddyRuntime.js` | Pre-cutover runtime (not called by current `runBuddy`) |

---

## 10. Constraints observed

- No live HTTP probes performed.
- Render deploy revision not verified in this report.
- No fixes proposed.
- No deploy or push performed.

**End of report.**
