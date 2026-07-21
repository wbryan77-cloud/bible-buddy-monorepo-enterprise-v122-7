# OpenAI-First Restoration Report

**Date:** 2026-06-01  
**Status:** Implemented (approved Option 3)  
**Rollback:** Set `BUDDY_OPENAI_FIRST=0` to restore `masterBuddyRuntime` as default.

---

## Summary

Default `POST /buddy/chat` (`BUDDY_RUNTIME=legacy`) now uses **OpenAI-first** companion composition instead of `masterBuddyRuntime` template routing. Doctrine, Sabbath, registry, and meta-correction paths remain on a **narrow** `doctrineCompanionPath` without `routeOwnershipTable` or active-conversation route inheritance.

| Area | Before (`masterBuddyRuntime`) | After (OpenAI-first) |
|------|------------------------------|----------------------|
| Default route | `resolveRouteKey` + health/grief/job templates | `openai_first` compose |
| Seeded `activeConversation.topic=health` | `health_support` + canned health block | `openai_first` (no health template) |
| Sabbath definition | `sabbath_definition` | Unchanged (`doctrineCompanionPath`) |
| Crisis | `fallbackReply` crisis | Unchanged |

---

## Files changed / added

| File | Role |
|------|------|
| `services/openAiFirstCompanionRuntime.js` | Default runtime: crisis → continue study / recall → doctrine → OpenAI JSON compose |
| `services/doctrineCompanionPath.js` | Sabbath / doctrine / registry / meta only; `activeConversation: null` for routing |
| `services/companionRetrievalHints.js` | Health/grief/prayer hints for prompt context only |
| `services/buddyBrain.js` | `runBuddy` → openAiFirst unless `BUDDY_OPENAI_FIRST=0` or `reason_first` |
| `scripts/openAiFirstRegressionTest.js` | Part E regression suite |

---

## Regression results

Command:

```bash
BUDDY_RUNTIME=legacy node scripts/openAiFirstRegressionTest.js
```

Output: `docs/regression-trace/openai-first-results.json`

| # | Test | Result | Route |
|---|------|--------|-------|
| 1 | Relationship loss | PASS | `openai_first` |
| 2 | Correction (“flaring up…”) | PASS | `openai_first` |
| 2b | Correction + seeded health topic | PASS | `openai_first` |
| 3 | Listen first | PASS | `openai_first` |
| 4 | Same script complaint | PASS | `openai_first` |
| 5 | Alzheimer’s caregiver | PASS | `openai_first` |
| 6 | Grief “what do I do” | PASS | `openai_first` |
| 7 | Logos doctrine after grief turn | PASS | `openai_first` |
| 8 | Sabbath definition | PASS | `sabbath_definition` |
| 9 | Knees hurt | PASS | `openai_first` |

**10/10 passed** (local run without `OPENAI_API_KEY`; `openAiCalled` checks skipped when key absent).

### Before/after (seeded health, master vs restored)

With `BUDDY_OPENAI_FIRST=0` and seeded health active conversation:

- `masterRoute`: `health_support`
- Reply contains: “I'm not a doctor”, “flaring up”, scripture witness triplet

With default OpenAI-first and same seed:

- `masterRoute`: `openai_first`
- No health template markers in reply

---

## Architecture (restored path)

```text
POST /buddy/chat → buddyBrain.runBuddy
  → reason_first if BUDDY_RUNTIME=reason_first
  → masterBuddyRuntime if BUDDY_OPENAI_FIRST=0
  → openAiFirstCompanionRuntime (default)
      → crisis → finalize
      → continue_study / memory_recall → finalize
      → doctrineCompanionPath if shouldUseDoctrineCompanionPath
      → else OpenAI JSON compose + validateDoctrineBoundaries (post-compose flags)
      → finalizeBuddyResponse (session, memory, soft activeConversation turn)
```

Active conversation is **not** used to pick routes on the open path; hints are injected via `companionRetrievalHints` only.

---

## Follow-ups (not in this change)

1. Run suite with `OPENAI_API_KEY` set to assert `openAiCalled === true` on tests 1–7.  
2. Ops: per-user `userId` in `public/chat.html`; clear shared `data/active-conversation-state.json` rows.  
3. If Sabbath meta-correction regresses, narrow `shouldUseDoctrineCompanionPath` — do not re-enable full master default.

---

## Verification commands

```bash
# Regression suite
BUDDY_RUNTIME=legacy node scripts/openAiFirstRegressionTest.js

# Optional trace (same messages as emergency audit)
BUDDY_RUNTIME=legacy node scripts/traceBuddyChatPath.js

# Temporary master rollback
BUDDY_OPENAI_FIRST=0 BUDDY_RUNTIME=legacy node scripts/openAiFirstRegressionTest.js
```
