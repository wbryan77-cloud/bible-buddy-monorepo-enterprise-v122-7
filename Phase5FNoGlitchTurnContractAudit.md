# Phase 5F — No-Glitch Turn Contract Audit

**Date:** 2026-06-14

## Root Cause (post-stop glitch)

After `stop`, state correctly cleared (`releaseRequested`, no active concept). Bare `"show me another verse"` fell through to OpenAI/retrieval paths because:

1. No turn contract blocked retrieval before routing.
2. Low-confidence word-sense matched `"verse"` → `sabbath_how_to_keep`, misclassifying as explicit continuation.
3. `companionDoctrineRouter` bare-continuation fallback returned generic prompt instead of contract clarifier.
4. Failed OpenAI path assigned `core_connection_error` / "trouble retrieving additional passages."

## Paths That Could Produce `core_connection_error`

| Path | Trigger | Phase 5F fix |
|------|---------|------------|
| `openAiFirstCompanionRuntime.js` | `openaiCalled=false` default route | Default → `companion_lane_fallback` |
| `doctrineErrorFirewall.js` | Leak sanitization → retrieval message | Maps to companion safe fallback |
| `responseGuarantee.js` | Uncaught handler errors | Firewall on success path |
| Witness continuation without topic | Retrieval exhaustion | `noGlitchTurnContract` blocks retrieval |

## Retrieval Call Paths

- `doctrineWitnessInventory.handleWitnessContinuation`
- `retrievalEvidencePack` (via OpenAI-first runtime)
- `bibleWideReasoningEngine` witness rotation

**Gate:** `shouldBlockRetrieval(contract)` when `bare_continuation_without_context` or `unknown_or_incomplete`.

## OpenAI Call Paths

- `openAiFirstCompanionRuntime` compose (companion lane)
- Strict doctrine compose (when not blocked)

**Gate:** `shouldBlockOpenAI(contract)` for clarifiers, emotional support, prayer, learning, memory.

## Stale Topic Paths

- `bibleSemanticConceptNormalizer.shouldClearStaleTopic`
- `companionDoctrineRouter.applyDoctrineRoutingSideEffects`
- Phase 5E ordering preserved; contract runs before routing side effects.

## `"show me another verse"` Handling

| State | Handler |
|-------|---------|
| No context / post-stop | `no_glitch_clarifier` |
| Active doctrine/concept | Witness continuation / bible_wide |
| Explicit topic in message | `explicit_continuation_with_topic` |
| `releaseRequested=true` | Clarifier (no stale continuation) |

## Topic/Concept Clear Paths

- `releaseDoctrineTopic` — companion turns, memory recall
- `finalizeStopRelease` — stop contract + post-stop cleanup
- `setActiveDoctrineConversation` — topic transitions

## `releaseRequested` Behavior

Previously blocked clarifier via `getContinuationDoctrineTopic` returning null — correct for continuation but bare continuation fell through to wrong handler. Phase 5F routes to clarifier before router bare-continuation fallback.

## Post-Stop Fall-Through (fixed)

```
stop → finalizeStopRelease → show me another verse
  → classifyTurnContract: bare_continuation_without_context
  → buildContractSafeReply (no retrieval, no OpenAI)
  → route: no_glitch_clarifier
```

## Integration Order (orchestrator)

1. Load state
2. Word-sense + BNC concept detect
3. `classifyTurnContract`
4. Contract safe reply (early return)
5. Reasoning plan + scripture planner
6. BNC safety validator
7. Strict / bible_wide answer
8. Formatter + companion tone
9. Turn memory update

## Safe for Controlled Deploy

**Yes** — contract layer is additive; no corpus/evidence/doctrine mutation.
