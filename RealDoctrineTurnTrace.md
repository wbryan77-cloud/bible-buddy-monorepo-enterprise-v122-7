# Real Doctrine Turn Trace

**Date:** 2026-06-07  
**Priority:** CRITICAL  
**Goal:** Prove whether the BibleBuddy doctrine pipeline executes successfully from OpenAI request through final answer  
**Status:** Diagnosis only — no doctrine, evidence, validator, retrieval, traceability, approval-gate, or prompt changes. No fixes, deploy, or push.

---

## Executive summary

| Stage | Logos | Third heaven | Verdict |
|-------|-------|--------------|---------|
| Retrieval | `messiahLogos` card | `heavens` card + `threeHeavens` catalog | **PASS** |
| Evidence in prompt | 9,680 bytes, card present | 14,721 bytes, card + catalog present | **PASS** |
| Chat Completions (Part A exact shape) | 401 auth error | 401 auth error | **FAIL** (this run) |
| `composeReasonFirstReply` | `openaiCalled: false` | `openaiCalled: false` | **FAIL** (blocked at API) |
| `runBuddy` final answer | Connection fallback | Connection fallback | **FAIL** (blocked at API) |
| Claims extraction | `[]` (no model output) | `[]` | **NOT REACHED** |
| Validator / approval gate | Not reached | Not reached | **NOT REACHED** |

**Pipeline conclusion (this run):** Retrieval → prompt construction **succeeds**. The pipeline **stops at `chat.completions.create`** (`reasonFirstComposer.js:179`). No doctrine quality classification (D–G) applies until Chat Completions returns a successful JSON response.

**Environment note:** You reported `responses.create` SUCCESS in your shell. This trace used the **exact BibleBuddy `chat.completions.create` shape**. In the agent execution environment, Chat Completions returned **401 Incorrect API key** — so this run cannot prove post-OpenAI behavior. Re-run locally where `responses.create` succeeds:

```bash
export OPENAI_API_KEY=<your-valid-key>
node scripts/realDoctrineTurnTraceRunner.js
```

Artifact: `docs/regression-trace/real-doctrine-turn-trace.json`

---

## PART A — Exact Chat Completions test

Mirrors `services/reasonFirstComposer.js` lines 179–186:

| Field | Logos | Third heaven |
|-------|-------|--------------|
| **model** | `gpt-4.1-mini` | `gpt-4.1-mini` |
| **response_format** | `{ type: 'json_object' }` | `{ type: 'json_object' }` |
| **temperature** | `0.72` | `0.72` |
| **system prompt bytes** | 23,208 | 28,249 |
| **user payload bytes** | 11,333 | 18,069 |
| **total prompt bytes** | 34,541 | 46,318 |
| **success** | **false** | **false** |
| **error code** | `401` | `401` |
| **error message** | `401 Incorrect API key provided` | `401 Incorrect API key provided` |
| **raw model reply** | null | null |

Part A uses full `enrichRuntimeContextWithMemory` (larger than slim `runBuddy` prompt-only measurement). Both shapes exceed 9 KB evidence for doctrine turns.

**API surface:** This is `chat.completions.create` — **not** `responses.create`. A successful `responses.create` proof does not exercise this request.

---

## PART B & C — Turn trace summary

See dedicated reports:

- [LogosDoctrineTrace.md](LogosDoctrineTrace.md) — `"What does Logos mean in John 1:1?"`
- [ThirdHeavenDoctrineTrace.md](ThirdHeavenDoctrineTrace.md) — `"What is the third heaven?"`

---

## Live execution map (both turns)

```
Question
  → buildRetrievalEvidencePack          ✅ cards retrieved
  → buildComposerSystemPrompt           ✅ evidence JSON embedded
  → composeReasonFirstReply
       → callOpenAI
            → chat.completions.create   ❌ 401 (this run)
  → openaiCalled: false
  → buildConnectionErrorReply           connection message
  → finalizeBuddyResponse               memory/session IO
  → final answer                        NOT OpenAI-authored
```

Stages **not executed** this run: claims extraction from model JSON, post-compose guards, claim validator, approval/degradation.

---

## Memory

| Turn | RSS before | RSS after | Δ RSS |
|------|------------|-----------|-------|
| Logos | 113 MB | 144 MB | +31 MB |
| Third heaven | 150 MB | 152 MB | +2 MB |

No OOM signature. Failure is API auth, not memory.

---

## How to complete proof on your machine

1. Confirm Chat Completions (not just Responses API):

```bash
node -e "
const OpenAI=require('openai');
const c=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
c.chat.completions.create({
  model:'gpt-4.1-mini',
  response_format:{type:'json_object'},
  messages:[{role:'user',content:'{\"reply\":\"OK\"}'}]
}).then(()=>console.log('chat OK')).catch(e=>console.log('chat FAIL',e.status,e.message));
"
```

2. Run full trace:

```bash
node scripts/realDoctrineTurnTraceRunner.js
```

3. Check JSON: `partA.*.success === true`, `turns[].runBuddy.openaiCalled === true`, `claims.length > 0`.

---

## Related documents

- [DoctrinePipelineFailureLocation.md](DoctrinePipelineFailureLocation.md) — A–G classification
- [BibleBuddyOpenAIExecutionTrace.md](BibleBuddyOpenAIExecutionTrace.md) — prior API surface audit

**No fixes implemented.**
