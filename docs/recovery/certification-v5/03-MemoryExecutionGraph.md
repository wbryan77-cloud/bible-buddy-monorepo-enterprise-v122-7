# 03 — Memory Execution Graph

```
USER MESSAGE
 → routes/buddy.js
 → buddyBrain.runBuddy
 → openAiFirstCompanionRuntime
    → [NEW] resurrection_timeline intercept (sourceGroundedResponder)  [v5]
    → bibleCompanionOrchestrator
         → responseRevisionOwner / correction owner
         → conversation_owner continuation (short follow-ups)
         → phase5O block (unreachable after owner return — dead duplicate)
         → phase5K / doctrine / bible_wide / …
    → OpenAI compose (if not handled)
 → finalizeBuddyResponse
    → liveResponseOwner
    → saveContinuationMemory (doctrine-conversation-state.json)
    → buddy-memory / sessions / active-conversation / continuity
```

Continuation payload: `lastUserMessage`, `lastReply`, `lastScripture`, `lastHumanNeed`, `lastRoute`.
