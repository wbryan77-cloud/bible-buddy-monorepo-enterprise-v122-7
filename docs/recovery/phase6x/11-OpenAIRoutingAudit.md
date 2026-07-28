# 11 — OpenAI Routing Audit (Phase 6X Obj6)

**Date:** 2026-07-27  
**Status:** FAIL found → surgical repair applied (local)

## Production probe evidence (pre-repair tip)

| Probe | Route | Result |
|---|---|---|
| What is the capital of France? | `bible_companion_clarification` | **FAIL** — generic clarifier |
| What is photosynthesis? | `bible_companion_clarification` | **FAIL** — generic clarifier |
| Who was the first US president? | `reason_first_openai` | PASS (answered) |
| What year did WWII end? | `reason_first_openai` | PASS (answered) |
| What does John 1:1 say? | `bible_wide_reasoning` | PASS (Scripture) |
| Who changed the Sabbath to Sunday? | `doctrine_final_authority` | PASS (doctrine/history lane) |

## Root cause

`UNKNOWN_BIBLE_RE` in `bibleReasoningEngine.js` matched any `what is` / `what does` / `explain` without a biblical frame, forcing `answerLane = clarification` when no concept/strictTopic existed.

## Repair (Obj6)

- `isUnknownBiblePhraseAsk` requires biblical frame or known nonsense token; excludes secular factual patterns
- `GENERAL_FACTUAL` intent in `currentMessageIntent` (secular definitions before doctrine catch-alls)
- Composer skips bible-only stack for `general_factual`

## Guardrails preserved

Doctrine intents, claim verifier, bible-only on doctrine turns, history anti-leak, Scripture John 1:1 path unchanged.
