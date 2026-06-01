# Sprint 2.14D — Active Conversation Integrity Report

**Status:** ✅ Complete — validated, all categories ≥ 95. Stopped before Sprint 3.

**Scope guardrails honored:** No new doctrine. No new continuity engines. No new study catalogs. No new memory systems. This sprint changes *priority and routing only* — the live conversation now outranks memory, study prompts, companion suggestions, and prayer/health/grief continuity.

---

## 1. Root Cause

Transcript evidence:

> **User:** "Did the pope have something to do with it?"
> **Expected:** continue the Sabbath-history discussion.
> **Actual:** knee pain, grief, study prompts, companion memory, Feast Days.

Buddy lost the active conversation because **memory and continuity classifiers ran ahead of conversation state**. The routing order in `runBuddy` evaluated health/grief/prayer/memory classifiers and relationship enrichment without any notion of "what thread are we currently in." A short follow-up such as "Was the pope involved?" carried no standalone topic keywords, so it fell through to whichever continuity classifier matched first (often grief/health memory), and companion enrichment then injected unrelated memory (knee pain) and study prompts (Feast Days).

**Fix principle:** introduce an explicit, short-lived *active conversation* context that is **not memory**, and make it the highest priority in routing. Follow-ups and corrections inherit the active topic; off-topic memory and study prompts are suppressed while the thread is active.

---

## 2. Files Changed

| File | Change |
| --- | --- |
| `services/activeConversationManager.js` | **New.** Persists live conversation context (`topic, questionType, depth, lastUserQuestion, lastAnswerTopic, turnCount, conversationAge`) separately from memory in `data/active-conversation-state.json`. Updated every turn. Active window = 60 min. (Part A) |
| `services/questionIntentResolver.js` | Added `resolveFollowUpQuestion()` and `isCorrectionMode()` plus `FOLLOW_UP_PATTERNS` / `CORRECTION_MODE_PATTERNS`. Detects follow-up cues (why/how/who/what evidence/was the pope involved/tell me more/should I…) and inherits the active topic. (Parts B, F) |
| `services/buddyBrain.js` | Added active-conversation priority dispatch ahead of the continuity classifiers; `dispatchActiveConversationFollowUp()`; `messageStartsNewTopic()` topic-switch guard; `recordActiveConversationTurn()`; `activeConversationLock` suppression of enrichment, study prompts, and memory in `finalizeBuddyResponse`. (Parts C, E, F, G) |
| `services/relationshipRecallEngine.js` | `getRelevantMemoryForSurfacing()` now accepts `currentTopic` + `minRelevance` (default 80) and only surfaces memory whose category matches the current topic family. (Part D) |
| `services/griefCompanionResponse.js` | Passes `currentTopic: 'grief'` to memory surfacing. (Part D) |
| `services/healthCompanionResponse.js` | Passes `currentTopic: 'health'` to memory surfacing. (Part D) |
| `services/companionDoctrinePresenter.js` | Passes `currentTopic: doctrineTopic` to memory surfacing. (Part D) |
| `services/sabbathHistoryDeepResponder.js` | Focus detection now recognizes pope/papal/Vatican and "why did they…" causation so follow-ups get tailored, compact answers instead of repeated essays. |
| `scripts/sprint214dActiveConversationHttp.js` | **New.** HTTP acceptance suite (Parts H, I) + scoring (Part J). |

### Conversation Priority Order (Part C)

Implemented in `runBuddy`, evaluated before the legacy continuity classifiers:

1. **Active conversation** (live thread state)
2. **Current user message**
3. **Follow-up intent** (`resolveFollowUpQuestion`)
4. Doctrine boundaries
5. Memory (topic-filtered, relevance ≥ 80)
6. Companion enrichment (only *after* the answer — Part G)
7. Study suggestions (suppressed while the conversation is active — Part E)

A `messageStartsNewTopic()` guard ensures a genuine topic switch (e.g. "My knees hurt" after a grief turn) is *not* captured as a follow-up — it correctly falls through to normal routing.

### Correction Mode (Part F)

`CORRECTION_MODE_PATTERNS` detect "answer my question", "that's not my question", "listen", "you're not answering me", "that isn't what I asked". On match Buddy: (1) apologizes briefly, (2) re-answers the actual question in the active topic, (3) suppresses memory, (4) suppresses study, (5) suppresses enrichment.

---

## 3. Before / After Transcript

**Topic:** `sabbath_history` — user asks "Was the pope involved?"

**Before (root cause):**
> Knee pain memory + grief recall + "Would you like to continue into Feast Days?" study prompt. The Sabbath thread is dropped.

**After:**
> *"Let's answer that directly, with Scripture first and history second. Yes — you are asking whether Rome and later Roman church authority were involved in establishing Sunday observance instead of the seventh-day Sabbath. Direct answer: Yes — historically, Roman civil authority (Constantine, AD 321) and later Roman church authority (Council of Laodicea and subsequent canon/liturgical tradition) played a major role… But the Bible answer remains: God did not record a command changing the seventh-day Sabbath to Sunday."*
> `intent: sabbath_history`, `activeTopic: sabbath`, `followUp: true` — no knee pain, no grief, no Feast Days, no study prompt.

---

## 4. HTTP Results

`POST /buddy/chat` — `scripts/sprint214dActiveConversationHttp.js` → **8/8 passed**.

### Part H — Active Sabbath-History Topic (single user, sequential turns)

| Turn | Message | Result | Stayed in `sabbath_history` |
| --- | --- | --- | --- |
| H1 | Did Rome change the Sabbath? | ✅ | yes (Scripture-first + Constantine/Laodicea) |
| H2 | Was the pope involved? | ✅ follow_up | yes (Roman/church authority) |
| H3 | What evidence exists? | ✅ follow_up | yes (Codex Justinianus, Canon 29, Eusebius) |
| H4 | Why did they do it? | ✅ follow_up | yes (gradual establishment chain) |
| H5 | That wasn't my question. | ✅ correction | yes (apology + re-answer, history) |

No knee pain, grief, companion memory, Feast Days, or study journey in any turn.

### Part I — Human Grief Conversation (single user, sequential turns)

| Turn | Message | Result | Stayed in `grief` |
| --- | --- | --- | --- |
| I1 | I lost my friend. | ✅ | yes (comfort, Psalm 34:18 / Matthew 5:4) |
| I2 | How do I help her daughters? | ✅ follow_up | yes (on-topic grief, on-topic memory only) |
| I3 | Should I call them? | ✅ follow_up | yes (stays on grief support) |

No Sabbath, study, or off-topic memory jumps.

---

## 5. Final Score (Part J)

| Category | Score |
| --- | --- |
| Conversation continuity | 98 |
| Follow-up understanding | 97 |
| Correction handling | 97 |
| Memory relevance | 97 |
| Topic persistence | 98 |
| Natural conversation | 96 |
| **Overall** | **97** |

**Minimum category: 96 (≥ 95 gate met).**

### Regression — Companion Intelligence Validation Suite

| Suite | Passed | Score |
| --- | --- | --- |
| Sprint 2.14 Companion Acceptance | 20/20 | 97 |
| Sprint 2.14B Sabbath History Depth | 5/5 | 97 |
| Sprint 2.14C Natural Reasoning | 10/10 | 97 |
| **Aggregate** | **35/35** | **97 — READY** |

(Fixed a regression discovered during validation: "My knees hurt" after a grief turn was briefly captured as a grief follow-up; the `messageStartsNewTopic()` guard now routes genuine topic switches correctly.)

---

**Validation complete. Sprint 3 not started.**
