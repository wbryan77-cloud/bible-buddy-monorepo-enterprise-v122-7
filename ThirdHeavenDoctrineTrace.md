# Third Heaven Doctrine Trace

**Date:** 2026-06-07  
**Question:** `What is the third heaven?`  
**Status:** Live trace — diagnosis only

---

## Pipeline trace

| Step | Result | Detail |
|------|--------|--------|
| **Question** | — | `What is the third heaven?` |
| **Retrieval** | ✅ | `topic: heavens`, `effectiveTopic: heavens` |
| **Evidence cards** | ✅ | `cardIds: ["heavens"]` |
| **Catalog keys** | ✅ | `["threeHeavens"]` |
| **Scripture refs in pack** | 10 | |
| **currentIntent** | `definition` | |
| **historyAllowed** | `false` | |
| **Prompt construction** | ✅ | `systemPromptBytes: 23,354` |
| **Evidence in prompt** | ✅ | `evidenceBytes: 14,721`, `heavens` + `threeHeavens` |
| **OpenAI request** | ❌ | `chat.completions.create` — **401 Incorrect API key** |
| **openaiCalled** | **false** | |
| **Raw model reply** | *(empty)* | |
| **claims[]** | `[]` | |
| **Validator** | skipped | |
| **Approval gate** | `blocked_connection` | |
| **finalAnswer** | Connection fallback | |

---

## Did OpenAI actually receive the heaven evidence?

| Layer | Answer |
|-------|--------|
| **Retrieval** | Yes — `heavens` card + `threeHeavens` catalog |
| **Prompt build** | Yes — 14,721 bytes of evidence JSON in system prompt |
| **HTTP request** | Request was formed with full system+user messages |
| **API acceptance** | **No** — 401 rejected before model inference (this run) |
| **Model processing** | **Not reached** |

**Conclusion:** Heaven evidence **is retrieved and serialized into the prompt**. OpenAI did **not** process it in this run because Chat Completions failed authentication.

---

## Did OpenAI ignore it?

**Not determinable** — no successful model response. Cannot classify as D (ignored evidence) without `openaiCalled: true` and claims/reply to compare against evidence.

---

## Did validator approve it?

**Not reached.** No `claims[]`, no `claimValidation.claimResults`. Post-hoc validator in measurement would show `postPassed: true` on empty claims — artifact only.

---

## Did approval gate alter it?

| Gate | Action |
|------|--------|
| Connection gate | **Yes** — substituted `buildConnectionErrorReply` when `openaiCalled: false` |
| Claim validator | Not run |
| Degradation | `claimDegraded: false` |
| Regeneration | `regenerated: false` |
| approvalDecision | `blocked_connection` |

The only gate that fired was **connection error substitution** (`openAiFirstCompanionRuntime.js:144–159`), not claim approval/degradation.

---

## Retrieved evidence

```json
{
  "topic": "heavens",
  "effectiveTopic": "heavens",
  "cardIds": ["heavens"],
  "catalogKeys": ["threeHeavens"],
  "scriptureRefCount": 10,
  "historyAllowed": false,
  "currentIntent": "definition"
}
```

---

## Prompt / evidence sent

| Metric | Value |
|--------|-------|
| System prompt size | 23,354 bytes |
| Evidence JSON in system prompt | 14,721 bytes |
| Cards in prompt | `heavens` |
| Catalog in prompt | `threeHeavens` |

Matches Phase 1B offline measurement (14,721 bytes for third heaven).

---

## OpenAI layer

### Part A (exact `callOpenAI` shape)

| Field | Value |
|-------|-------|
| model | `gpt-4.1-mini` |
| response_format | `json_object` |
| totalPromptBytes | 46,318 |
| success | **false** |
| errorCode | 401 |

### runBuddy

| Field | Value |
|-------|-------|
| openaiCalled | false |
| finalAnswerAuthor | connection_error |
| masterRoute | core_connection_error |
| rawReply | Connection message |
| claims | `[]` |

---

## Memory

| | RSS MB | Heap used MB |
|--|--------|--------------|
| Before | 150 | 17 |
| After | 152 | 21 |

---

## Failure classification (A–G)

| Code | Applies? | Reason |
|------|----------|--------|
| A evidence missing | **No** | `heavens` card present |
| B evidence not retrieved | **No** | |
| C evidence not sent | **No** | 14,721 bytes in prompt |
| D OpenAI ignored evidence | **N/A** | No response |
| E claims extraction failed | **N/A** | API block |
| F validator failed | **N/A** | |
| G approval gate failed | **N/A** | Only connection gate |

**Primary:** `API_FAILURE`

---

## Expected path when Chat Completions succeeds

When `openaiCalled: true` on your machine:

1. Model receives `heavens` card + `threeHeavens` catalog in system prompt
2. JSON response should include `reply`, `claims[]`, `doctrineConclusion`
3. `validateClaimToScripture` runs in compose + post-compose guards
4. Approval: `approved` | `degraded` | `rejected` based on claim validation
5. `finalAnswerAuthor: openai`

Re-run: `node scripts/realDoctrineTurnTraceRunner.js` with valid key to capture this path.

**No fixes implemented.**
