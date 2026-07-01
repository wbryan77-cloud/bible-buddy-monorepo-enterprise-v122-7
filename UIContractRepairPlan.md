# UI Contract Repair Plan

**Date:** 2026-06-01  
**Priority:** CRITICAL  
**Scope:** Companion UI contract only — no doctrine, Evidence Cards, Concordance, learning, deploy, or push.  
**Mask location:** `public/index.html` → `sendMessage()` → line **498**

**Artifacts:** `docs/regression-trace/ui-contract-reproduce-logos.json`, `scripts/uiContractReproduce.js`, `EmptyReplyRootCauseReport.md`, `CompanionUIDivergenceReport.md`

---

## 1. Exact root cause

**Dual failure — client contract bug masks backend state:**

| Layer | Problem |
|-------|---------|
| **Client (primary)** | `index.html` does not check `res.ok` or `data.ok`, then treats falsy `payload.reply` as “show generic prompt” (`line 498`). Any non-200 or `{ ok: false }` body without nested `reply` object is **misread as empty reply**. |
| **Backend (secondary)** | On cutover code, OpenAI API failure does **not** return empty `reply` — it returns a connection-error string. Empty `reply` on `200` is still possible via guard strip-to-empty or model `{ "reply": "" }` with `openaiCalled: true`. `500` occurs if `runBuddy` returns `null`/`undefined` before `reply.liveRequestTrace = trace` (`routes/buddy.js:45`). |

**Why regression passes while Companion UI shows the mask:**

| Path | Behavior |
|------|----------|
| `emergencyHardCutoverRegression.js` | Calls `runBuddy()` directly — **no HTTP**, **no `index.html` parsing**, **no line 498**. Reads `reply.reply` from returned object. |
| Companion UI | `fetch('/buddy/chat')` → JSON → `payload.reply \|\| MASK`. Errors and schema mismatches become **"Tell me a little more."** |

**Local reproduction (exact UI HTTP path, Logos question, `demo-user`):**

| Field | Value |
|-------|-------|
| HTTP status | **200** |
| `data.ok` | **true** |
| `data.reply` | **object** |
| `data.reply.reply` | `"I'm having trouble reaching the AI service right now. Please try again in a moment."` (83 chars) |
| `clientFallbackUsed` | **false** |
| User would see | Connection message — **not** the mask |

**Conclusion:** On current cutover backend, the mask phrase is **not** produced by a successful `200` with connection-error substitution. The live symptom **"Tell me a little more."** requires the UI to receive **`payload.reply` falsy** — most plausibly **HTTP 4xx/5xx/404** (unhandled) or **`200` with `reply.reply: ""`**.

---

## PART A — Reproduce through real UI path

### Request (matches `index.html:487–492`)

```json
POST /buddy/chat
{
  "userId": "demo-user",
  "mode": "COMPANION",
  "personaKey": "ADAPTIVE_COMPANION",
  "message": "What does Logos mean in John 1:1?"
}
```

### Captured response (local Express mount of `routes/buddy.js`)

| Capture | Value |
|---------|-------|
| HTTP status | `200` |
| `res.ok` | `true` |
| Raw body length | 5868 bytes |
| `parsed.ok` | `true` |
| `parsed.error` | `undefined` |
| `parsed.reply` (type) | `object` |
| `parsed.reply.reply` | `"I'm having trouble reaching the AI service right now. Please try again in a moment."` |
| Latency | ~569 ms |

### Values reaching `index.html` (simulated `lines 495–498`)

```javascript
data = { ok: true, reply: { reply: "<connection message>", ... } }
payload = data.reply                    // object unwrap OK
payload.reply = "<connection message>"  // truthy
displayed = payload.reply               // MASK NOT USED
```

**Reproduce command:** `node scripts/uiContractReproduce.js`

---

## PART B — All empty / missing `reply` sources (OpenAI-first path)

Ranked by probability of causing **UI mask** on Companion Chat.

| Rank | File | Function | Lines | Assignment / trigger | Reaches HTTP? | UI mask? |
|------|------|----------|-------|----------------------|---------------|----------|
| **1** | `public/index.html` | `sendMessage` | 496–498 | `payload.reply` undefined when `data.reply` not object | N/A (client) | **Yes** |
| **2** | `routes/buddy.js` | `router.post('/chat')` catch | 61–63 | `500 { ok: false, error }` — no `reply` field | Yes | **Yes** (via client) |
| **3** | `server.js` | 404 handler | 167–169 | `{ ok: false, error: 'Not found' }` if `/buddy` not mounted | Yes | **Yes** |
| **4** | `routes/buddy.js` | `handleBuddyChat` | 45 | `reply.liveRequestTrace = trace` throws if `runBuddy` returns `null`/`undefined` → 500 | Yes | **Yes** |
| **5** | `reasonFirstComposer.js` | `composeReasonFirstReply` | 241 | `reply: ''` on `!result.ok` | **No** — replaced by `buildConnectionErrorReply` | No (cutover) |
| **6** | `openAiFirstCompanionRuntime.js` | guard strip | 211–216 | `stripForbiddenProse` / `stripDangerousFallbackSpeaker` → `""` when `openaiCalled: true` | Yes (pass-through) | **Yes** if `""` |
| **7** | `reasonFirstComposer.js` | `normalizeStructured` via empty model | 255–262 | `raw: ''` → `reply: ''` with `openaiCalled: true` | Yes | **Yes** |
| **8** | `routes/buddy.js` | `normalizePayload` | 8–9 | Passes `reply: ""` unchanged — does not create empty | Yes | **Yes** (pass-through) |
| **9** | `buddyBrain.js` | `normalizeStructured` | 652 | `parsed?.reply \|\| fallback.reply` — empty string is falsy, uses fallback | Compose only | Rare empty if both falsy |
| **10** | Non-production runtimes | various | — | `reply: ''` in experiment/lite/shadow files | **No** — not wired to `runBuddy` | No |

