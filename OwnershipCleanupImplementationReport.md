# Ownership Cleanup Implementation Report

**Date:** 2026-06-01  
**Priority:** CRITICAL  
**Scope:** Default `/buddy/chat` path — OpenAI authors normal turns; Scripture/doctrine files are evidence only.

**No beta · No Sprint 3 · No deploy · No push**

---

## Executive summary

Ownership cleanup is implemented and validated. With `BUDDY_TEMPLATE_PROSE=0`, `BUDDY_DISABLE_STUDY_FALLBACK=1`, and `BUDDY_DEBUG=1`, the **60-question ownership battery passed 60/60** with:

| Metric | Result |
|--------|--------|
| `openaiCalled` | **60/60 (100%)** |
| `finalAnswerAuthor=openai` | **60/60** |
| `fallbackUsed=false` | **60/60** |
| `studyLoopUsed=false` (before answer) | **60/60** |
| Study-loop openers in answer body | **0** |
| Psalm 46 fallback as normal answer | **0** |
| Witness triplet visible (unless requested) | **0** |
| Wrong answers (battery scoring) | **0/60** |

Full JSON: [`docs/regression-trace/ownership-cleanup-results.json`](docs/regression-trace/ownership-cleanup-results.json)

---

## Part A — Disable fallback/study ownership

### Changes

| File | Change |
|------|--------|
| `services/personalizedFallback.js` | When `BUDDY_TEMPLATE_PROSE !== '1'` or `BUDDY_DISABLE_STUDY_FALLBACK=1`, returns **minimal connection-style fallback** — no study profile speaker, no Psalm 46 loop, no “You've been studying…” |
| `services/buddyBrain.js` | `applyFallbackLoopGuard` **no longer swaps** to `personalizedFallback` when study fallback disabled; strips loop language in place. `fallbackReply` uses minimal ownership fallback by default. |
| `services/openAiFirstCompanionRuntime.js` | OpenAI failure → `buildConnectionErrorReply` only (never `personalizedFallback`). Strips dangerous fallback phrases post-compose. |
| `services/coreResponseGuards.js` | Expanded strip patterns for study loops, witness triplet, and “If it would help, we could continue your study…” |

### Allowed fallback surfaces

1. **After** a complete OpenAI answer — optional next-step hints via `companionNextSteps` (skipped on core path via `skipStudyPrompts: true`).
2. **Real API/connection failure** — terse connection message with `finalAnswerAuthor=connection_error`.

---

## Part B — Fix chat-html-user bleed

| File | Change |
|------|--------|
| `public/chat.html` | Per-session `userId` via `localStorage` (`buddyChatUserId`) instead of shared `chat-html-user`. |
| `services/retrievalEvidencePack.js` | When `isNewQuestionOverridesProfile(message)`, `studyState` is suppressed — prior study topic cannot override current question. |
| `services/answerGuidance.js` | `suppressPriorStudyTopic`, `forbidStudyContinuation`, direct-question detection for corrections, homework, grief, doctrine pivots. |

---

## Part C — Direct answer first

| File | Change |
|------|--------|
| `services/answerGuidance.js` | Flags: `requireYesNoLead`, `requireHowManyLead`, `requireSearchCapabilityAnswer`, `forbidSabbathHistoryChain`, `directAnswerFirst`. |
| `services/reasonFirstComposer.js` | `CORE_RESTORATION_INSTRUCTION` enforces yes/no first, HOW before history, how-many count first, honest search-capability answer. |
| `services/doctrineEvidenceSnippets.js` | Evidence snippets for dietary, heavens, Sabbath HOW, traditions, death-state, search capability (evidence only). |
| `services/ownershipAntiOverrideGuard.js` | `hasYesNoLead()` accepts explicit yes/no or clear prohibitive dietary language (“is unclean”, “not to be eaten”). |

---

## Part D — Evidence, not canned blocks

| Kept (evidence) | Demoted/stripped from final prose |
|-----------------|-----------------------------------|
| `doctrineEvidenceSnippets`, `retrievalEvidencePack`, scripture chains | “establishes the matter / confirms it alongside Scripture / carries the theme forward” |
| Sabbath/dietary/heaven/tradition/death-state evidence | Witness path labels, Genesis-to-Revelation study path openers |
| Historical notes (secondary, gated) | “Would you like to continue studying this topic together?” |

Validator + polish + `stripDangerousFallbackSpeaker` remove pasted template blocks before finalize.

---

## Part E — Anti-override guard

| File | Role |
|------|------|
| `services/ownershipAntiOverrideGuard.js` | Pre-finalize check: question match, no study loop, no witness paste, yes/no/how-many/search leads. |
| `services/doctrineBoundaryValidator.js` | Wires ownership validation into `validateReasonFirstReply`; surfaces regen hint. |
| `services/openAiFirstCompanionRuntime.js` | On ownership failure, **one regen** with terse instruction: “Answer the latest user question directly first…” |

Debug fields on response (`coreDebug` when `BUDDY_DEBUG=1`):

- `openaiCalled`, `finalAnswerAuthor`, `fallbackUsed`, `studyLoopUsed`, `templateUsed`, `currentQuestionMatch`, `antiOverrideRegen`

---

## Part F — Smoke test (executed)

```bash
export OPENAI_API_KEY="..."
export BUDDY_DEBUG=1
export BUDDY_TEMPLATE_PROSE=0
export BUDDY_DISABLE_STUDY_FALLBACK=1
BUDDY_RUNTIME=legacy node scripts/ownershipAuditBattery.js
```

**Result:** `Wrong 0/60` · `openAiCalledRate: 1.0` · ran at `2026-06-04T20:15:24.998Z` (see JSON for per-test rows).

### Previously failing live cases (now OK)

| Test | Message | Outcome |
|------|---------|---------|
| live_01 | Can I eat pork? Yes or no? | OpenAI, yes/no lead, Leviticus/Deuteronomy |
| live_06 | How many heavens… | OpenAI, no traditions study loop |
| live_08 | Can you search the Bible directly? | OpenAI, direct capability answer |
| live_09 | How do we keep Sabbath holy? | OpenAI, HOW first (no unsolicited Sunday history) |
| live_13 | Can I eat pork according to Leviticus… | OpenAI, direct dietary answer |
| live_15 | Correction: heavens vs traditions | OpenAI, answers heavens not study continuation |

---

## Files touched

- `services/openAiFirstCompanionRuntime.js` — core path wiring, anti-override regen
- `services/buddyBrain.js` — fallback loop guard, minimal fallback
- `services/personalizedFallback.js` — hard-disable study speaker
- `services/ownershipAntiOverrideGuard.js` — **new**
- `services/coreResponseGuards.js` — strip witness/study blocks
- `services/doctrineBoundaryValidator.js` — ownership in validator
- `services/reasonFirstComposer.js` — core restoration + regen param
- `services/answerGuidance.js` — direct-answer flags
- `services/retrievalEvidencePack.js` — study state suppression
- `services/doctrineEvidenceSnippets.js` — expanded evidence
- `public/chat.html` — per-user `userId`
- `scripts/ownershipAuditBattery.js` — 60 tests, writes cleanup results JSON

---

## Production env recommendation

Set on default `/buddy/chat` deployment:

```
BUDDY_TEMPLATE_PROSE=0
BUDDY_DISABLE_STUDY_FALLBACK=1
BUDDY_DEBUG=0   # enable 1 temporarily for ownership proof
```

Rollback: `BUDDY_OPENAI_FIRST=0` → `masterBuddyRuntime`.

---

## Stop condition

Implementation and validation complete per task scope. No beta, deploy, or push performed.
