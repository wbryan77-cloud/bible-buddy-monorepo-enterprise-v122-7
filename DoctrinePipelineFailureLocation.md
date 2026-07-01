# Doctrine Pipeline Failure Location

**Date:** 2026-06-07  
**Scope:** Classify failure location for Logos + Third heaven live traces  
**Artifact:** `docs/regression-trace/real-doctrine-turn-trace.json`

---

## Classification key (A–G)

| Code | Meaning | Detection signal |
|------|---------|------------------|
| **A** | Evidence missing (no frozen card for topic) | `cardIds.length === 0` |
| **B** | Evidence not retrieved | Pack empty despite topic match |
| **C** | Evidence not sent to OpenAI | `cardsInPrompt === false` or evidenceBytes === 0 |
| **D** | OpenAI ignored evidence | `openaiCalled: true` + unsupported claims in reply |
| **E** | Claims extraction failed | `openaiCalled: true` + `claims[]` empty |
| **F** | Validator failed | `claimValidation.passed === false` |
| **G** | Approval gate failed / degraded | `claimDegraded === true` or rejected approval |

**Additional (not A–G):** `API_FAILURE` — `chat.completions.create` throws; `openaiCalled: false`; connection message.

---

## Run summary

| Turn | Retrieval | Evidence in prompt | Chat Completions | openaiCalled | Primary code |
|------|-----------|-------------------|------------------|--------------|--------------|
| **Logos** | ✅ messiahLogos | ✅ 9,680 B | ❌ 401 | false | **API_FAILURE** |
| **Third heaven** | ✅ heavens + threeHeavens | ✅ 14,721 B | ❌ 401 | false | **API_FAILURE** |

---

## Logos — failure location

```
[Question] ──► [Retrieval ✅] ──► [Prompt ✅] ──► [OpenAI ❌ 401] ──► STOP
                                                      │
                                    claims / validator / approval NOT REACHED
```

| Stage | Status | File |
|-------|--------|------|
| Retrieval | PASS | `retrievalEvidencePack.js` |
| Prompt construction | PASS | `reasonFirstComposer.js:128–170` |
| **OpenAI request** | **FAIL** | `reasonFirstComposer.js:179–191` |
| Claims extraction | NOT RUN | `reasonFirstComposer.js:309–311` |
| Compose validator | NOT RUN | `doctrineBoundaryValidator.js` |
| Post-compose guards | NOT RUN | `openAiFirstCompanionRuntime.js:163–269` |
| Approval gate | CONNECTION ONLY | `openAiFirstCompanionRuntime.js:144–159` |
| Final answer | Connection fallback | `coreResponseGuards.js:71–74` |

**A–G:** None of D–G apply. Not A (card exists). Not B. Not C (evidence in prompt).

---

## Third heaven — failure location

```
[Question] ──► [Retrieval ✅] ──► [Prompt ✅ 14.7KB heavens] ──► [OpenAI ❌ 401] ──► STOP
```

Same stop point as Logos. Heaven evidence **was** prepared for the model; API auth prevented inference.

**Third heaven specific questions:**

| Question | Answer (this run) |
|----------|-------------------|
| Did OpenAI receive heaven evidence? | Request included it; API returned 401 before processing |
| Did OpenAI ignore it? | **Unknown** — no model output |
| Did validator approve? | **Not run** |
| Did approval gate alter it? | **Yes** — connection error gate replaced compose output |

---

## Where SUCCESS `responses.create` diverges from BibleBuddy

| Your proof | BibleBuddy path | This run |
|------------|-----------------|----------|
| `client.responses.create()` | `openai.chat.completions.create()` + `json_object` + 18–46 KB prompts | Chat Completions **401** |
| Fresh client in REPL | Singleton `openaiClient.js` | Same singleton, key present (len 257) |
| Minimal input | Full doctrine system prompt | |

**Exact flip point:** `reasonFirstComposer.js:179` — first line that differs from your proof test.

---

## If answer is wrong (future runs with `openaiCalled: true`)

Use this decision order:

1. **A/B** — `retrieval.cardIds` empty?
2. **C** — `promptConstruction.cardsInPrompt` false?
3. **API_FAILURE** — `openaiCalled` false + `connectionError`?
4. **E** — `openaiCalled` true but `claims.length === 0`?
5. **D** — claims present but unsupported vs evidence graph?
6. **F** — `claimValidation.passed === false`?
7. **G** — `claimDegraded === true`?
8. **NONE** — pipeline OK; wrong answer is model quality (out of A–G scope)

---

## Reproduction

```bash
export OPENAI_API_KEY=<valid-key>
node scripts/realDoctrineTurnTraceRunner.js
```

Inspect `docs/regression-trace/real-doctrine-turn-trace.json`:

- `partA.logos.success` / `partA.third_heaven.success` — Chat Completions proof
- `turns[].runBuddy.openaiCalled` — full pipeline proof
- `turns[].failureClassification.primary` — should be `PIPELINE_OK` when healthy

---

## Constraints honored

- No doctrine, evidence, validator, retrieval, traceability, approval-gate, or prompt modifications
- Diagnostic runner only: `scripts/realDoctrineTurnTraceRunner.js`
- No deploy, no push

**No fixes implemented.**
