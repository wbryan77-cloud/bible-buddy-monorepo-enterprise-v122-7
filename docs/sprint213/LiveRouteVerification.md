# Sprint 2.13 — Live Route Verification

**Date:** 2026-05-31  
**Scope:** Every Sprint 2 feature vs `POST /buddy/chat` reachability  
**Method:** Static trace of `server.js` → `routes/buddy.js` → `services/buddyBrain.js` + HTTP acceptance run

---

## Canonical Live Route

```
Browser (public/index.html)
  → POST /buddy/chat
    → server.js L95 mountRoute('/buddy', './routes/buddy')
      → routes/buddy.js L21 router.post('/chat')
        → runBuddy() in services/buddyBrain.js
```

**Alternate buddy endpoints (same orchestrator):**
- `POST /buddy/stream` → same `runBuddy()` (SSE wrapper)

**Not the live companion route:**
- `public/chat.html` → `POST /api/ai/chat` (**route does not exist — 404**)
- `public/lab.html` / `lab.js` → `POST /api/ai/tester-chat` (raw OpenAI, **not** `runBuddy`)
- `services/runtimeButtonContinuityRouter.js` → `structuredCompanionRuntime` (**not wired to /buddy/chat**)

---

## Feature Reachability Matrix

| Feature | File | Import path | Runtime path in runBuddy | Route reachable via /buddy/chat | Status |
|---------|------|-------------|---------------------------|----------------------------------|--------|
| **Core orchestrator** | `services/buddyBrain.js` | `routes/buddy.js` L2 | All requests | YES | **ACTIVE** |
| **Crisis safety** | `buddyBrain.js` `classifySafety` | inline | L741–749 | YES | **ACTIVE** |
| **Continue study** | `continueStudyIntent.js` | buddyBrain L23 | L752–767 | YES | **ACTIVE** |
| **Continue study engine** | `continueStudyEngine.js` | via continueStudyIntent | transitive on continue path | YES | **ACTIVE** |
| **Study connection** | `studyConnectionIntent.js` | buddyBrain L42–45 | L769–791 | YES | **ACTIVE** |
| **Memory recall** | `relationshipRecallEngine.js` | buddyBrain L29–32 | L793–832 | YES | **ACTIVE** |
| **Memory read context** | `memoryRecallEngine.js` | buddyBrain L17–20 | L451 every request | YES | **ACTIVE** |
| **Health companion** | `healthCompanionResponse.js` | buddyBrain L40 | L834–854 | YES | **ACTIVE** |
| **Prayer companion** | `prayerCompanionResponse.js` | buddyBrain L41 | L856–875 | YES | **ACTIVE** |
| **Grief / emotional** | `griefCompanionResponse.js` | buddyBrain L25 | L877–897 | YES | **ACTIVE** |
| **Sabbath history intent** | `sabbathIntentRouter.js` | buddyBrain L47 | L899 | YES | **ACTIVE (local)** |
| **Sabbath history response** | `sabbathHistoryCompanion.js` | buddyBrain L48 | L901–932 | YES | **ACTIVE (local)** |
| **Doctrine intercept** | `doctrineRuntimePipeline.js` | buddyBrain L9 | L934+ | YES | **ACTIVE** |
| **Source grounded body** | `sourceGroundedResponder.js` | via doctrineResponseRouter | doctrine path | YES | **ACTIVE** |
| **Companion doctrine presenter** | `companionDoctrinePresenter.js` | buddyBrain L11 | L972 `presentCompanionDoctrine` | YES | **ACTIVE (local)** |
| **Historical context router** | `historicalContextRouter.js` | via presenter / sabbathHistory | doctrine + history paths | YES | **ACTIVE (local)** |
| **Scripture witness** | `scriptureWitnessEngine.js` | via presenter | doctrine path | YES | **ACTIVE (local)** |
| **Registry study** | `registryStudyPresenter.js` | buddyBrain L26 | L1046–1081 | YES | **ACTIVE (local)** |
| **Study journey** | `studyJourneyEngine.js` | via companionRelationshipOrchestrator | finalizeBuddyResponse / fallback | YES | **ACTIVE (local)** |
| **Companion next steps** | `companionNextSteps.js` | buddyBrain L28 | finalizeBuddyResponse L674 | YES | **ACTIVE (local)** |
| **Personalized fallback** | `personalizedFallback.js` | buddyBrain L27 | `!openai` path L1083+ | YES | **ACTIVE (local)** |
| **Fallback loop suppressor** | `fallbackLoopSuppressor.js` | buddyBrain L21 | `applyFallbackLoopGuard` | YES | **ACTIVE (local)** |
| **Companion reply polish** | `companionReplyPolish.js` | buddyBrain L46 | finalize + doctrine + recall | YES | **ACTIVE (local)** |
| **Runtime label stripper** | `runtimeLabelStripper.js` | via polish/sanitizer | all polished paths | YES | **ACTIVE (local)** |
| **Relationship memory bridge** | `relationshipMemoryBridge.js` | buddyBrain L24 | `persistBuddyMemory` | YES | **ACTIVE (local)** |
| **Prayer continuity** | `runtimePrayerContinuityEngine.js` | buddyBrain L14 | persistBuddyMemory | YES | **ACTIVE (local)** |
| **Continuity memory** | `continuityMemoryRuntime.js` | buddyBrain L13 | persistBuddyMemory | YES | **ACTIVE (local)** |
| **Study session save** | `continuityStudySessionRuntime.js` | via presenter/registry | doctrine + registry paths | YES | **ACTIVE (local)** |
| **Conversation state** | `runtimeConversationStateEngine.js` | buddyBrain L12 | persistBuddyMemory | YES | **ACTIVE (local)** |
| **Learning profile** | `companionLearningLayer.js` | buddyBrain L16 | persistBuddyMemory | YES | **ACTIVE (local)** |
| **Milestone tracking** | `milestoneTracking.js` | via companionRelationshipOrchestrator | relationship enrich | YES | **ACTIVE (local)** |
| **Open loops** | `openLoopsEngine.js` | via personalizedFallback | fallback path | PARTIAL | **REACHABLE on fallback only** |
| **Structured companion runtime** | `structuredCompanionRuntime.js` | runtimeButtonContinuityRouter only | NOT in runBuddy | NO | **EXISTS BUT NOT REACHABLE** |
| **Autonomous companion** | `autonomousCompanion.js` | distributedEcosystem only | NOT in runBuddy | NO | **EXISTS BUT NOT REACHABLE** |
| **Admin tester chat** | `admin/ai/routes.js` | `/api/ai` mount | callBibleBuddy OpenAI | NO (different route) | **EXISTS BUT NOT REACHABLE from /buddy/chat** |
| **OpenAI default path** | `openaiClient.js` | buddyBrain | when OpenAI configured | YES | **ACTIVE** |

