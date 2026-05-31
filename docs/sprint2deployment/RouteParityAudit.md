# Sprint 2.DEPLOYMENT — Route Parity Audit

**Generated:** 2026-05-31

---

## Production Route Chain (after Sprint 2 deploy)

```
POST /buddy/chat
  └─ server.js: mountRoute('/buddy', './routes/buddy')
       └─ routes/buddy.js: router.post('/chat')
            └─ runBuddy({ userId, mode, personaKey, message })
                 └─ services/buddyBrain.js
```

**Verified:** Production route uses `runBuddy()` — confirmed in committed `routes/buddy.js` L33. Sprint 2.DEPLOYMENT updates **what runBuddy does**, not the route mount.

---

## Module Reachability (post-deploy runBuddy intercept order)

| Module | Import | Execution point | Reachable from /buddy/chat |
|--------|--------|-----------------|----------------------------|
| **memoryRecallEngine** | buddyBrain L17 | `enrichRuntimeContextWithMemory` L451; recall uses relationshipRecallEngine | ✅ every request |
| **relationshipMemoryBridge** | buddyBrain L24 | `persistBuddyMemory` L404 | ✅ memory-enabled turns |
| **prayer continuity** | runtimePrayerContinuityEngine L14 | `savePrayerContinuity` in persistBuddyMemory | ✅ prayer + persist paths |
| **continueStudy** | continueStudyIntent L23 | intercept L752 `classifyContinueStudyIntent` | ✅ "Continue." etc. |
| **study journey** | studyJourneyEngine (transitive) | companionRelationshipOrchestrator, personalizedFallback | ✅ continue/fallback paths |
| **companionDoctrinePresenter** | buddyBrain L11 | doctrine intercept L972 `presentCompanionDoctrine` | ✅ doctrine topics |
| **historicalContextRouter** | via presenter/sabbathHistory | presenter L265; sabbathHistoryCompanion | ✅ doctrine + history |
| **companionReplyPolish** | buddyBrain L46 | finalizeBuddyResponse L617; presenter L428 | ✅ most paths |
| **fallbackLoopSuppressor** | buddyBrain L21 | `applyFallbackLoopGuard` L352 | ✅ fallback/OpenAI paths |

---

## Exact Route Chain by User Message Type

### "What is the Sabbath?"

```
POST /buddy/chat
  → runBuddy()
    → runDoctrineRuntimePipeline()
      → sourceGroundedResponder.sabbathReply()
    → presentCompanionDoctrine()          ← Sprint 2
      → routeHistoricalContext()          ← secondary append
      → buildScriptureWitnessBlock()
      → saveStudySession()
      → polishCompanionReply()
  → JSON { ok: true, reply: {...} }
```

### "Who changed the Sabbath and why?"

```
POST /buddy/chat
  → runBuddy()
    → resolveSabbathCompanionIntent()     ← Sprint 2
    → buildSabbathHistoryResponse()     ← Sprint 2
      → routeHistoricalContext()
      → polishCompanionReply()
    → finalizeBuddyResponse()
  → JSON response
```

### "Please pray for me."

```
POST /buddy/chat
  → runBuddy()
    → classifyPrayerIntent()
    → buildPrayerCompanionResponse()
    → finalizeBuddyResponse()
      → persistBuddyMemory()
        → savePrayerContinuity()          ← prayer continuity
        → relationshipMemoryBridge
    → polishCompanionReply()
```

### "Continue."

```
POST /buddy/chat
  → runBuddy()
    → classifyContinueStudyIntent()
    → buildContinueStudyResponse()
      → buildContinueStudyOffer()         ← continueStudyEngine
      → getRecentStudySessions()          ← continuityStudySessionRuntime
    → finalizeBuddyResponse()
      → getStudyJourneyContext()          ← studyJourneyEngine
```

### "What were we talking about last week?"

```
POST /buddy/chat
  → runBuddy()
    → classifyRelationshipRecallQuery()
    → searchRelationshipRecall()
      → memoryRecallEngine (read context)
      → relationshipMemoryBridge (stored items)
    → polishCompanionReply()
```

---

## Pre-Deploy (e572e40) vs Post-Deploy

| Module | e572e40 production | Post Sprint 2.DEPLOY commit |
|--------|-------------------|----------------------------|
| runBuddy | ✅ | ✅ |
| memoryRecallEngine | ❌ not imported | ✅ |
| relationshipMemoryBridge | ❌ | ✅ |
| prayer continuity write | partial | ✅ |
| continueStudy | ❌ | ✅ |
| study journey | ❌ | ✅ |
| companionDoctrinePresenter | ❌ | ✅ |
| historicalContextRouter | ❌ | ✅ |
| companionReplyPolish | ❌ | ✅ |
| fallbackLoopSuppressor | ❌ | ✅ |

---

## Alternate Routes (not production companion)

| Route | Pipeline | Parity |
|-------|----------|--------|
| POST /buddy/stream | Same runBuddy | ✅ |
| POST /api/ai/tester-chat | Raw OpenAI | ❌ not Sprint 2 |
| public/chat.html (pre-fix) | /api/ai/chat 404 | ❌ repaired → /buddy/chat |
