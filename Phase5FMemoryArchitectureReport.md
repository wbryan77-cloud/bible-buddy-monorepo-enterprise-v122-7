# Phase 5F — Memory Architecture Report

**Date:** 2026-06-14

## Memory Layers

### 1. Turn memory (`doctrineConversationState.turnMemory`)

- `lastUserQuestion`
- `lastAnsweredConcept`
- `lastRefsShown` (up to 5)
- `lastAnswerSummary`

Updated via `updateTurnMemory` / `recordAnswerTurnMemory` after bible_wide and strict answers.

### 2. Session memory (`doctrineConversationState.sessionMemory`)

- `currentStruggle` (reserved)
- `activeConcept`
- `pendingQuestion`
- `stylePreferences`

Bound to session; cleared on `finalizeStopRelease`.

### 3. Persistent user preference memory (`userCorrectionMemory.json`)

Safe preferences:

- `directAnswerFirst`, `giveTwoThreeScriptures`, `companionWarmth`
- `forbidYesOpener`, `requireNoForForbidden`, `yesNoDirect`
- `forbidPhrases`: primarily, interpretations vary, etc.
- `forbidParableDoctrineProof`

### 4. Global learning candidates (`concept-growth-candidates.json`)

- `pending_review` only
- Non-personal language/concept improvements
- Never auto-promoted to doctrine authority

### 5. Reflection memory (`reflection-memory.json`)

- Session-scoped records with TTL
- Routing failures, pending questions, synonym candidates

## Honest Memory Replies

| User request | Reply behavior |
|--------------|----------------|
| Session correction | Recorded in reflection memory (session TTL) |
| Persistent preference | `userCorrectionMemory` when pattern matches |
| Global learning candidate | `LEARNING_ACK` — pending_review, no doctrine auto-change |
| Cross-thread recall | Only from `doctrineConversationState` + reflection when persisted |

Never: "I cannot modify a database" when reflection memory is active.

## Stop / Release Memory

`finalizeStopRelease` clears:

- Active doctrine topic, Bible concept, pending continuation
- `releaseRequested` after stop acknowledgment delivered
- Session active concept / pending question

Preserves: `topicHistory`, turn memory audit trail, used witnesses (for strict continuity if needed).

## Bounds

- Reflection records: 40/user max
- Growth candidates: 200 max
- Topic history: 8 max
- Turn refs shown: 5 max

## Memory Readiness Score: **8/10**

Layered memory works; cross-session personal facts intentionally not stored globally.
