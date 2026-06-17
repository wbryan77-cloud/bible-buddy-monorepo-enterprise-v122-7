# Phase 5L Root Cause History Audit

**Date:** 2026-06-16

## Last Known Good Warm Path

Phase **5G–5I** companion pipeline (`companionResponseBuilder`, `relationshipContextModel`, `practicalGuidanceEngine`) produced warm family/nervous/prayer replies when **orchestrator owned the turn** and **OpenAI was not invoked**.

## Where Warmth Was Lost

1. **Multiple early returns** — `noGlitchTurnContract`, `doctrineFinalAuthorityEngine`, `buildDietaryLawFinalAnswer`, OpenAI fallback bypassed companion lanes.
2. **Template leakage** — “Absolutely — staying with the Bible text”, “Scripture witnesses:”, clarification loop.
3. **No final owner** — `polishCompanionReply` and `companionStyleGuard` ran on some paths only; `finalizeBuddyResponse` did not enforce mode contract.
4. **Intent gaps** — bare “I’m nervous” classified as doctrine continuation; prayer/deeper-prayer routed to verse lists.

## Current Live Path (pre-5L)

`buddy.js` → `openAiFirstCompanionRuntime` → `bibleCompanionOrchestrator` (many branches) → `finalizeBuddyResponse` (polish only).

## Target Live Path (5L)

Same entry → orchestrator drafts → **`finalizeBuddyResponse` → `liveResponseOwner` → `singleCompanionContract`**.

## Modules to Keep (live-path owners)

- `liveResponseOwner` — final text authority
- `singleCompanionContract` — mode + forbidden phrase gate
- `bibleCompanionOrchestrator` — routing + draft selection
- `strictDoctrineGate` — doctrine authority (drafts)

## Modules to Demote (helper-only)

- `doctrineFinalAuthorityEngine` templates — draft input only; contract repairs output
- `companionStyleGuard` — pre-owner polish; contract is final gate
- OpenAI — tone polish only when orchestrator allows

## Modules to Remove from Return Authority

- Raw `buildClarificationReply` as final for established threads
- `buildConnectionErrorReply` when orchestrator already has draft
- `doctrineFinalAuthorityEngine` “Absolutely — staying” as user-visible final

## Why Synthetic Tests Missed Live Failures

Tests checked keyword presence, not **forbidden phrase absence** or **single-session thread order**. Live failures were **route ownership** issues on turn 4+ of a thread.
