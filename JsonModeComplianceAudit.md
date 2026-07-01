# JSON Mode Compliance Audit

**Date:** 2026-06-07  
**Priority:** CRITICAL  
**Scope:** `services/reasonFirstComposer.js` and all `json_object` call sites  
**Premise:** `responses.create` succeeds; `chat.completions.create` authenticates; manual minimal test returns **400** unless messages contain the word `json`.  
**Status:** Diagnosis only — no code changes, deploy, or push.

---

## Executive verdict

| Question | Answer |
|----------|--------|
| Does production `reasonFirstComposer` send `json_object` **without** JSON instructions? | **No** |
| Is the production system prompt JSON-mode compliant? | **Yes** — 3× literal `JSON` in system (case-insensitive `json` match) |
| Does the user payload contain the word `json`? | **No** — only structured keys (`userMessage`, `evidence`, …) |
| Is OpenAI's 400 JSON rule the likely cause of **full** BibleBuddy doctrine turns? | **Unlikely** — system prompt satisfies the requirement |
| Is the 400 rule the cause of **minimal manual** Chat Completions tests? | **Yes** — user-only body without `json` word |

**Conclusion:** `reasonFirstComposer` as wired for production (`coreRestoration: true` via `openAiFirstCompanionRuntime`) produces **valid JSON-mode requests**. Failures that look like “OpenAI didn't run” are **not explained by missing JSON instructions** in the assembled production prompt.

---

## 1. `callOpenAI` request shape (`reasonFirstComposer.js:173–192`)

```javascript
await openai.chat.completions.create({
  model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
  temperature,
  response_format: { type: 'json_object' },
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: JSON.stringify(userPayload, null, 2) },
  ],
});
```

| Field | Value |
|-------|-------|
| **model** | `process.env.OPENAI_MODEL \|\| 'gpt-4.1-mini'` |
| **response_format** | `{ type: 'json_object' }` |
| **temperature** | `0.72` (or `0.55` on internal regen attempt > 0) |
| **system** | Output of `buildComposerSystemPrompt()` |
| **user** | `JSON.stringify(userPayload, null, 2)` |

---

## 2. System prompt assembly (`buildComposerSystemPrompt` 128–171)

Production order (`coreRestoration: true`, used by `openAiFirstCompanionRuntime`):

```
buildSystemPrompt()                    ← includes "Return JSON only using this shape:"
  + applyPersonFirstCompanionHierarchy
  + COMPOSER_INSTRUCTION
  + BIBLE_ONLY_AUTHORITY_INSTRUCTION
  + CLAIM_EXTRACTION_INSTRUCTION       ← "required JSON fields", "Return JSON with:"
  + CORE_RESTORATION_INSTRUCTION
  + COMPANION_TONE_INSTRUCTION
  + Evidence pack (binding facts…): {JSON evidence}
```

### JSON-related strings in production system prompt (measured, third heaven)

| # | Source | Line(s) | Text (excerpt) |
|---|--------|---------|----------------|
| 1 | `buddyBrain.js` | 339–351 | `Return JSON only using this shape:` + schema block |
| 2 | `reasonFirstComposer.js` | 79 | `CLAIM EXTRACTION (required JSON fields for doctrine questions):` |
| 3 | `reasonFirstComposer.js` | 80 | `Return JSON with: reply, claims[], doctrineConclusion, confidence, memory_used.` |

**Static audit:** `containsJsonCaseInsensitive: true`, `jsonWordCount: 3` (system only).  
**User payload:** `userPayloadHasLiteralJsonWord: false`.

### Non-production path (`coreRestoration: false`)

Still includes `buildSystemPrompt` → **1×** `Return JSON only using this shape:`  
Does **not** include `CLAIM_EXTRACTION_INSTRUCTION` (no extra `Return JSON with:`).

---

## 3. User payload (`composeReasonFirstReply` 219–252)

Representative keys:

```json
{
  "userMessage": "...",
  "conversationHistory": "...",
  "activeConversation": { ... },
  "threadLocal": { ... },
  "emotionalCenter": null,
  "detailCandidates": [ ... ],
  "listeningGuidance": "...",
  "correctionLedger": null,
  "companionThreadContext": { ... },
  "evidence": {
    "memory", "scripture", "history", "doctrine",
    "evidenceCards", "discoveryReinforcement", ...
  },
  "regenInstruction": null,
  "currentIntent": "...",
  "goldenExamplesEnabled": false
}
```