**Note:** `(local)` = present in working tree. **Not in git HEAD `e572e40`** — see Deployment section.

---

## runBuddy() Intercept Order (actual)

1. Empty message → `fallbackReply`
2. Crisis → `fallbackReply`
3. Continue study → `buildContinueStudyResponse` → `finalizeBuddyResponse`
4. Study connection → `buildStudyConnectionResponse` → `finalizeBuddyResponse`
5. Memory recall → `buildMemoryRecallStructured` (early return, no finalize)
6. Health → `buildHealthSupportResponse` → finalize
7. Prayer → `buildPrayerCompanionResponse` → finalize
8. Grief/emotional → `buildEmotionalSupportResponse` → finalize
9. Sabbath history/correction → `buildSabbathHistoryResponse` → finalize
10. Doctrine → `presentCompanionDoctrine` (early return, custom persist)
11. Registry study → `presentRegistryStudyResponse` → finalize
12. No OpenAI → `buildPersonalizedFallback` → loop guard
13. OpenAI → JSON parse → loop guard → enrich

---

## Per-Question Answers

| # | Question | Answer |
|---|----------|--------|
| 1 | Live route | `POST /buddy/chat` |
| 2 | Handler file | `routes/buddy.js` |
| 3 | Calls runBuddy()? | **Yes** L33 |
| 4 | Calls presentCompanionDoctrine()? | **Indirectly** via runBuddy doctrine intercept (not in route file) |
| 5 | Calls historicalContextRouter()? | **Indirectly** via presenter / sabbathHistoryCompanion |
| 6 | Calls companionReplyPolish()? | **Indirectly** via finalizeBuddyResponse / presenter |
| 7 | Calls fallbackLoopSuppressor()? | **Indirectly** via applyFallbackLoopGuard |
| 8 | Frontend same route? | **index.html YES**; chat.html NO (`/api/ai/chat` broken) |
| 9 | Multiple buddy routes? | `/buddy/chat`, `/buddy/stream` (+ non-buddy tester-chat) |
| 10 | Multiple pipelines? | **Yes** — runBuddy vs admin OpenAI vs deprecated structuredCompanion |
| 11 | sourceGroundedResponder bypasses presenter? | **On production HEAD: YES.** Local: NO (presenter wraps it) |
| 12 | Tests use helpers not route? | **Most historical tests: YES.** Sprint 2.13 HTTP suite: **NO** |
| 13 | Production ≠ local? | **YES** — git HEAD lacks Sprint 2 modules |

---

## Deployment Gap (critical)

| Item | Value |
|------|-------|
| Git HEAD | `e572e40` — doctrine intercept only |
| Tracked Sprint 2 presenter modules | **0** (`companionDoctrinePresenter.js` not in git) |
| Modified/untracked service files | **59** |
| Render | `autoDeploy: true` from git — **production runs HEAD, not working tree** |

**Production `/buddy/chat` today:** `runBuddy()` → raw `sourceGroundedResponder` → no presenter, no history intercept, no grief/health/prayer intercepts, hardcoded slow-down fallback.

---

## HTTP Verification

Executed: `node scripts/sprint213AcceptanceHttp.js`  
Route: native HTTP server, `POST /buddy/chat`, handler mirrors `routes/buddy.js`  
Result: **15/15 acceptance tests passed** on local working tree.

Raw results: `docs/sprint213/acceptance-results.json`
