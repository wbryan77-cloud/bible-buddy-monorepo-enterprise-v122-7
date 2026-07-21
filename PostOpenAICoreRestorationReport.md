# Post-OpenAI Core Restoration Report

**Date:** 2026-06-01  
**Priority:** CRITICAL  
**Constraints:** No beta · No Sprint 3 · No deploy · No push

---

## Summary

Live failures after OpenAI connected were traced to **fallback speakers** (`personalizedFallback` study loops), **post-compose enrichment**, and **topic bleed** (session topic → Sabbath history). The core path now:

1. **Never** uses `personalizedFallback` as the primary answer when OpenAI fails — uses `buildConnectionErrorReply` only.
2. **Skips** `enrichResponseWithRelationshipIntelligence` on core turns.
3. Resolves doctrine topic from **current message only** (`routingHintsOnly`).
4. Injects **answerGuidance** + **doctrineEvidenceSnippets** for OpenAI (not template prose).
5. Regenerates/strips dangerous phrases (“You've been studying…”, witness triplets).

---

## Task 1 — Authorship table (failed transcript turns)

Inferred from reported behavior **before** this fix:

| User message (summary) | openaiCalled | finalAnswerAuthor | fallbackUsed | templateUsed | routeUsed | Failure reason |
|------------------------|--------------|-------------------|--------------|--------------|-----------|----------------|
| Relationship loss | Often true | openai + enrichment | false | false | core_openai_compose | Generic tone; enrichment not harmful |
| Sabbath definition | true | openai or doctrine path | false | true | sabbath/doctrine | Witness triplet / template presenter |
| How keep Sabbath holy? | true | openai | false | true | core + history evidence | `detectTopicFromSessions` + history in pack |
| Yahweh vs Jesus wording | true | openai | false | true | core + sabbath history | Wording not classified; Rome chain bleed |
| Dietary law | true/mixed | **personalizedFallback** | **true** | true | core_fallback / fallback | Study label “general/dietaryLaw” speaker |
| Yes/no pork | true | openai | false | true | core | No `requireYesNoLead` guidance |
| Correction / homework | false/true | **personalizedFallback** | **true** | false | core_fallback | `!openaiCalled` → `H.fallbackReply` study loop |
| Didn't ask to pray | true | openai | false | true | core | Prayer template in prior paths |
| Later “trouble connecting” | false | **connection_error** | true | false | core_connection_error | Render OOM 134 or API error |

**After fix:** inspect each live turn via `reply.coreDebug` on `/buddy/chat` (dev or `BUDDY_CORE_DEBUG=1`).

---

## Task 2 — Phrase classification

| Phrase | Class | Action on `/buddy/chat` |
|--------|-------|-------------------------|
| “You've been studying general…” | **B** Dangerous fallback speaker | **Removed** — `personalizedFallback` gated; strip + regen |
| “We can continue that study…” | **B** | **Removed** |
| “If it would help, we could continue your study…” | **B** | **Removed** |
| “Psalm 46:1” loop in fallback | **B** | Disabled when `BUDDY_TEMPLATE_PROSE=0` |
| “I had trouble connecting just now” | **A** Allowed system error | **Only** on real API failure (`buildConnectionErrorReply`) |
| “I'm glad you asked to pray” | **B** | Bypassed (no prayer responder on core path) |
| “How have you been doing since we prayed” | **B** | Bypassed |
| “establishes the matter…” | **B** | Regen + strip + forbidden in composer |
| “confirms it alongside Scripture” | **B** | Same |
| “carries the theme forward” | **B** | Same |
| “Would you like to continue studying…” | **B** | `skipStudyPrompts` + polish strip |
| Scripture references in evidence JSON | **C** Evidence-only | **Keep** |
| Crisis / 988 lines | **A** | **Keep** |

---

## Task 3–6 — Implementation

| Area | Change |
|------|--------|
| Evidence-only doctrine | `doctrineEvidenceSnippets.js` — references/facts, no prose blocks |
| Direct questions | `answerGuidance.js` — yes/no, HOW, wording, homework, correction |
| Sabbath HOW vs history | `isPracticalSabbathHowQuestion`; history only if `isExplicitHistoricalQuestion` |
| Study fallback | No study speaker when `favoriteTopic === 'general'`; env `BUDDY_TEMPLATE_PROSE=0` |
| Corrections | Expanded `correctionLedger` patterns |
| Connection fallback | `coreResponseGuards.buildConnectionErrorReply` — debug in `coreDebug.errorMessage` |

---

## Task 7 — coreDebug fields (verified)

`coreDebug` now includes:

`runtimeUsed`, `openaiCalled`, `finalAnswerAuthor`, `templateUsed`, `fallbackUsed`, `responderUsed`, `routeUsed`, `studyLoopUsed`, `prayerTemplateUsed`, `scriptureWitnessTemplateUsed`, `activeTopicUsedAsContextOnly`, `errorMessage`, plus validation flags.

Enabled when `NODE_ENV !== 'production'`, `BUDDY_DEBUG=1`, or `BUDDY_CORE_DEBUG=1`.

---

## Task 8 — Render memory

See [RenderMemoryStabilityNotes.md](RenderMemoryStabilityNotes.md).

---

## Task 9 — Regression

**Script:** `scripts/postOpenAiCoreRestorationSmokeTest.js`  
**Output:** `docs/regression-trace/post-openai-core-restoration-results.json`

Requires `OPENAI_API_KEY` in the shell running the test:

```bash
export OPENAI_API_KEY=...
BUDDY_RUNTIME=legacy BUDDY_TEMPLATE_PROSE=0 node scripts/postOpenAiCoreRestorationSmokeTest.js
```

**Local run in this environment:** API key not present in agent shell — run the command above in your terminal where `echo $OPENAI_API_KEY` is set and server logs show `✅ OpenAI client ready`.

**Structural regression (no API):** `scripts/coreRestorationRegressionTest.js` — **13/13 PASS**; routes `core_connection_error` instead of `You've been studying general`.

---

## Files changed

- `services/openAiFirstCompanionRuntime.js` — no personalizedFallback; connection error only
- `services/coreResponseGuards.js` — new
- `services/answerGuidance.js` — new
- `services/doctrineEvidenceSnippets.js` — new
- `services/retrievalEvidencePack.js` — message-only topic; guidance + snippets
- `services/reasonFirstComposer.js` — regen on dangerous phrases; answerGuidance in payload
- `services/coreRestorationDebug.js` — expanded fields
- `services/personalizedFallback.js` — study speaker gates
- `services/buddyBrain.js` — minimal fallback env; tail-read sessions
- `services/correctionLedger.js`, `doctrineBoundaries.js`, `companionReplyPolish.js`

---

## Remaining risks

1. Run **postOpenAi smoke test** with live key to confirm doctrine answer quality.
2. Render **OOM 134** — monitor after tail-read + smaller evidence payload.
3. Shared `chat-html-user` — use per-session `userId` in `public/chat.html` for testing.
4. Set **`BUDDY_TEMPLATE_PROSE=0`** on Render to block legacy study fallback globally.

---

## Stop condition

Fix implemented; structural validation complete. Full OpenAI smoke pass pending API key in test runner environment.