- Serialized via `JSON.stringify(userPayload, null, 2)` — **syntax is JSON**, but the **literal substring `json` does not appear** in the user message text.
- Compliance relies on **system-role** JSON instructions (allowed by OpenAI’s rule on combined `messages`).

---

## 4. Claims[] instructions (`CLAIM_EXTRACTION_INSTRUCTION` 78–89)

```
CLAIM EXTRACTION (required JSON fields for doctrine questions):
Return JSON with: reply, claims[], doctrineConclusion, confidence, memory_used.
Each claim object: { claimId, claim, type, supportingScriptures, confidence, derivedFrom }.
- type: doctrine | pastoral | procedural | clarification
...
- claims[] is metadata for validation; only reply is user-facing prose.
```

Included **only** when `coreRestoration: true` (production path).

---

## 5. Expected response schema (instruction-level, not OpenAI `response_format` schema)

From `buildSystemPrompt` + claims block:

| Field | Instructed |
|-------|------------|
| `reply` | Yes |
| `scripture` | Yes (base schema) |
| `claims[]` | Yes (core restoration) |
| `doctrineConclusion` | Yes (core restoration) |
| `confidence`, `memory_used` | Yes |
| `mode`, `orb_state`, `safety_level`, … | Yes (base schema) |

OpenAI `json_object` mode does **not** enforce this schema server-side — only requires valid JSON object in the response.

---

## 6. Code paths using `json_object`

| Module | Production? | JSON word in system? |
|--------|-------------|----------------------|
| `reasonFirstComposer.js` | **Yes** (`/buddy/chat`) | **Yes** (3× with coreRestoration) |
| `masterBuddyRuntime.js` | Bypassed | **Yes** (`buildSystemPrompt`) |
| `shadowReasonFirstRuntime.js` | Experiment | **Yes** (`buildSystemPrompt`) |
| `bibleBuddyLiteRuntime.js` | Experiment | **Yes** (`buildSystemPrompt`) |
| `reasonFirstLiteRuntime.js` | Experiment | **Yes** (`Return JSON only:` in LITE_ROLE) |
| `minimalReasonFirstRuntime.js` | Experiment | **Yes** |
| `companionConversationExperimentRuntime.js` | Experiment | **Yes** |
| `companionOperatingModelExperiment.js` | Experiment | **Yes** |
| `responseStructureRemovalExperiment.js` | Experiment | **Yes** |

**Single production entry:** `composeReasonFirstReply` → `callOpenAI` — always builds system via `buildComposerSystemPrompt` (line 260).

---

## 7. OpenAI JSON-mode rule vs BibleBuddy

**OpenAI requirement (your manual repro):**

> `'messages' must contain the word 'json' in some form, to use 'response_format' of type 'json_object'.`

| Request type | Contains `json`? | Expected API result |
|--------------|------------------|---------------------|
| User-only: `{"reply":"OK"}` | **No** | **400** |
| System: `Return JSON only: …` + user payload | **Yes** (system) | **200** (if auth OK) |
| Full BibleBuddy production system prompt | **Yes** (3×) | **200** (if auth OK) |

---

## 8. Ranked causes (JSON-mode specific)

| Rank | Code | Cause | Applies to production BibleBuddy? |
|------|------|-------|-----------------------------------|
| 1 | **F** | Manual/minimal Chat Completions test without `json` in any message | **No** (full prompt differs) |
| 2 | **E** | Proof used `responses.create` instead of `chat.completions` + `json_object` | N/A to composer |
| 3 | **A** | Missing JSON instruction in assembled prompt | **No** — instruction present |
| 4 | **B** | JSON instruction stripped post-assembly | **No** — no stripper on outbound prompt |
| 5 | **C** | Prompt assembly bug omitting `buildSystemPrompt` tail | **No** — always included |
| 6 | **D** | Invalid response schema (post-response parse) | Separate from 400 request error |
| 7 | **F** | Auth, rate limit, OOM, network | Other failure class |

---

## Related documents

- [JsonModeFailurePaths.md](JsonModeFailurePaths.md)
- [OpenAIJsonRequirementGapReport.md](OpenAIJsonRequirementGapReport.md)

**No fixes implemented.**
