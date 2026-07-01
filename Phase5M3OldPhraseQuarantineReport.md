# Phase 5M.3 Old Phrase Quarantine Report

**Date:** 2026-06-16

## Mission

Remove or quarantine proven broken phrase producers from Phase 5M.2. No new engines, memory systems, or companion modules.

## Changes Applied

### Part 1 — Generic Scripture clarifier quarantined

**File:** `services/bibleCompanionOrchestrator.js`

- `buildClarificationReply` returns `null` when context exists, prayer intent, or app identity.
- New safe wording only when genuinely ambiguous:
  *"I want to make sure I answer the right thing. Are you asking about a Bible passage, a life situation, or something you want prayer for?"*
- `tryContextualDraftBeforeClarification` routes to practical wisdom, prayer, identity, or presence before clarification lane.
- Removed: *"I want to answer from Scripture directly"*, *"which book, topic, or passage"*, *"line upon line"*.

### Part 2 — Prayer verse-list direct answer removed

**File:** `services/bibleConceptGraph.js`

- `prayer_comfort.directAnswer` → `null`, `helperOnly: true`.

**Callers updated:**

- `companionResponseBuilder.buildDoctrineCompanionAnswer` — returns `null` for pray-with-me; teaching path for *"What does the Bible say about prayer?"*
- `bibleWideReasoningEngine.buildBibleWideAnswer` — skips prayer_comfort when user asks to pray.

### Part 3 — Pork polarity and taste distinction

**Files:** `services/singleCompanionContract.js`, `services/directAnswerFormatter.js`

- Permission: *"No. Staying with Scripture, pork is unclean and not food God permits His people to eat…"*
- Taste: *"Many people may like the taste of pork, but biblically that does not make it clean or good to eat…"*
- Correction ack updated for yes-permission challenges.
- `directAnswerFormatter` skips polarity stacking on taste questions; fixes lowercase *"No. staying"*.

### Part 4 — Final forbidden phrase gate

**File:** `services/singleCompanionContract.js`

- `scanForbiddenFinalSubstrings` + final repair before return.
- `SAFE_COMPANION_CLARIFICATION` fallback when repair impossible.
- `forbiddenPhraseDetected` on contract result → `runtime.forbiddenPhraseDetected`.

### Part 5 — Route tracing

- `[ROUTE_OWNERSHIP]` logs include `forbiddenPhraseDetected: true/false`.

## Regression Results

| Suite | Result |
|-------|--------|
| Phase 5M.3 quarantine (11) | **11/11** |
| Phase 5M.2 route verification | PASS |
| Phase 5M.1 known path (8) | **8/8** |
| Phase 5M deploy parity | **PASS** |
| Phase 4H doctrine | **28/28** |

## Ownership Locked

Final text owner: **`liveResponseOwner` → `singleCompanionContract`**

Draft producers quarantined; forbidden substrings blocked at contract gate.

## Verdict

| Question | Answer |
|----------|--------|
| Safe to commit? | **Yes** |
| Safe to push? | **Yes** (exclude workflows/data per parity gate) |
| Safe for controlled alpha? | **Yes** |
| New architecture added? | **No** |
