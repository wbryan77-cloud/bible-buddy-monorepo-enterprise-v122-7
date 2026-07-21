# Phase 4D.3 Live Leak Audit

Generated: 2026-06-11T05:32:09.757Z

## /buddy/chat OpenAI call paths
- `routes/buddy.js` → `runBuddy` → `openAiFirstCompanionRuntime`
- Strict doctrine initial: `doctrine_final_authority` (NO OpenAI)
- Strict continuation/correction/memory: `doctrineLivePathHandlers` (NO OpenAI)
- Non-doctrine companion: OpenAI via `composeReasonFirstReply` only

## Strict doctrine continuation paths
- `tryDoctrineLivePathHandlers` before compose
- Fallback witness continuation in runtime if live handler missed
- `doctrineWitnessInventory` deterministic local answers

## Fallback paths
- Strict doctrine: `STRICT_DOCTRINE_FALLBACK_MESSAGE` (not AI service unavailable)
- Non-strict OpenAI failure: generic safe retrieval message
- `applyDoctrineErrorFirewall` on all outbound replies

## Memory recall
- `doctrineConversationState` activeDoctrineTopic / previousDoctrineTopic
- `buildDoctrineMemoryRecallReply` for remember / before that

## activeDoctrineTopic retention
- `setActiveDoctrineConversation` on every authority/witness answer
- `resolveActiveStrictTopic` prioritizes conversation state

## AI service unavailable exposure points (blocked)
- `coreResponseGuards.buildConnectionErrorReply` — non-strict only
- `routes/buddy.js normalizePayload` — generic fallback updated
- `doctrineErrorFirewall` — strips trouble reaching AI service

## Regression: 96/111