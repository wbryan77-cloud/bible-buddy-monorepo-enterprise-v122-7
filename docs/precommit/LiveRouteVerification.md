# Pre-Commit Live Route Verification

**Generated:** 2026-05-31  
**Method:** Static trace of staged `buddyBrain.js` + HTTP acceptance runtime intents

---

## Route Chain

```
POST /buddy/chat
  server.js L95 → routes/buddy.js L21
    runBuddy({ userId, mode, personaKey, message })
      services/buddyBrain.js
```

**Evidence:** `routes/buddy.js` L33: `await runBuddy({ userId, mode, personaKey, message })`

---

## Module Reachability (staged code)

| Module | Import line | Execution | HTTP evidence |
|--------|-------------|-----------|---------------|
| **Memory recall** | relationshipRecallEngine L29 | L793 `classifyRelationshipRecallQuery` | TEST 7 → `memory_recall` |
| **Relationship memory** | relationshipMemoryBridge L24 | L427 `persistRelationshipMemoryFromInteraction` | TEST 2 recalls grief in knee reply |
| **Prayer continuity** | runtimePrayerContinuityEngine L14 | L406 `savePrayerContinuity` in persistBuddyMemory | TEST 6 → `prayer` |
| **Continue study** | continueStudyIntent L23 | L752 `classifyContinueStudyIntent` | TEST 9 → `continue_study` |
| **Study journey** | studyJourneyEngine (transitive) | via finalizeBuddyResponse / continue reply | TEST 9 journey phrase in reply |
| **Doctrine presenter** | companionDoctrinePresenter L11 | L972 `presentCompanionDoctrine` | TEST 4 → doctrinal_study |
| **Historical context** | historicalContextRouter (transitive) | sabbathHistoryCompanion + presenter | TEST 5 → `sabbath_history_companion` |
| **Companion reply polish** | companionReplyPolish L46 | L663 finalize; L428 presenter | No internal labels in TEST 4/5 |
| **Fallback suppression** | fallbackLoopSuppressor L21 | L348 `applyFallbackLoopGuard` | No "slow this down" in any test |

---

## Runtime Paths by Test Case

### Lost Friend → griefCompanionResponse
```
POST /buddy/chat → runBuddy()
  → classifyEmotionalSupport() [L877]
  → buildEmotionalSupportResponse() [L878]
  → finalizeBuddyResponse() [L887]
    → polishCompanionReply() [L663]
    → persistBuddyMemory()
      → relationshipMemoryBridge [L427]
  → intent: emotional_support
```

### Knee Pain → healthCompanionResponse
```
POST /buddy/chat → runBuddy()
  → classifyHealthCompanion() [L834]
  → buildHealthSupportResponse() [L835]
  → finalizeBuddyResponse()
    → relationshipMemoryBridge (health write)
  → intent: health_support
```

### Prayer → prayerCompanionResponse
```
POST /buddy/chat → runBuddy()
  → classifyPrayerIntent() [L856]
  → buildPrayerCompanionResponse() [L857]
  → finalizeBuddyResponse()
    → savePrayerContinuity() [L406]
  → intent: prayer
```

### Memory Recall → relationshipRecallEngine
```
POST /buddy/chat → runBuddy()
  → classifyRelationshipRecallQuery() [L793]
  → searchRelationshipRecall()
  → buildMemoryReadContext() [L451] (memoryRecallEngine on every request)
  → polishCompanionReply() [L808]
  → intent: memory_recall
```

### Sabbath Definition → presenter
```
POST /buddy/chat → runBuddy()
  → runDoctrineRuntimePipeline() [L934]
  → presentCompanionDoctrine() [L972]
    → routeHistoricalContext()
    → buildScriptureWitnessBlock()
    → saveStudySession()
    → polishCompanionReply()
  → intent: doctrinal_study
```

### Sabbath History → sabbathHistoryCompanion
```
POST /buddy/chat → runBuddy()
  → resolveSabbathCompanionIntent() [L899]
  → buildSabbathHistoryResponse() [L901]
    → routeHistoricalContext()
    → polishCompanionReply()
  → finalizeBuddyResponse()
  → intercept: sabbath_history_companion
```

### Continue Study → continueStudyIntent
```
POST /buddy/chat → runBuddy()
  → classifyContinueStudyIntent() [L752]
  → buildContinueStudyResponse() [L753]
    → buildContinueStudyOffer() (continueStudyEngine)
    → getRecentStudySessions()
  → finalizeBuddyResponse()
  → intent: continue_study
```

### Fallback path
```
POST /buddy/chat → runBuddy()
  → buildPersonalizedFallback() [when !openai]
  → applyFallbackLoopGuard() [L1092]
    → suppressFallbackLoops() [L352]
```

---

## Gaps (wiring, not missing modules)

| Path | Issue |
|------|-------|
| Doctrine intercept | Bypasses `finalizeBuddyResponse` — uses custom persist block L982+ |
| Memory recall | Early return without `finalizeBuddyResponse` |
| enrichRuntimeContextWithMemory | Runs every request — memoryRecallEngine L451 always loaded |

**All nine required modules are reachable from POST /buddy/chat in staged code.**
