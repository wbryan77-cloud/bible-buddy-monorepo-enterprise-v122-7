# Phase 4M — Companion Orchestration Restore + Doctrine Release Gate Audit

**Date:** 2026-06-12  
**Scope:** Restore warm Bible-first companion lane; stop strict doctrine hijacking unrelated turns.  
**Constraints honored:** No corpus, doctrine packs, evidence cards, witness chains, or Phase 3 changes. No deploy, push, or commit.

---

## Root cause (confirmed)

Strict doctrine session state (`activeDoctrineTopic`) was treated as a **command** to keep answering doctrine on every subsequent turn, instead of **context** for explicit continuations only.

### Failure mechanisms

1. **`ensureStrictDoctrineOnPack`** forced `doctrineStrict.enabled` whenever `getActiveDoctrineTopic()` existed, even when the current message was emotional, stop, memory, or a new topic.
2. **`mustBlockOpenAi`** blocked OpenAI whenever any active doctrine topic existed — companion warmth could not run.
3. **Authority fallback** in `openAiFirstCompanionRuntime` re-ran `buildFinalAuthorityAnswer` for the stale active topic when the strict gate missed, repeating Acts 10 / dietary_law on unrelated turns.
4. **`doctrineLivePathHandlers`** ran memory/correction/continuation without checking whether the current turn belonged in the companion lane.
5. **`isSessionBoundStrictTurn`** / broad continuation patterns in `doctrineTopicDetector` treated bare `continue`, `can you remember`, etc. as strict-bound turns.
6. **`shouldRouteToCompanion`** returned true for `doctrine_continuation` when `activeDoctrineTopic` was cleared but `lastAnsweredTopic` still supported continuation — live handlers were skipped incorrectly.

### Live failure sequence explained

| Turn | User message | Old behavior | Intended lane |
|------|--------------|--------------|---------------|
| 1 | Acts 10 | Acts 10 doctrine | strict_doctrine |
| 2 | bad day | Repeat Acts 10 | companion (release) |
| 3–4 | not Peter / not listening | Repeat Acts 10 | companion (release) |
| 5 | eating pork | dietary_law | strict_doctrine |
| 6–10 | fornication / commandments / stop / memory | Repeat dietary | companion / Bible retrieval |

---

## Architecture implemented: two lanes, one router

**Router:** `services/companionDoctrineRouter.js`

| Export | Role |
|--------|------|
| `classifyCurrentTurnIntent` | stop, emotional, memory, strict direct, continuation, correction, new topic, companion |
| `shouldUseActiveDoctrineTopic` | Only explicit continuation phrases + continuation topic |
| `shouldReleaseDoctrineTopic` | Clear/suspend on stop, emotional, memory, new topic, companion detours |
| `shouldSwitchDoctrineTopic` | New strict topic in current message |
| `shouldRouteToCompanion` | Companion lane default unless strict direct or valid continuation |
| `buildCompanionReleaseReply` | Canned warm release (no old-topic repetition) |
| `buildCompanionLaneFallbackReply` | Scripture-grounded fallback when OpenAI unavailable |
| `planCompanionDoctrineRouting` | Single routing plan per turn |
| `applyDoctrineRoutingSideEffects` | Release active topic when plan requires |

**Routing order (current message wins):**

1. Classify intent  
2. Stop → clear + companion release  
3. Emotional → clear/suspend + companion  
4. Memory recall → companion memory (not doctrine repeat)  
5. New strict topic in message → switch + strict answer  
6. Explicit continuation + continuation topic → strict continuation  
7. Doctrine correction → strict handler  
8. Otherwise → companion / OpenAI  
9. Never default to previous `activeDoctrineTopic`

**State** (`doctrineConversationState.js`): `lastLane`, `lastStrictDoctrineTopic`, `releaseRequested`, `nonDoctrineTurnCount`, `doctrineSuspended`, `activeDoctrineUpdatedAt`, `lastAnsweredTopic`. Release on stop/emotional/memory/new topic; `releaseRequested` blocks stale continuation after explicit stop; memory recall clears active topic but allows one continuation turn via `lastAnsweredTopic` when `releaseRequested` is false.

---

## Files changed

| File | Change |
|------|--------|
| `services/companionDoctrineRouter.js` | **Created** — router, release replies, lane fallback |
| `services/strictDoctrineGate.js` | Router-driven strict lane; removed stale authority fallback |
| `services/doctrineConversationState.js` | Lane metadata, `recordUserTurn`, `releaseDoctrineTopic` |
| `services/doctrineLivePathHandlers.js` | Router gating; `before that` priority recall |
| `services/openAiFirstCompanionRuntime.js` | Plan routing early; companion release path; lane fallback |
| `services/doctrineFinalAuthorityEngine.js` | Warm openers for Acts 10 and dietary (no new conclusions) |
| `scripts/runPhase4MCompanionRoutingRegression.js` | **Created** — sequences A–D |

**Not modified:** corpus, doctrine packs, evidence cards, witness chains, Phase 3 artifacts.

---

## Regression results

| Suite | Result |
|-------|--------|
| Phase 4M companion routing (15 cases) | **15/15 PASS** |
| Phase 4H doctrine parity (28 cases) | **28/28 PASS** |

**Metrics (Phase 4M):** errors 0, timeouts 0, `memoryPressureLevel` normal; `strictDoctrineCalls` only on strict/continuation turns; companion emotional turns do not increment strict calls.

Reports: `Phase4MCompanionRoutingRegressionReport.md`, `docs/regression-trace/phase4m-companion-routing-results.json`

---

## Product verdict

| Question | Answer |
|----------|--------|
| Companion warmth restored? | **Yes** — emotional/stop/listening turns use warm canned or companion fallback; no Acts 10/dietary hijack |
| Strict doctrine still works? | **Yes** — Acts 10, dietary, death, witness continuation, correction, before-that recall |
| Safe for controlled deploy? | **Yes, with standard gate** — local regressions green; recommend controlled deploy + live smoke (same sequences as Phase 4M) before broad traffic |

---

## Deploy notes (no auto-deploy performed)

- No commit, push, or deploy was executed in this phase.
- After commit approval: stage runtime package per Phase 4K + claim bundle per Phase 4L; run Phase 4M + 4H on staging before production.
- Live smoke: run failure sequence A and B manually on `/buddy/chat` after deploy.
