# Sprint 2.13 — Study Journey Audit

**Date:** 2026-05-31

---

## Module Audit Summary

| Module | Exists | Imported in buddyBrain | Executed in runBuddy | Reachable via /buddy/chat | Saves progress | Restores progress | Survives restart |
|--------|--------|------------------------|----------------------|---------------------------|----------------|-------------------|------------------|
| **continueStudyEngine.js** | YES | NO (transitive) | YES via continueStudyIntent | YES | NO direct | YES reads sessions | YES (file) |
| **continueStudyIntent.js** | YES | YES L23 | YES L752–767 | YES | NO | YES | YES |
| **studyJourneyEngine.js** | YES | NO (transitive) | YES via orchestrator/fallback | YES | NO direct | YES reads sessions + learning | YES |
| **registryStudyPresenter.js** | YES | YES L26 | YES L1046+ | YES | YES via saveStudySession | YES | YES |
| **continuityStudySessionRuntime.js** | YES | NO (transitive) | YES on doctrine/registry | YES | YES `writeFileSync` | YES `readStore` | YES |
| **studyConnectionIntent.js** | YES | YES L42 | YES L769+ | YES | NO | YES reads sessions | YES |
| **companionNextSteps.js** | YES | YES L28 | YES in finalizeBuddyResponse | YES | NO | YES reads memory | YES |

---

## continueStudyEngine.js

- **File:** `services/continueStudyEngine.js`
- **Import path:** `continueStudyIntent.js`, `companionDoctrinePresenter.js`, `personalizedFallback.js`, `studyConnectionIntent.js`
- **Runtime path:** `classifyContinueStudyIntent` → `buildContinueStudyResponse` → `buildContinueStudyOffer`
- **Route:** `POST /buddy/chat` → continue intercept (before doctrine)
- **Progress storage:** Reads `data/continuity-study-sessions.json` via `getRecentStudySessions`
- **Does not write** sessions itself — writes happen in presenter/registry
- **Restart:** Sync file read on each request ✓

**Gap:** Repeated `"Continue."` without intermediate study may offer the **same** next verse (Acts 13 → Hebrews 4:9) because session is not advanced until user studies that step.

---

## continueStudyIntent.js

- **Patterns:** explicit (`continue our study`) + short (`Continue.`, `Go on.`, `Next.`, `Keep going.`, `Tell me more.`, `What next.`)
- **Requires:** `userId` + prior study session OR learning favorite topic for short patterns
- **HTTP verified:** TEST 9, 11, 12, 13, 14 passed

---

## studyJourneyEngine.js

- **Journeys defined:** sabbath→feast→kingdom→resurrection→NJ, messiah path, kingdom forward, covenant path
- **Runtime path:** `getStudyJourneyContext` called from `companionRelationshipOrchestrator`, `personalizedFallback`, `studyConnectionIntent`
- **Reachable:** YES — appended to continue/fallback/study-connection replies
- **HTTP evidence:** TEST 9 reply includes *"study journey through Sabbath, Feast Days, Kingdom"*

---

## registryStudyPresenter.js

- **Topics:** kingdom, covenant, messiah, death_resurrection, heaven_heavens, captivity, remnant
- **Runtime:** After doctrine intercept fails, before OpenAI
- **Calls:** `buildScriptureWitnessBlock`, `routeHistoricalContext`, `saveStudySession`, `polishCompanionReply`
- **HTTP verified:** TEST 8 Kingdom — Isaiah 2, Micah 4, 2 Samuel 7 witness path

---

## continuityStudySessionRuntime.js

- **Storage:** `data/continuity-study-sessions.json`
- **Write:** `saveStudySession` — topic, references, studyStep, studyProgress, userQuestion, timestamp
- **Capacity:** 250 sessions per user (slice)
- **Write triggers:** `companionDoctrinePresenter` L386, `registryStudyPresenter` L133
- **Read triggers:** continueStudyEngine, studyJourneyEngine, memoryRecallEngine, continueStudyIntent

---

## studyConnectionIntent.js

- **Patterns:** "What connects to this study?", "What should I study next?"
- **Runtime:** Intercept #3 in runBuddy
- **HTTP verified:** TEST 15 — study_connection intent, Kingdom → Messiah connection

---

## companionNextSteps.js

- **Runtime:** `finalizeBuddyResponse` L674 (not doctrine early-return path)
- **Reachable:** health, prayer, grief, continue, registry, sabbath history, OpenAI/fallback paths
- **Not reachable:** doctrine intercept (custom return), memory recall (early return)

---

## Universal Study Journey Contract (Part 2)

| Contract element | Implemented | Where | Reachable |
|------------------|-------------|-------|-----------|
| Reflection opening | YES | companionDoctrinePresenter OPENINGS, registryStudyPresenter | Doctrine + registry |
| Scripture witness 2–5 | YES | scriptureWitnessEngine | Doctrine + registry |
| Direct answer first | PARTIAL | registry yes; doctrine uses witness blocks | YES |
| Continuity path G→R | YES | genesisToRevelationContinuityRegistry + continueStudyEngine | YES |
| Continue study prompt | YES | buildContinueStudyOffer | YES |
| Next step verse | YES | continueStudyEngine chain | YES |
| Save progress | YES | saveStudySession | Doctrine + registry only |

**Gap:** Non-doctrine companion turns (job opportunity, generic chat) do not save study progress.

---

## Wiring Gaps (no duplicate systems needed)

1. **Doctrine intercept bypasses `finalizeBuddyResponse`** — companionNextSteps may be missing on pure doctrine turns (presenter includes continue offer internally ✓)
2. **Memory recall bypasses finalize** — no study journey surface on recall replies
3. **Continue does not auto-advance studyStep** on repeated continue — **EXISTS, needs step-advance repair** (not new system)
