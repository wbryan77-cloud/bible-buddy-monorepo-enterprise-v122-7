# Runtime Conflict Audit — Sprint 2.FINAL

**Date:** 2026-06-01  
**Purpose:** Identify every module that can produce user-facing text, bypass polish, surface memory, inject study prompts, or override active conversation — before consolidation.

**Live path:** `POST /buddy/chat` → `routes/buddy.js` → `buddyBrain.runBuddy()` → `masterBuddyRuntime.runMasterBuddyRuntime()`

---

## Executive Summary

| Category | Count | Status after consolidation |
| --- | --- | --- |
| Active producers on live path | 14 | Routed through `masterBuddyRuntime` |
| Dormant / deprecated bypass paths | 2 | Not wired to live path |
| Secondary injectors (study/memory inside responders) | 8 | Gated by route ownership flags |
| Pre-intent doctrine intercept risk | 1 pipeline | `questionIntent` passed in; intercept skipped for history/correction |

**Root conflict:** Before Sprint 2.FINAL, `buddyBrain.runBuddy()` ran 15+ sequential `if` branches (health, grief, prayer, recall, study, sabbath, doctrine, registry, OpenAI, fallback) — each could enrich, surface memory, and inject study prompts independently. **After consolidation:** single orchestrator owns order; responders generate raw answer only when authorized.

---

## File-by-File Audit

Legend: **Active** = on live path | **Dormant** = exists but not wired to `/buddy/chat` | **Deprecated** = marked deprecated | **Helper** = no direct user text

| File | User text? | Bypass polish? | Memory? | Study prompts? | Override conversation? | Before intent? | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `routes/buddy.js` | No (pass-through) | No | No | No | No | No | **Active** — only calls `runBuddy` |
| `services/buddyBrain.js` | Yes (crisis fallback, helpers) | Was yes (legacy runBuddy) | Via finalize | Via finalize | Was yes | Was yes | **Active** — delegates to master; helpers exported |
| `services/masterBuddyRuntime.js` | Orchestrates | No — `polishFinalReply` gate | Gated | Gated | Controls priority | No — intent step 4 | **Active** — single controller |
| `services/routeOwnershipTable.js` | No | No | Defines rules | Defines rules | Defines rules | No | **Active** — ownership contract |
| `services/activeConversationManager.js` | No | No | No | Sets allowStudyPrompt | Yes — thread state | No | **Active** |
| `services/questionIntentResolver.js` | No | No | No | Sets suppress flags | Informs routing | No — runs before doctrine | **Active** |
| `services/sourceGroundedResponder.js` | Yes | Was yes | No | Was yes (study path text) | No | Was yes (keyword) | **Active** — owner for definitions via pipeline |
| `services/doctrineRuntimePipeline.js` | Routes | No | No | No | No | Was yes | **Active** — receives `questionIntent` |
| `services/doctrineGuard.js` | No | No | No | No | Can block intercept | No | **Active** — boundary only |
| `services/doctrineResponseRouter.js` | Routes | No | No | No | No | No | **Active** |
| `services/doctrineBoundaries.js` | No | No | No | No | No | No | **Active** — boundaries not answers |
| `services/companionDoctrinePresenter.js` | Yes (wraps doctrine) | Was yes | Yes (surface) | Yes (invitation) | No | No | **Active** — gated by `suppressMemory/Study` |
| `services/sabbathHistoryDeepResponder.js` | Yes | Was yes | No (explicit false) | No | No | No | **Active** — history owner |
| `services/sabbathHistoryCompanion.js` | Delegates | No | No | No | No | No | **Active** — thin delegate |
| `services/historicalContextRouter.js` | Yes (sections) | No | No | No | No | No | **Active** — used inside presenter/history |
| `services/healthCompanionResponse.js` | Yes | Was yes | Yes (same topic) | Yes (inline) | Can mis-route short msgs | Was yes (early branch) | **Active** — owner; study gated |
| `services/griefCompanionResponse.js` | Yes | Was yes | Yes (same topic) | Yes (inline) | Can mis-route short msgs | Was yes (early branch) | **Active** — owner; study gated |
| `services/prayerCompanionResponse.js` | Yes | Was yes | Yes | Yes (inline) | No | Was yes | **Active** — owner; study gated |
| `services/companionDiscernmentResponder.js` | Yes | Was yes | No | No | No | No | **Active** — discernment owner |
| `services/relationshipRecallEngine.js` | Yes (recall) | Was yes | Yes | No | Was yes | Was yes | **Active** — recall owner; recall beats follow-up |
| `services/companionRelationshipOrchestrator.js` | Yes (enrichment) | Was yes | Yes | Yes (journey) | **Yes — primary bleed source** | No | **Active** — skipped when `activeConversationLock` |
| `services/personalizedFallback.js` | Yes | Was yes | Yes | Yes (inline) | No | No | **Active** — open fallback owner |
| `services/continueStudyIntent.js` | Yes | Was yes | No | Yes | No | No | **Active** — continue_study owner |
| `services/continueStudyEngine.js` | Helper | No | No | No | No | No | **Helper** |
| `services/studyJourneyEngine.js` | Yes (journey text) | Yes | No | Yes | Yes | No | **Active** — only via enrichment; gated off lock |
| `services/registryStudyPresenter.js` | Yes | Was yes | No | Yes | No | No | **Active** — registry owner |
| `services/companionNextSteps.js` | Yes (suggestions) | Yes | No | **Yes — primary injector** | No | No | **Active** — gated in finalize + responders |
| `services/companionReplyPolish.js` | Transforms | No | No | No | No | No | **Active** — polish gate |
| `services/runtimeResponseSanitizer.js` | Transforms | No | No | No | No | No | **Active** — polish gate |
| `services/runtimeLabelStripper.js` | Transforms | No | No | No | No | No | **Active** — polish gate |
| `services/companionDeliveryLayer.js` | Transforms | No | No | No | No | No | **Active** — delivery trim |
| `services/runtimeQualityValidator.js` | No | No | No | No | No | No | **Helper** — scores only |
| `services/fallbackLoopSuppressor.js` | Transforms | No | No | No | No | No | **Active** — loop guard |
| `services/runtimeLoopGuard.js` | Transforms | No | No | No | No | No | **Active** |
| `services/structuredCompanionRuntime.js` | Yes | Yes | Yes | Yes | Yes | Yes | **Dormant** — deprecated, not in runBuddy |
| `services/autonomousCompanion.js` | Yes (plans) | Yes | Yes | Yes | Yes | Yes | **Dormant** — deprecated, not in runBuddy |

