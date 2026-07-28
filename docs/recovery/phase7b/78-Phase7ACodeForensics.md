# 78 — Phase 7A Code Forensics

Independent verification (see also [forensics agent](e5ef04e6-c25a-4db3-a83f-1e1a037750db)).

## Claim scorecard (pre-7B repair)

| 7A claim | Independent verdict |
|---|---|
| Prayer personalization | PASS (main path); “mother's” grammar FAIL; alternate OpenAI path missing userId RISK |
| Remember natural | PASS reply; BNC side-effect RISK |
| Recall person-first | PASS |
| Pray again | PASS intent; subject wipe bug fixed in 7A tip |
| Presence before dump | PASS |
| No parallel store | PASS (no *new* store); pre-existing JSON parallels remain |
| Selector thin | **FAIL** — `notePersonalRemember` persisted |

## Files inspected

`relationshipContextSelector.js`, `prayerCompanionEngine.js`, `bibleCompanionOrchestrator.js`, `responseRevisionOwner.js`, `humanNeedDetector.js`, `relationshipMemoryEngine.js`, `relationshipSummaryEngine.js`, `companionReplyPolish.js`, `openAiFirstCompanionRuntime.js`, `conversationContinuationMemory.js`, `doctrineConversationState.js`

## Order-dependent behavior

Early personal-remember exit before learning ACK — intentional.  
Celebration before bible_wide — intentional.  
`recordRelationshipSignal` before care lanes — required so prayer sees struggle.

## Multi-instance

`data/relationship-memory.json` and `data/doctrine-conversation-state.json` are local files → not multi-instance authoritative.

## 7B forensic repairs applied

Selector no longer persists; short/no-advice prayer; stopwords; resolved burdens; OpenAI prayer `userId`; forget clears preferences best-effort.
