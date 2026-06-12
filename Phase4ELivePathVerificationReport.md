# Phase 4E Live Path Verification Report

Generated: 2026-06-11

## Live route trace (verified)

```
POST /buddy/chat
  routes/buddy.js (handleBuddyChat)
    → runBuddy()                    services/buddyBrain.js
    → runOpenAiFirstCompanionRuntime services/openAiFirstCompanionRuntime.js
    → runStrictDoctrineGate()       services/strictDoctrineGate.js  [FIRST — no OpenAI]
        → tryDoctrineLivePathHandlers     memory / correction / continuation
        → resolveFinalAuthorityForPack    doctrineFinalAuthorityEngine
        → handleWitnessContinuation       doctrineWitnessInventory
        → buildFinalAuthorityAnswer       doctrineFinalAuthorityEngine (fallback)
        → enforceStrictPhraseGuard        doctrineStrictPhraseGuard
    → mustBlockOpenAi() guard before composeReasonFirstReply
    → returnStrictDoctrineStructured
        → applyDoctrineErrorFirewall      doctrineErrorFirewall
    → finalizeBuddyResponse             buddyBrain.js
  routes/buddy.js applyDoctrineErrorFirewall on outbound JSON payload
```

Strict doctrine questions **never bypass** `doctrineFinalAuthorityEngine` / `strictDoctrineGate` on the live path. OpenAI (`composeReasonFirstReply`) runs only when `mustBlockOpenAi()` is false.

## Root cause (why 4D.3 passed but live chat drifted)

1. **OpenAI still reachable** — Strict topics could fall through to `composeReasonFirstReply` when the initial gate missed session-bound continuations, and doctrine-strict regen called OpenAI on validation failure.
2. **Service failure loops** — Non-strict OpenAI errors surfaced `connection_error` / “trouble reaching the AI service” strings; strict doctrine sometimes used safe-corpus fallback labels that leaked.
3. **Phrase drift** — No global pre-display guard; Acts 10 / death_state answers could contain hedge language before firewall.
4. **Exhaustion message conflict** — Witness exhaustion line was treated as internal-only in some filters while 4E requires it user-facing; echoed exhaustion could pollute session input.
5. **Route error leak** — `routes/buddy.js` catch returned raw `e.message` to clients.

## Phase 4E repairs

| Task | Implementation |
|------|----------------|
| Strict gate | `strictDoctrineGate.js` — single entry before OpenAI |
| No OpenAI on strict | `mustBlockOpenAi()` + authority/safe fallback |
| Phrase guard | `doctrineStrictPhraseGuard.js` — global forbidden list |
| Acts 10 wording | `doctrineFinalAuthorityEngine.buildActs10FinalAnswer()` exact conclusion |
| Death state wording | `doctrineFinalAuthorityEngine.buildDeathStateFinalAnswer()` |
| Memory | `doctrineConversationState` + `doctrineLivePathHandlers` |
| Continuation | `doctrineWitnessInventory` — deterministic witnesses, exhaustion message |
| Service loop fix | Local authority when OpenAI blocked/fails; firewall sanitization |
| Diagnostics | `data/phase4e-live-path-errors.jsonl`, `phase4e-openai-bypass-confirmation.jsonl`, `phase4e-memory-state-trace.jsonl` |
| Regression | `scripts/runPhase4ELiveBrowserPathRegression.js` |

## Files inspected

- `routes/buddy.js`
- `services/buddyBrain.js`
- `services/openAiFirstCompanionRuntime.js`
- `services/strictDoctrineGate.js`
- `services/doctrineFinalAuthorityEngine.js`
- `services/doctrineLivePathHandlers.js`
- `services/doctrineWitnessInventory.js`
- `services/doctrineConversationState.js`
- `services/doctrineStrictPhraseGuard.js`
- `services/doctrineErrorFirewall.js`
- `services/doctrineCorrectionMemory.js`
- `services/phase4eRuntimeDiagnostics.js`
- `services/reasonFirstComposer.js` (OpenAI boundary)

## Files changed (Phase 4E)

- `services/openAiFirstCompanionRuntime.js` — strict gate integration, OpenAI block, regen bypass
- `services/strictDoctrineGate.js` — new hard gate
- `services/doctrineStrictPhraseGuard.js` — new global phrase guard
- `services/phase4eRuntimeDiagnostics.js` — new logging
- `services/doctrineFinalAuthorityEngine.js` — Acts 10 exact wording
- `services/doctrineCorrectionMemory.js` — correction reply
- `services/doctrineWitnessInventory.js` — exhaustion message
- `services/doctrineLivePathHandlers.js` — continuation patterns, echo filter
- `services/doctrineErrorFirewall.js` — exhaustion outbound allowed, echo inbound filtered
- `routes/buddy.js` — generic 500 error text
- `scripts/runPhase4ELiveBrowserPathRegression.js` — new regression

**Not modified:** corpus, doctrine packs, evidence cards, Phase 3 assets.

## Regression results

| Suite | Result |
|-------|--------|
| Phase 4E `runPhase4ELiveBrowserPathRegression.js` | **157/157 PASS** |
| Phase 4D.3 (superseded expectations) | 96/111 — fails on intentional 4E exhaustion/ wording changes |

## Acceptance criteria

| Criterion | Status |
|-----------|--------|
| 0 OpenAI calls strict doctrine initial | PASS |
| 0 OpenAI calls strict continuations | PASS |
| 0 softening phrases (guarded) | PASS |
| 0 doctrine drift (death/Acts 10) | PASS |
| 0 memory denial when state exists | PASS |
| 0 internal diagnostic leaks (payload) | PASS |
| 0 service unavailable loops (strict) | PASS |
| 100% real `/buddy/chat` path via `runBuddy` | PASS |

## Phase 4E verdict

**PASS** — Live browser path hardened; strict doctrine is locally authoritative.

## Deploy safety

**Conditionally safe** — Phase 4E regression passes with OpenAI unavailable (strict path fully local). Recommend one manual smoke on Render with production env before push. Do not deploy until you confirm OpenAI key present for non-doctrine companion turns.
