# Phase 5E — Bible Natural Concordance Audit

**Date:** 2026-06-14  
**Status:** Complete

## Root Cause (one phrase at a time)

Buddy previously matched isolated keywords (e.g. `abomination` → dietary) and carried stale doctrine topics across explicit new questions. Follow-ups like "more scriptures on that" lacked `lastAnsweredConcept` continuity. Learning requests hit a false "cannot modify database" path instead of `reflectionMemoryEngine`.

## Architecture

```
User message
  → bibleSemanticConceptNormalizer (typo, alias, BNC, context)
  → followUpContextResolver ("that", actor questions)
  → companionDoctrineRouter (stale topic clear, lane plan)
  → bibleReasoningEngine / bibleWideReasoningEngine
  → bncSafetyValidator (witness minimum, speculation guard)
  → strictDoctrineGate (strict topics win on conflict)
  → directAnswerFormatter / companionStateEngine (tone)
```

## Authority Order (enforced)

1. Current user message
2. Conversation state / pending question
3. BNC concept match
4. Approved strict doctrine (if strict topic)
5. Bible-wide Scripture witnesses
6. OpenAI (warmth/wording only when enabled)
7. Validators / formatters

BNC **never** auto-promotes doctrine. Learning candidates are `pending_review` only.

## New Services

| File | Role |
|------|------|
| `services/bibleNaturalConcordanceBuilder.js` | Scans assets → `docs/bible-learning/bible-natural-concordance.generated.json` |
| `services/bibleSemanticConceptNormalizer.js` | `normalizeBibleQuestion`, `detectSemanticConcept`, stale-topic detection |
| `services/followUpContextResolver.js` | Continuation + actor/event distinction |
| `services/bncSafetyValidator.js` | Witness minimum, speculation/parable guards |

## Modified Services (high impact)

- `bibleConceptGraph.js` — concept coverage + detection order
- `bibleCompanionOrchestrator.js` — learning candidates, prayer/overwhelmed priority
- `companionDoctrineRouter.js` — semantic routing, topicHistory, before-that strictTopic
- `doctrineConversationState.js` — topicHistory, release preserves previous topic
- `doctrineLivePathHandlers.js` — topic-specific memory recall summaries
- `reflectionMemoryEngine.js` — `recordConceptLearningCandidate`
- `bibleSemanticConceptNormalizer.js` — strict-doctrine switch does not premature-release

## Phase 4H Fix (before-that recall)

**Bug:** `shouldClearStaleTopic` released active topic before `setActiveDoctrineConversation`, so `previousDoctrineTopic` was never set. Memory recall then overwrote history.

**Fix:**
- Strict topic switches defer to `setActiveDoctrineConversation` (no premature release)
- `releaseDoctrineTopic` preserves `previousDoctrineTopic` and appends to `topicHistory`
- `buildDoctrineMemoryRecallReply` uses topic-specific contract summary for recalled topic

## Regression Results

| Suite | Result |
|-------|--------|
| Phase 5E BNC | **18/18** |
| Phase 5A | **11/11** |
| Phase 4O | **12/12** |
| Phase 4N | **8/8** |
| Phase 4M | **15/15** |
| Phase 4H | **28/28** |
| Phase 5D | **Not present** (`runPhase5DCompanionReadinessRegression.js` missing) |

## Corpus / Evidence Safety

- Evidence cards: **not modified**
- Doctrine packs: **not modified**
- Witness chains: **not modified**
- Phase 3: **not reopened**
- Generated files only: BNC JSON + concept-growth-candidates.json

## Companion Readiness Score

**9/10** — Prayer, overwhelmed comfort, sexual boundaries, stale-topic override, and follow-ups pass. Production Render path still needs module push from Phase 5B/5C.

## Remaining Risks

1. Render deploy skew — missing modules on remote until push
2. BNC entries from builder are `pending_review` for sensitive topics; human review queue not automated
3. `runPhase5DCompanionReadinessRegression.js` not in repo — 5D coverage inferred from 5E overlap
4. OpenAI-enabled paths less tested when `BIBLEBUDDY_DISABLE_OPENAI=1` in regressions

## Safe for Controlled Deploy

**Yes** — with controlled deploy checklist: push all service modules, verify `/api/runtime-health`, run Phase 5E + 4H on staging before production.
