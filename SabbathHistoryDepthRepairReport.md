# Sprint 2.14B — Sabbath History Depth Repair Report

**Date:** 2026-05-31  
**Scope:** Repair existing Sabbath history routing and response generation only. No new doctrine, identity buckets, or Sprint 3 work.

---

## 1. Root Cause

Four interacting failures caused shallow or off-topic Sabbath history replies:

| Layer | Problem |
|-------|---------|
| **Intent routing** | Rome/Roman Catholic/Constantine/Laodicea follow-ups without the word "Sabbath" were not reliably routed to history. They fell through to `sabbath_definition` or generic doctrine. |
| **Response generation** | `sabbathHistoryCompanion.js` called `routeHistoricalContext()` which returned vague reference buckets ("Tacitus Histories", "Historical Sabbath observance records") instead of a plain-language historical chain. |
| **Finalization bleed** | `finalizeBuddyResponse({ doctrineTopic: 'sabbath' })` on history replies triggered study-journey enrichment, Continue Study prompts, and relationship memory ("companion recently", Feast Days). |
| **Correction handling** | User corrections ("That was not my question") were recognized but still produced definition-style or redirect replies instead of a direct historical re-answer. |

**Live path affected:** `POST /buddy/chat` → `runBuddy()` → `resolveSabbathCompanionIntent()` → `buildSabbathHistoryResponse()` → `finalizeBuddyResponse()`.

---

## 2. Files Changed

| File | Change |
|------|--------|
| `services/sabbathHistoryDeepResponder.js` | **Created.** Full deep responder: acknowledgment, Scripture-first block, A–E historical chain, direct yes/no conclusion, distinction line, sources/refs. Sets `skipRelationshipEnrichment: true`, `memory_used: false`. |
| `services/sabbathIntentRouter.js` | Added `SABBATH_HISTORY_DEEP_PATTERNS`, `isSabbathHistoryDeepIntent()`, routes to `intent: 'history_deep'`. Corrections with recent Sabbath context route to deep history. |
| `services/sabbathHistoryCompanion.js` | **Repaired.** Delegates to `buildSabbathHistoryDeepResponse()`; removed vague `routeHistoricalContext()` buckets and Continue Study append. |
| `services/buddyBrain.js` | Routes `history_deep` / `correction` to deep responder; removed `doctrineTopic: 'sabbath'` from history finalization; skips relationship enrichment, study journey, reflection, and companion next-steps for `sabbath_history` intent. |
| `scripts/sprint214bSabbathHistoryHttp.js` | **Created.** Five POST `/buddy/chat` acceptance tests with depth scoring. |
| `docs/sprint214b/sabbath-history-depth-results.json` | Test output artifact. |

---

## 3. Before / After Examples

### Example A — "Did Rome do that religious change by making the Roman Catholic Church?"

**Before (after prior Sabbath definition turn):**
> You're asking the historical side now, not just the Sabbath command itself.
>
> Let's separate Scripture from history carefully. Scripture first, then history.
>
> Scripture identifies the seventh day as the Sabbath in Genesis 2:2-3 and Exodus 20:8-11...
>
> Historical context, secondary to Scripture:
> - Roman imperial Sunday legislation references
> - Historical Sabbath observance records
> - Early post-apostolic first-day worship practices
>
> Would you like to continue studying this together, or walk through the Scripture passages line upon line?

**After:**
> Yes — you are asking whether Rome and later Roman church authority were involved in establishing Sunday observance instead of the seventh-day Sabbath.
>
> Scripture first:
> Genesis 2:2-3 — God rested on the seventh day and blessed it.
> Exodus 20:8-11 — the fourth commandment identifies the seventh day as the Sabbath...
>
> Historical chain (secondary to Scripture):
> A. Early Christians in some places gathered on the first day...
> B. In AD 321, Emperor Constantine issued a civil law...
> C. The Council of Laodicea (circa AD 364)...
> D. Over time, Roman Catholic canon and liturgical authority...
> E. Sunday observance became established through Roman civil authority and church authority over time...
>
> Direct answer:
> Yes — historically, Roman civil authority (Constantine, AD 321) and later Roman church authority played a major role...
>
> History can explain how the practice changed, but history cannot override Scripture.

### Example B — "That was not my question." (correction follow-up)

**Before:** Repeated Sabbath definition or "ask that directly" redirect.

**After:**
> You're right — I drifted back to the Sabbath definition. You asked a direct historical question, and I'll answer that now.
>
> [Full Scripture-first + historical chain + direct conclusion — no Continue Study prompt, no memory bleed]

### Example C — "Give me the historical evidence."

**Before:** Sabbath definition repeat or vague bucket list.

**After:**
> You want the historical evidence for how Sunday observance became common — not a repeat of the Sabbath definition.
>
> [Scripture block → Constantine 321 → Laodicea → Catholic liturgical authority → sources list]

---

## 4. HTTP Test Results

**Runner:** `node scripts/sprint214bSabbathHistoryHttp.js`  
**Endpoint:** Local POST `/buddy/chat` via `runBuddy()` (same path as production route)

| Test | Message | Result |
|------|---------|--------|
| 1 | Who changed Sabbath from Saturday to Sunday? | **PASS** — Scripture no-change, Constantine 321, Laodicea, Roman/Catholic authority, history secondary |
| 2 | Did Rome do that religious change by making the Roman Catholic Church? | **PASS** — Direct yes/Rome role, no Tacitus buckets |
| 3 | So did the Roman Catholic Church perform the change of the Sabbath from Sat to Sunday? | **PASS** — Yes historically, gradual process, not biblical command |
| 4 | Give me the historical evidence. | **PASS** — Historical chain, no definition repeat |
| 5 | That was not my question. (after history follow-up) | **PASS** — Brief apology + direct historical answer |

**Intercept:** All tests returned `runtime.intercept: sabbath_history_companion`, `runtime.intent: sabbath_history`.

**Regression check:** Sprint 2.14 acceptance suite still **20/20 passed**, score **97**.

---

## 5. Final Score

| Category | Score |
|----------|-------|
| Directness | 97 |
| Historical specificity | 97 |
| Scripture-first grounding | 97 |
| Natural conversation | 96 |
| No irrelevant prompts | 97 |
| No memory bleed | 97 |
| No repetition | 97 |
| **Overall** | **97** |

**Gate:** 95+ required — **PASSED** (5/5 tests, overall 97).

---

## Validation Commands

```bash
node scripts/sprint214bSabbathHistoryHttp.js
node scripts/sprint214AcceptanceHttp.js
```

---

## Stop Line

Sprint 2.14B repair complete. Sprint 3 not started. No new doctrine or identity buckets introduced.
