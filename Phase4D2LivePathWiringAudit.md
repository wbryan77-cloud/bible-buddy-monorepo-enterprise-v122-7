# Phase 4D.2 Live Path Wiring Audit

Generated: 2026-06-11T05:00:14.438Z

## Verified chain
1. `routes/buddy.js` POST `/chat` → `runBuddy()`
2. `services/buddyBrain.js` `runBuddy()` → `openAiFirstCompanionRuntime` (hard cutover)
3. `buildRetrievalEvidencePack()` → `attachDoctrineStrictContract()`
4. `tryDoctrineLivePathHandlers()` — continuation, memory, correction (no OpenAI)
5. `composeReasonFirstReply()` — first doctrine answer only + finality + correction memory
6. `validateDoctrineStrictReply()` + safe corpus on failure
7. `applyDoctrineErrorFirewall()` on outbound reply

## Phase 4D.2 additions
- `doctrineConversationState.js` — active topic memory
- `doctrineCorrectionMemory.js` — session correction learning
- `doctrineLivePathHandlers.js` — unified live path bypass
- Guard regen disabled when `doctrineStrict.enabled`
- Internal system messages filtered in `appendSession`
- User-facing exhaustion message (not internal diagnostic)

## Regression: 58/58