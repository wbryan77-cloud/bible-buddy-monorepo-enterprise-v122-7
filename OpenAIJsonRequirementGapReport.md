# OpenAI JSON Requirement Gap Report

**Date:** 2026-06-07  
**Priority:** CRITICAL  
**Question:** Are BibleBuddy OpenAI failures caused by JSON mode (`json_object`) requirements?  
**Status:** Diagnosis only

---

## Summary

**Authentication is working.** Your manual **400** proves OpenAI enforces a **JSON keyword rule** on `messages` when using `response_format: { type: 'json_object' }`.

**BibleBuddy's production composer already includes explicit JSON instructions** in the **system** message. The gap is between **how failures are reproduced in manual tests** and **what the real pipeline sends**.

---

## The gap (diagram)

```
┌─────────────────────────────────────────────────────────────────┐
│  YOUR MANUAL TEST (proven 400)                                  │
│  chat.completions.create({                                      │
│    response_format: { type: 'json_object' },                     │
│    messages: [{ role: 'user', content: '{"reply":"OK"}' }]      │
│  })                                                             │
│  • No literal word "json" in messages                            │
│  • Result: 400 JSON requirement error                           │
└─────────────────────────────────────────────────────────────────┘
                              ≠
┌─────────────────────────────────────────────────────────────────┐
│  BIBLEBUDDY PRODUCTION (reasonFirstComposer.callOpenAI)         │
│  messages: [                                                    │
│    { role: 'system', content: <23KB prompt with:               │
│        "Return JSON only using this shape:"                     │
│        "required JSON fields for doctrine questions"             │
│        "Return JSON with: reply, claims[], ..."  >},            │
│    { role: 'user', content: JSON.stringify(userPayload) }       │
│  ]                                                              │
│  • 3× "JSON" in system (jsonWordCount: 3)                        │
│  • User body has no literal "json" (only JSON syntax)           │
│  • Expected: passes JSON-mode gate if auth OK                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Requirement checklist (OpenAI `json_object`)

| Requirement | Manual minimal test | BibleBuddy production |
|-------------|--------------------|-----------------------|
| Valid API key | ✅ (you proved) | ✅ |
| `chat.completions` API | ✅ | ✅ |
| `response_format: json_object` | ✅ | ✅ (`line 182`) |
| Word `json` in **some** message | ❌ | ✅ (system) |
| Structured output instruction | ❌ | ✅ (schema + claims) |

---

## Instruction inventory

### A. Base JSON schema (`buddyBrain.js:339–351`)

```
Return JSON only using this shape:
{
  "reply": "natural companion response",
  "scripture": [...],
  "mode": "...",
  "confidence": "...",
  "memory_used": false,
  ...
}
```

**Always** included via `buildSystemPrompt()` inside `buildComposerSystemPrompt()`.

### B. Claims JSON block (`reasonFirstComposer.js:78–89`) — production only

```
CLAIM EXTRACTION (required JSON fields for doctrine questions):
Return JSON with: reply, claims[], doctrineConclusion, confidence, memory_used.
```

Appended when `coreRestoration: true` (`openAiFirstCompanionRuntime` always sets this).

### C. What is NOT in the prompt

| String | Present? |
|--------|----------|
| `json_object` | **No** — only in code `response_format`, not prompt text |
| `structured JSON output` | **No** — uses "Return JSON only/with" instead |
| `json` in user message | **No** |

The API requires the word **`json`** in some form — **`JSON` uppercase satisfies this** (verified by static search: `/json/i` matches).

---

## Can `json_object` be set without JSON instructions?

| Path | Possible? |
|------|-----------|
| `callOpenAI` directly with custom empty system | **Code allows** — but no caller does |
| `composeReasonFirstReply` | **No** — always `buildComposerSystemPrompt` |
| `openAiFirstCompanionRuntime` | **No** — always `coreRestoration: true` |
| `runBuddy` cutover | **No** — only `openAiFirstCompanionRuntime` |

**Answer:** No reachable production path sets `json_object` without system JSON instructions.

---

## Ranked causes (A–F)

| Rank | Code | Description | Likelihood for BibleBuddy doctrine failures |
|------|------|-------------|---------------------------------------------|
| **1** | **F** | Other: auth resolved; remaining failures are post-gate (parse, validator, model quality) or infra | **High** |
| **2** | **E** | Wrong API surface for proof (`responses.create` ≠ `chat.completions` + `json_object`) | **High** (confusion, not runtime bug) |
| **3** | **F** | Manual Chat Completions repro without `json` word mimics 400 but not production | **High** for lab repro only |
| **4** | **A** | Missing JSON instruction in production prompt | **Very low** — disproven by static audit |
| **5** | **B** | JSON instruction stripped before send | **Very low** — no outbound stripper |
| **6** | **C** | Prompt assembly bug dropping `buildSystemPrompt` tail | **Very low** |
| **7** | **D** | Invalid response schema (model omits `claims[]`) | **Medium** — causes **E** downstream, not 400 |

---

## What to run to close the gap

### 1. Confirm JSON-mode passes with BibleBuddy-shaped system (not user-only)

```bash
node -e "
require('dotenv').config();
const { buildComposerSystemPrompt } = require('./services/reasonFirstComposer');
const { buildRetrievalEvidencePack } = require('./services/retrievalEvidencePack');
const OpenAI = require('openai');
(async () => {
  const msg = 'What is the third heaven?';
  const pack = buildRetrievalEvidencePack({ userId: 'gap', message: msg, routingHintsOnly: true });
  const system = buildComposerSystemPrompt({
    mode: 'COMPANION', personaKey: 'ADAPTIVE_COMPANION', profile: {},
    runtimeContext: {}, evidencePack: pack, userMessage: msg, coreRestoration: true,
  });
  const user = JSON.stringify({ userMessage: msg }, null, 2);
  console.log('json in system:', /json/i.test(system));
  console.log('json in user:', /json/i.test(user));
  const c = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const r = await c.chat.completions.create({
      model: 'gpt-4.1-mini',
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      max_tokens: 100,
    });
    console.log('SUCCESS', (r.choices[0].message.content||'').slice(0,120));
  } catch (e) {
    console.log('FAIL', e.status, e.message.slice(0,150));
  }
})();
"
```

**Expected if JSON mode was the blocker:** SUCCESS (or non-400 error).

### 2. Full pipeline

```bash
node -e "
require('dotenv').config();
const { runBuddy } = require('./services/buddyBrain');
runBuddy('gap-test','COMPANION','ADAPTIVE_COMPANION','What is the third heaven?')
  .then(r => console.log({
    openai: r.runtime?.openAiCalled,
    author: r.runtime?.coreDebug?.finalAnswerAuthor,
    err: (r.runtime?.coreDebug?.errorMessage||'').slice(0,80),
    claims: (r.claims||[]).length,
    reply: (r.reply||'').slice(0,100),
  }));
"
```

---

## Conclusion

| Statement | Verdict |
|-----------|---------|
| BibleBuddy failures are caused by missing JSON-mode instructions in production | **False** |
| Manual minimal `json_object` tests can 400 while BibleBuddy prompt is compliant | **True** |
| User payload alone is insufficient for JSON-mode if system prompt were removed | **True** (latent dependency) |
| Next investigation should target post-OpenAI path (claims, validators) or infra | **True** |

---

## Related documents

- [JsonModeComplianceAudit.md](JsonModeComplianceAudit.md)
- [JsonModeFailurePaths.md](JsonModeFailurePaths.md)
- [BibleBuddyOpenAIExecutionTrace.md](BibleBuddyOpenAIExecutionTrace.md)

**No fixes implemented. No deploy. No push.**
