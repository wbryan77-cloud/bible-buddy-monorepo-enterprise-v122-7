# Phase 5A Bible Companion Orchestration Audit

**Date:** 2026-06-01  
**Status:** Phase 5A implementation complete — acceptance criteria met  
**Safe for controlled deploy:** **Yes** (with monitoring)

---

## Mission Alignment

| Requirement | Status |
|-------------|--------|
| Listen first | ✅ `companionStateEngine` listener mode |
| Natural language understanding | ✅ `bibleConceptGraph` + router |
| Remember safe corrections | ✅ `reflectionMemoryEngine` + `userCorrectionMemory` |
| Line-upon-line reasoning | ✅ `bibleReasoningEngine` + `bibleWideReasoningEngine` |
| Bible concepts Genesis–Revelation | ✅ Graph + concordance (curated set, expandable) |
| Verify doctrine with approved evidence | ✅ `strictDoctrineGate` + final authority engine |
| Warm companion answers | ✅ Companion lane + state engine |
| Avoid OpenAI doctrine drift | ✅ Orchestrator strict lane before OpenAI |
| Avoid evidence-folder lockup | ✅ No new evidence mutations |
| Avoid Render OOM | ✅ Bounded memory, health monitor, safe JSONL |

---

## Architecture

### Single Turn Owner
`services/bibleCompanionOrchestrator.js` — pipeline:

1. Receive user message  
2. Load conversation state (via router context)  
3. Load safe user correction memory (`reflectionMemoryEngine`)  
4. Classify companion state (`companionStateEngine`)  
5. Detect Bible concept (`bibleConceptGraph`)  
6. Detect strict doctrine topic (router + `doctrineTopicDetector`)  
7. Resolve pending question (`pendingQuestionResolver`)  
8. Create reasoning plan (`bibleReasoningEngine`)  
9. Call specialist (strict / bible-wide / companion / clarification)  
10. Verify output (`verifyOrchestratorOutput`, formatters)  
11. Format final answer (`directAnswerFormatter`)  
12. Update memory/state (`recordUserTurn`, reflection ingest)  
13. Return final response  

### Integration
`openAiFirstCompanionRuntime.js` calls `runBibleCompanionOrchestrator()` **first**. If `handled=true`, dispatches structured response. If not, existing OpenAI companion path runs. Phase 4 modules **not removed**.

---

## New Modules Created

| Module | File |
|--------|------|
| Bible Companion Orchestrator | `services/bibleCompanionOrchestrator.js` |
| Bible Reasoning Engine | `services/bibleReasoningEngine.js` |
| Bible Concept Graph | `services/bibleConceptGraph.js` |
| Reflection Memory Engine | `services/reflectionMemoryEngine.js` |
| Companion State Engine | `services/companionStateEngine.js` |
| Pending Question Resolver | `services/pendingQuestionResolver.js` |

**Data:** `data/reflection-memory.json` (bounded)

**Regression:** `scripts/runPhase5ABibleCompanionOrchestrationRegression.js`

---

## Modules Reused (Not Rebuilt)

| Module | Role in 5A |
|--------|------------|
| `companionDoctrineRouter.js` | Lane/intent planning (+ `before_that_recall` fix) |
| `strictDoctrineGate.js` | Strict doctrine specialist |
| `doctrineFinalAuthorityEngine.js` | Authority answers |
| `doctrineLivePathHandlers.js` | Memory recall, before-that, continuation |
| `bibleWideReasoningEngine.js` | Bible-wide specialist |
| `bibleConceptConcordance.js` | Base concepts for graph |
| `userCorrectionMemory.js` | Session answer prefs |
| `directAnswerFormatter.js` | Polarity + denial cleanup |
| `claimToScriptureValidator.js` | Claim validation |
| `doctrineConversationState.js` | Session state |
| `responseGuarantee.js` | Outer wrapper |
| `runtimeHealthMonitor.js` | Memory guard |
| `safeJsonlWriter.js` | Bounded logging |
| `approvedEvidenceGraph.js` | Retrieval support |

---

## Phase 5A Bug Fix (Post-Implementation)

**Issue:** "Before that?" after memory recall returned "Which Bible topic would you like me to continue?" (`companion_doctrine_release`) instead of Acts 10 recall.

**Root cause:** `before that` was in `DOCTRINE_CONTINUATION_PATTERNS` and triggered `immediateCompanionReply` bare-continuation path when active topic was cleared after memory recall.

**Fix:** New intent `before_that_recall` in `companionDoctrineRouter.js`; removed `before that` from generic continuation patterns; routes to `strict_doctrine` lane → `doctrineLivePathHandlers` before-that handler.

---

## Regression Results (2026-06-01)

| Suite | Result |
|-------|--------|
| Phase 5A orchestration | **11/11 PASS** |
| Phase 4O Bible-wide | **12/12 PASS** |
| Phase 4N clarity | **8/8 PASS** |
| Phase 4M companion routing | **15/15 PASS** |
| Phase 4H doctrine parity | **28/28 PASS** |

**Memory check (5A):** `memoryOk=true` — no unbounded JSONL, no full runtimeContext in reflection store.

---

## Corpus / Doctrine Safety

| Asset | Modified? |
|-------|-----------|
| Corpus files | **No** |
| Doctrine packs | **No** |
| Evidence cards | **No** |
| Witness chains | **No** |
| Phase 3 modules | **Not reopened** |

---

## Remaining Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Concept graph coverage gaps | Medium | Unknown phrase → clarification + learning candidate (test 10) |
| Synonym candidates need human review | Low | `pending_review` status in reflection memory |
| Legacy JSONL from `companionIntelligence` | Low | Migrate callers to `safeJsonlWriter` |
| OpenAI fallback still reachable | Medium | Monitor `openAiCalled` in production metrics |
| Graph vs concordance dual maintenance | Low | Graph extends concordance intentionally |
| Pending question after partial failures | Low | `recordPendingQuestion` on bible-wide/strict success paths |

---

## Deployment Recommendation

**Controlled deploy: YES**

Conditions:
1. Deploy with `runtimeHealthMonitor` endpoint active (`/api/runtime-health`)
2. Watch RSS after deploy — alert thresholds in env (`BIBLEBUDDY_MEMORY_WARN_MB`)
3. Sample `openAiCalled` rate — should drop on Bible Q&A turns
4. Run Phase 5A + 4H regression against staging URL before production
5. **Do not** enable new external Bible APIs in first deploy

Post-deploy smoke:
- "Can we eat pork?" → No + Lev 11:7, Deut 14:8
- "Love life is crashing." → warm companion, optional Psalm 34:18
- Acts 10 → strict, no OpenAI doctrine authorship
- "I had a bad day" after Acts 10 → companion, no Acts 10 repeat

---

## Acceptance Checklist

- [x] BibleReasoningEngine works
- [x] ReflectionMemoryEngine works
- [x] BibleConceptGraph works
- [x] CompanionStateEngine works
- [x] Old Phase 4 tests still pass
- [x] No corpus/evidence/doctrine mutation
- [x] No Render memory risk (bounded stores)
- [x] Safe for controlled deploy
