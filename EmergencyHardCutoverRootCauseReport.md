# Emergency Hard Cutover — Root Cause Report

**Date:** 2026-06-05  
**Priority:** CRITICAL  
**Scope:** Single final answer owner (OpenAI), current-message intent, evidence-only subsystems  
**Status:** IMPLEMENTED + LOCAL VALIDATION PASSED (18/18 regression, API-failure mode)

---

## Root problem addressed

BibleBuddy was behaving as if multiple systems could own the final response. This cutover removes template/witness/study/fallback responders from the normal `/buddy/chat` path and enforces:

```
latest user message
→ classify current message intent
→ retrieve Bible evidence only (intent-constrained)
→ OpenAI reasons and authors final answer (reasonFirstComposer)
→ doctrine validator + ownership guard + directness guard + forbidden-prose guard
→ return final answer
```

No other system may author normal final prose.

---

## Task 1 — Single final answer owner

| Change | File |
|--------|------|
| **Hard lock** — `runBuddy` always routes to `openAiFirstCompanionRuntime`; `BUDDY_OPENAI_FIRST=0` and `BUDDY_RUNTIME=reason_first` bypasses disabled with warning | `services/buddyBrain.js` |
| Relationship enrichment, study journey, companion next-steps **skipped** when `BUDDY_TEMPLATE_PROSE≠1` | `services/buddyBrain.js` `finalizeBuddyResponse` |
| Template responders never invoked on live path | `services/openAiFirstCompanionRuntime.js` |
| Removed generic “tell me more” fallback from route normalizer | `routes/buddy.js` |

**Disabled as final speakers (evidence/debug only):**  
`sourceGroundedResponder`, `scriptureWitnessEngine`, `CompanionDoctrinePresenter`, `personalizedFallback`, `companionLearningLayer`, relationship enrichment, prayer responder, `sabbathHistoryDeepResponder`, `masterBuddyRuntime.templateDispatch`, study continuation, generic fallbacks.

**Accepted non-OpenAI exceptions:** crisis protocol, transparent connection-error message when API unavailable.

---

## Task 2 — Current message intent layer

**New:** `services/currentMessageIntent.js`

Intent categories: `direct_yes_no`, `definition`, `meaning_word_study`, `how_to_practice`, `doctrine_explanation`, `history_question`, `correction_repair`, `emotional_companion`, `practical_life_help`, `admin_debug`, `unclear`.

**Rules:**
- Latest message dominates; prior session topic does not override new questions.
- `history_question` only when user explicitly asks history.
- `correction_repair` only when correction language is in the **current** message (not stale ledger bleed).
- Composer receives `intentComposerGuidance` per turn.

---

## Task 3 — Evidence selection follows intent

**Updated:** `services/retrievalEvidencePack.js`

- Topic resolved from **current message** when intent is direct/definition/word-study/how-to/correction.
- `history.included` only when `intentConstraints.historyAllowed` (history intent).
- Study state suppressed unless intent is unclear.
- `answerGuidance` receives `currentIntent` and `historyAllowed`.

---

## Task 4 — Forbidden prose guard

**New:** `services/forbiddenProseGuard.js`

Blocks visible labels: witness triplet phrases, Witness path, Genesis-to-Revelation Study Path, study continuation, “You've been studying”, “I'm here with you. Tell me a little more.”

On detection: **one OpenAI regen** with standard instruction, then strip if still present.

---

## Task 5 — Generic directness guard

**New:** `services/directnessGuard.js`

Before return, checks:
1. Answer addresses latest message  
2. Intent-type match (yes/no lead, word study, how-to, how-many, correction repair)  
3. History only when allowed  
4. OpenAI authored reply  

Fail → one regen via `openAiFirstCompanionRuntime`.

---

## Task 6 — Regression battery

**Script:** `scripts/emergencyHardCutoverRegression.js`  
**Artifact:** `docs/regression-trace/emergency-hard-cutover-root-cause-results.json`

**Result: 18/18 PASS** (local, 2026-06-05)

| Category | Tests |
|----------|-------|
| Pork yes/no, Acts 10 | ✅ |
| Sabbath definition, yes/no, how-to, correction, Hebrew holy | ✅ |
| Logos, holy meaning, heavens, third heaven | ✅ |
| Grief, Alzheimer's, anger, money | ✅ |
| “You didn't answer”, “That was not my question” | ✅ |
| Sabbath history (allowed when asked) | ✅ |

**Note:** OpenAI returns 429 quota exceeded — all turns validated **architecture + failure-path hygiene** (`apiFailureOnly: true`). Happy-path criteria (`openaiCalled=true`, `finalAnswerAuthor=openai`) require quota restore.

---

## Task 7 — Debug trace

When `BUDDY_DEBUG=1` or `BUDDY_LIVE_TRACE=1`, responses include:

`runtimeUsed`, `currentIntent`, `historyAllowed`, `evidenceCardsUsed`, `openaiCalled`, `openaiResponseReceived`, `finalAnswerAuthor`, `templateUsed`, `fallbackUsed`, `studyFallbackUsed`, `responderUsed`, `relationshipEnrichmentUsed`, `sourceGroundedResponderUsed`, `sabbathHistoryDeepResponderUsed`, `forbiddenPhraseDetected`, `answerMatchesLatestQuestion`, `regenerated`

Implemented in `services/coreRestorationDebug.js`, `services/openAiFirstCompanionRuntime.js`, `services/liveRequestTrace.js`.

---

## Architecture verification

| Check | Result |
|-------|--------|
| `BUDDY_OPENAI_FIRST=0` bypass blocked | ✅ warns + uses openAiFirst |
| `BUDDY_RUNTIME=reason_first` bypass blocked | ✅ warns + uses openAiFirst |
| `sourceGroundedResponderUsed` on live path | ✅ always false |
| `sabbathHistoryDeepResponderUsed` on live path | ✅ always false |
| `relationshipEnrichmentUsed` on live path | ✅ always false |
| Study/template on API failure | ✅ none |
| Intent classification | ✅ 18/18 |

---

## Files created / modified

| File | Role |
|------|------|
| `services/currentMessageIntent.js` | Intent layer (new) |
| `services/directnessGuard.js` | Directness guard (new) |
| `services/forbiddenProseGuard.js` | Forbidden labels (new) |
| `services/openAiFirstCompanionRuntime.js` | Guard stack + debug |
| `services/retrievalEvidencePack.js` | Intent-constrained evidence |
| `services/buddyBrain.js` | Hard routing lock |
| `services/reasonFirstComposer.js` | Intent in composer payload |
| `services/answerGuidance.js` | historyAllowed from intent |
| `services/coreRestorationDebug.js` | Extended debug fields |
| `services/liveRequestTrace.js` | Extended live trace |
| `services/coreResponseGuards.js` | Additional forbidden patterns |
| `routes/buddy.js` | Remove tell-me-more fallback |
| `scripts/emergencyHardCutoverRegression.js` | Regression battery (new) |

---

## Blockers before deploy

1. **Restore OpenAI quota** — re-run regression for happy-path `finalAnswerAuthor=openai`.
2. **No deploy** until user approves post-verification (per instructions).

---

## Verdict

**Root-cause architecture cutover complete.** Template/witness/study/fallback systems are demoted to evidence-only on `/buddy/chat`. Current-message intent drives evidence and guards. Local validation **18/18 passed** in API-failure mode. No Phase 2, no beta, no new doctrine.