---

## Competing Systems Found (Pre-Consolidation)

### 1. Parallel routing in `buddyBrain.js` (REMOVED)
- Health classifier ran before Sabbath follow-up → knee pain hijacked Pope question
- Grief classifier captured short follow-ups
- Memory recall competed with active thread
- Doctrine intercept fired on keywords before intent

### 2. `companionRelationshipOrchestrator.enrichResponseWithRelationshipIntelligence` (GATED)
- Injected memory lines, study journey, reflection **after** answer
- Could override factual thread with unrelated memory
- **Fix:** `activeConversationLock` + route `allowedMemory: false`

### 3. Inline study prompts in responders (GATED)
- `healthCompanionResponse`, `griefCompanionResponse`, `prayerCompanionResponse`, `personalizedFallback` append `buildCompanionNextSteps` inside answer body
- **Fix:** `suppressStudyPrompts` flag from route ownership table

### 4. `fallbackReply` Sabbath bypass (REMOVED)
- Direct `buildSabbathHistoryResponse` call bypassed master routing
- **Fix:** remove inline history branch; master owns routing

### 5. `finalizeBuddyResponse` companion next steps (GATED)
- Added study suggestions post-enrichment
- **Fix:** skip when `activeConversationLock` or route disallows

### 6. Dormant systems (NOT WIRED — SAFE)
- `structuredCompanionRuntime.js` — used only by `runtimeButtonContinuityRouter.js`
- `autonomousCompanion.js` — used only by `distributedEcosystem.js`
- Neither connected to `POST /buddy/chat`

---

## Mandatory Runtime Order (Post-Consolidation)

Implemented in `masterBuddyRuntime.js`:

1. normalize input  
2. crisis/safety check  
3. load active conversation state  
4. resolve question intent (**before doctrine**)  
5. detect correction/frustration  
6. detect follow-up (cleared on topic switch / memory recall)  
7. determine route owner (`routeOwnershipTable`)  
8. apply doctrine boundaries (inside pipeline / sanitizer)  
9. generate direct answer (single owner)  
10. attach Scripture witness (within owner)  
11. attach historical context (owner: sabbath history only)  
12. apply memory relevance filter  
13. apply study prompt gate  
14. polish final response (`sanitizer → stripper → polish`)  
15. persist conversation, memory, active state  

---

## Remaining Risks After Audit

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Responders still embed study text before gate strips | Medium | `suppressStudyPrompts` passed to builders |
| OpenAI path less constrained than specialized owners | Low | Master prompt + polish gate |
| Dual active-conversation writes | Low | Consolidate in cleanup |
| `studyJourneyEngine` via enrichment when lock fails | Medium | Lock + route table `allowedMemory` |
| E4 "What did we study last?" routes to history | Low | Future: study_recall route key |

---

## Audit Conclusion

The live `/buddy/chat` path is consolidated under `masterBuddyRuntime`. Dormant systems are documented and not wired. Remaining injectors (memory, study) are gated by route ownership table and active conversation contract.

**Proceed to validation.**