**Not in OpenAI-first hot path:** `masterBuddyRuntime.js`, `responseStructureRemovalExperiment.js`, `scripts/promptHierarchyExperiment.js`, etc.

**`reply: null` / missing field:** No intentional `reply: null` in `openAiFirstCompanionRuntime` or `reasonFirstComposer`. Missing `reply` on success object would require `runBuddy` returning malformed object (not observed on cutover path).

---

## PART C — HTTP error sources

### `routes/buddy.js`

| Condition | Status | Body | Logos question? |
|-----------|--------|------|-----------------|
| `!message` | **400** | `{ ok: false, error: 'message is required' }` | **No** — client blocks empty send (`index.html:475`) |
| `runBuddy` throws (incl. null `reply` at line 45) | **500** | `{ ok: false, error: e.message }` | **Possible** if `runBuddy` returns null |
| Success | **200** | `{ ok: true, reply: <object> }` | **Normal path** |

### `buddyBrain.js`

| Condition | HTTP impact |
|-----------|-------------|
| No `throw` in file | Errors only if callee throws |
| `return null` at 984 | **Dead code** — not reached by `runBuddy` (lines 1013–1014 call `openAiFirstCompanionRuntime` only) |
| `safeJsonParse` returns `null` | Handled in composer — not HTTP |

### `openAiFirstCompanionRuntime.js`

| Condition | HTTP impact |
|-----------|-------------|
| No `throw` | API errors → connection message on **200** |
| Crisis branch | **200** with crisis `fallbackReply` text |

### `reasonFirstComposer.js`

| Condition | HTTP impact |
|-----------|-------------|
| No `throw` | `callOpenAI` returns `{ ok: false, error }` → compose returns `reply: ''` + `openaiCalled: false` |
| `!openai` client | `openai_unavailable` → same |

### `responseContract.js`

| Condition | HTTP impact |
|-----------|-------------|
| Not called from `openAiFirstCompanionRuntime` | **N/A for Logos / Companion `/chat`** |

### `normalizePayload` (`routes/buddy.js:8–19` — no separate file)

| Input | Output | HTTP |
|-------|--------|------|
| `null` / `undefined` | New object with **non-empty** connection message | 200 |
| Object with `reply: ""` | **Same object** | 200, empty nested reply |

### `server.js` (affects UI fetch)

| Condition | Status | Body | Logos? |
|-----------|--------|------|--------|
| Buddy route failed to load (`mountRoute` warn) | **404** | `{ ok: false, error: 'Not found', path }` | **Possible on mis-deploy** |
| Unhandled express error | **500** | `{ ok: false, error: 'Internal server error' }` | Possible |

### Logos-specific backend outcome (current code, API failure)

- **Status:** 200  
- **`data.reply.reply`:** non-empty connection message  
- **Does not trigger mask** unless client bug or proxy strips body

---

## PART D — Null return audit (OpenAI-first path)

| Location | Return | Reaches `reply.liveRequestTrace`? | Reaches `normalizePayload`? |
|----------|--------|-----------------------------------|----------------------------|
| `openAiFirstCompanionRuntime.js` | Always `finalizeBuddyResponse(structured)` | Always object | Yes |
| `reasonFirstComposer.js` | `{ structured, openaiCalled, ... }` | Via runtime | Yes |
| `finalizeBuddyResponse` | `return structured` (673–796) | Always object | Yes |
| `buddyBrain.runBuddy` | `runOpenAiFirstCompanionRuntime(...)` | Always object | Yes |
| `buddyBrain.js:984` `return null` | Master/template dead path | **Only if old `runMasterBuddyRuntime` deploy** | Would throw at line 45 → **500** |

**`return undefined` / `return {}`:** None in `openAiFirstCompanionRuntime` or `reasonFirstComposer`.

**Critical throw-before-JSON:**

```45:45:routes/buddy.js
  reply.liveRequestTrace = trace;
```

If `runBuddy()` ever returns `null`/`undefined`, this throws → **500** → UI mask (no `data.reply` object).

---

## PART E — Implementation plan (DO NOT IMPLEMENT YET)

### E.1 Smallest safe fix (recommended order)

#### Fix 1 — Client contract repair (required)

