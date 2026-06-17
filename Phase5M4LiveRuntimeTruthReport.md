# Phase 5M.4 — Live Runtime Truth Report

**Date:** 2026-06-17  
**Status:** Complete (not committed)

## Root cause

The live `/buddy/chat` path was running the orchestrator correctly, but **companion human needs could still be stolen by strict doctrine or bible_wide dispatch**, and **late-stage polish/contract layers could leave forbidden phrases or wrong polarity** in the final reply.

Evidence from `[LIVE_TRUTH_ORCHESTRATOR]` traces:

- Pork doctrine correctly routed `dispatch: strict` with good taste/permission drafts from doctrine authority.
- App identity, prayer, and practical family guidance already routed `dispatch: companion` when orchestrator `runPhase5KDepthLane` fired.
- Browser-visible failures matched **post-orchestrator overwrite** (clarification loops, verse-list prayer template, taste→Yes polarity) rather than a dead orchestrator.

**Primary fix:** hard-protect companion intents before strict/bible_wide return handlers, plus absolute forbidden-final repair in `singleCompanionContract` + `liveResponseOwner`, plus taste/sensory distinction in `directAnswerFormatter`.

## Exact live path (verified)

```
POST /buddy/chat
  → routes/buddy.js (withBuddyChatGuarantee)
  → runBuddy() (buddyBrain.js)
  → runOpenAiFirstCompanionRuntime (openAiFirstCompanionRuntime.js)
  → runBibleCompanionOrchestrator()
  → [LIVE_TRUTH_ORCHESTRATOR] trace
  → protected companion reroute (if needed)
  → returnStrictDoctrineStructured | returnBibleWideStructured | returnCompanionLaneStructured
  → [LIVE_TRUTH_RETURN] trace + runtime.liveTruthTrace
  → finalizeBuddyResponse (buddyBrain.js)
  → finalizeLiveResponse (liveResponseOwner.js)
  → enforceSingleCompanionContract + repairAbsoluteForbiddenFinal (singleCompanionContract.js)
  → HTTP response
```

## What was disproven

| Hypothesis | Result |
|------------|--------|
| Orchestrator not wired on live path | **Disproven** — traces show `orchestratorHandled: true` on every turn |
| `humanNeedDetector` broken | **Disproven** — companion turns show correct `orchestratorHumanNeed` |
| Wrong deployed code only (no local repro) | **Disproven** — real HTTP POST regression passes 8/8 locally |
| New architecture required | **Disproven** — fixes are instrumentation, reroute guard, and final contract repair only |

## What was fixed

1. **Live truth instrumentation** — `[LIVE_TRUTH_ORCHESTRATOR]`, `[LIVE_TRUTH_RETURN]`, `runtime.liveTruthTrace` on every return path.
2. **Protected companion intent reroute** — `app_identity`, `prayer`, `practical_words_to_say`, emotional/anxiety, etc. cannot stay on strict/bible_wide dispatch.
3. **Taste vs permission** — sensory questions no longer get "Yes — staying with Scripture"; distinction answer with Leviticus 11 / Deuteronomy 14.
4. **Pork permission template** — concise "No. Staying with Scripture, pork is unclean…" Acts 10:28 wording; no duplicate remain/are unclean pair in contract repair.
5. **Absolute forbidden final blocklist** — `[LIVE_TRUTH_FORBIDDEN_FINAL]` repairs clarification, cast-care prayer template, wrong pork Yes, lowercase "No. staying".
6. **Real HTTP regression** — `scripts/runPhase5M4LiveTruthRegression.js` (8 cases, POST `/buddy/chat`).
7. **Deploy truth check** — `scripts/runPhase5M4DeployTruthCheck.js`.

## Files changed

| File | Change |
|------|--------|
| `services/openAiFirstCompanionRuntime.js` | Live truth traces, protected reroute, return-path logging |
| `services/singleCompanionContract.js` | Forbidden final blocklist, `repairAbsoluteForbiddenFinal`, pork/correction replies |
| `services/liveResponseOwner.js` | Second-pass absolute forbidden repair |
| `services/directAnswerFormatter.js` | Taste/sensory detection (prior session) |
| `scripts/runPhase5M4LiveTruthRegression.js` | New HTTP regression |
| `scripts/runPhase5M4DeployTruthCheck.js` | New deploy parity gate |
| `scripts/runPhase5M3OldPhraseQuarantineRegression.js` | Taste wording alignment |
| `scripts/runPhase5M1KnownWorkingPathRegression.js` | Good-meat expectation alignment |

## Test results

| Suite | Result |
|-------|--------|
| `runPhase5M4LiveTruthRegression.js` | **8/8 PASS** |
| `runPhase5M4DeployTruthCheck.js` | **PASS** |
| `runPhase5M3OldPhraseQuarantineRegression.js` | **11/11 PASS** |
| `runPhase5M1KnownWorkingPathRegression.js` | **8/8 PASS** |
| `runPhase4HDoctrineParityRegression.js` | **28/28 PASS** |

## Remaining risks

1. **Correction turns** (`Why are you saying yes?`) may still hit `orchestratorHandled: false` and briefly draft a generic fallback before contract `correction_ack` repair — final reply is correct but adds latency.
2. **Pork permission cosmetic stacking** — doctrine authority draft + contract pork repair can still produce redundant "with Scripture, According to Scripture" in strict-lane previews (final contract reply is correct).
3. **`humanNeed` null on strict doctrine turns** — protected reroute only fires when orchestrator ctx carries humanNeed; doctrine-only turns correctly stay strict.

## Safe for controlled alpha deploy?

**Yes** — with monitoring of `[LIVE_TRUTH_ORCHESTRATOR]` / `[LIVE_TRUTH_RETURN]` logs and the 5M.4 HTTP regression in pre-deploy checks.

No new engines, no doctrine/evidence/corpus mutation, no workflow or data file changes.