**File:** `public/index.html`  
**Function:** `sendMessage`  
**Lines:** 483–503

**Changes:**

1. After `fetch`, check `if (!res.ok) throw ...` or handle explicitly.
2. After `res.json()`, check `if (!data.ok) throw ...` using `data.error`.
3. Unwrap: `const payload = data.reply` (require object; if missing, show `data.error` not mask).
4. **Remove** `|| 'I'm here with you. Tell me a little more.'` — replace with:
   - Display `payload.reply` when non-empty string.
   - If empty string on `200`, show explicit: *"Buddy returned an empty reply."* or surface `data.error` / connection message from server.
5. Align with `chat.html:278–288` and `beta.html:266–268` error handling pattern.

**Why smallest:** One file, ~15 lines, no backend/doctrine risk, stops masking immediately.

#### Fix 2 — Route empty-reply coercion (optional hardening)

**File:** `routes/buddy.js`  
**Function:** `normalizePayload`  
**Lines:** 8–19

After pass-through, if `typeof reply.reply === 'string' && !reply.reply.trim()`, set `reply.reply` to connection-error message (import `CONNECTION_ERROR_USER_MESSAGE` from `coreResponseGuards.js`).

**Why:** Defense-in-depth so `200` never ships `reply: ""`.

#### Fix 3 — Null-safe trace attach (optional)

**File:** `routes/buddy.js`  
**Function:** `handleBuddyChat`  
**Lines:** 37–47

Guard: if `!reply || typeof reply !== 'object'`, use `normalizePayload(reply)` before assigning `liveRequestTrace`, or assign trace only when object exists.

**Why:** Prevents `500` from null `runBuddy` on stale/misconfigured deploys.

### E.2 Files affected

| File | Change | Required? |
|------|--------|-----------|
| `public/index.html` | Contract repair, remove mask | **Yes** |
| `routes/buddy.js` | Empty-reply coercion + null guard | Optional |
| `scripts/uiContractReproduce.js` | Extend with 400/500/empty-reply cases | Validation only |
| `tests/` or new `scripts/uiContractValidation.js` | Assert index parsing rules | Validation only |

**Not in scope:** `buddyBrain.js`, `openAiFirstCompanionRuntime.js`, `reasonFirstComposer.js`, doctrine, learning, Evidence Cards.

### E.3 Risk assessment

| Fix | Risk | Mitigation |
|-----|------|------------|
| Remove client mask | **Low** | Users may see real errors (desired) |
| Add `res.ok` / `data.ok` checks | **Low** | Match `chat.html` / `beta.html` |
| `normalizePayload` empty coercion | **Low** | Only affects `""`; connection message already used elsewhere |
| Null guard on trace | **Low** | Changes 500 → 200 with fallback object |

**Regression risk:** `emergencyHardCutoverRegression.js` bypasses HTTP/UI — should remain unaffected.

### E.4 Validation plan

| Step | Command / action | Pass criteria |
|------|------------------|---------------|
| 1 | `node scripts/uiContractReproduce.js` | Document `httpStatus`, `nestedReply`, `clientFallbackUsed: false` on API failure |
| 2 | Extend reproduce script: simulate `500`, `400`, `404`, `{ ok: true, reply: { reply: "" } }` | Confirm **current** code sets `clientFallbackUsed: true` for errors; **after fix**, displayed text ≠ mask |
| 3 | `node scripts/emergencyHardCutoverRegression.js` | 18/18 still PASS |
| 4 | Manual browser: Companion Chat, Logos question | Shows OpenAI answer **or** connection message **or** explicit error — **never** silent mask |
| 5 | Manual: disconnect network | Catch block message (line 502) or explicit fetch error — not mask |
| 6 | Compare `chat.html` vs `index.html` on same question | Same backend text visible |

### E.5 Success criteria

1. `"Tell me a little more."` **never** shown as substitute for server/API failures.
2. `data.reply.reply` from successful `200` always displayed when non-empty.
3. `ok: false` responses show `data.error` (or user-safe derivative).
4. Regression suite unchanged.
5. No doctrine, learning, or Evidence Card changes.

---

## Summary table

| Question | Answer |
|----------|--------|
| Exact root cause | **Client mask + missing HTTP/`ok` checks**; backend may return **500/404** or **`reply: ""`** but cutover API-failure returns **non-empty connection message** |
| File causing mask | `public/index.html:498` |
| File causing HTTP errors | `routes/buddy.js:45` (null throw), `routes/buddy.js:63` (catch), `server.js:167` (404) |
| File causing empty `reply` on 200 | `openAiFirstCompanionRuntime.js:211–216`, `reasonFirstComposer.js:241` (transient only) |
| OpenAI answer discarded? | **No** on cutover API-failure path — substituted with connection message. Possible only if guard strip empties text while `openaiCalled: true`. |
| `normalizePayload` stripping? | **No** — pass-through only |
| Frontend wrong schema? | **Yes** — ignores `ok`, treats error bodies as empty `reply` |
| Smallest fix | **`index.html` contract repair only** |

---

**STOP — plan only. No implementation. No deploy. No push.**

**End of plan.**
