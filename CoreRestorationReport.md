# Core Restoration Report

**Date:** 2026-06-01  
**Priority:** CRITICAL  
**Constraints:** No beta · No Sprint 3 · No deploy · No push

---

## Goal (restated)

Restore BibleBuddy so **OpenAI thinks and responds organically**, with **Scripture evidence guiding** the answer, **doctrine validators protecting truth**, and **memory supporting** the thread — without template responders owning the conversation.

---

## What changed

### Removed from default `/buddy/chat` path

| Removed behavior | Was causing |
|------------------|-------------|
| `masterBuddyRuntime` as default | Route-first templates, sticky topics |
| `doctrineCompanionPath` final templates | Sabbath witness triplets as main reply |
| `continue_study` / `memory_recall` direct prose shortcuts | Non-OpenAI authors |
| `routeOwnershipTable` + `resolveRouteKey` inheritance | Wrong route on follow-ups |
| `activeConversation` routing input | `health` topic lock → health loop |
| Health/grief/prayer/job **template** responders as final authors | Canned scripts |
| `scriptureWitnessEngine` as reply body | "establishes the matter…" blocks |
| `answerMatchGate` / `responseContract` replacement prose | Meta template regen |

### Demoted to evidence / context

| Module | Now |
|--------|-----|
| `retrievalEvidencePack` | Single evidence builder (`routingHintsOnly: true`) |
| `healthCompanionResponse` / `griefCompanionResponse` / `prayerCompanionResponse` / `companionDiscernmentResponder` | Classify flags in `companionContext` only |
| `scriptureChainExpansion` / `bibleTopicCatalog` | Scripture references in evidence |
| `sabbathHistoryDeepResponder` | History facts only when user asks explicit historical change |
| `activeConversationManager` | Summary in evidence; **not** route owner |
| Practical Sabbath HOW questions | History suppressed; Scripture HOW emphasized |

### Kept

| Component | Why |
|-----------|-----|
| `openAiFirstCompanionRuntime` | Default orchestrator |
| `reasonFirstComposer` + `coreRestoration` instructions | OpenAI author |
| `doctrineBoundaryValidator` | Post-compose guardrails |
| `buddyBrain.fallbackReply` | Crisis + OpenAI unavailable |
| `finalizeBuddyResponse` | Session log, memory persist, polish |
| `BUDDY_RUNTIME=reason_first` | Alternate env path (unchanged) |
| `BUDDY_OPENAI_FIRST=0` | Emergency rollback to master |

---

## Simple path (Task 3) — implemented

```text
User message
  → crisis/safety check (crisis → fallbackReply only)
  → load memory/session context (enrichRuntimeContextWithMemory)
  → buildRetrievalEvidencePack (Bible/doctrine evidence, routingHintsOnly)
  → composeReasonFirstReply (OpenAI, coreRestoration)
  → validateReasonFirstReply (doctrine boundaries)
  → polish + finalizeBuddyResponse
```

**Not allowed on default path:** active topic route choice, route ownership final answers, template responders, witness triplet as main body, unasked prayer openers, health template unless clear medical question.

---

## Debug proof (Task 7)

`services/coreRestorationDebug.js` + `routes/buddy.js` expose `coreDebug` when `NODE_ENV !== 'production'` or `BUDDY_DEBUG=1`.

---

## Regression (Task 8)

**Script:** `scripts/coreRestorationRegressionTest.js`  
**Results:** `docs/regression-trace/core-restoration-results.json`

```bash
BUDDY_RUNTIME=legacy node scripts/coreRestorationRegressionTest.js
# With full OpenAI proof:
OPENAI_API_KEY=... BUDDY_RUNTIME=legacy node scripts/coreRestorationRegressionTest.js
```

### Results (local, no API key) — **13/13 PASS**

| # | Test | Route | Template markers |
|---|------|-------|------------------|
| 1 | Relationship pain | `core_fallback_openai_unavailable` | None |
| 2 | Correction | core_fallback | None |
| 2b | Seeded health topic | core_fallback | No `health_support` |
| 3 | Listen first | core_fallback | None |
| 4 | Alzheimer's | core_fallback | No health loop |
| 5 | How many heavens | core_fallback | No forbidden route |
| 6 | Sabbath definition | core_fallback | No witness triplet |
| 7 | Sabbath how holy | core_fallback | No Constantine-only dump |
| 8 | Dietary law | core_fallback | No template route |
| 9 | Swine/pork | core_fallback | No template route |
| 10 | Didn't ask to pray | core_fallback | No unasked prayer |
| 11 | Jesus / OT God | core_fallback | No template route |
| 12 | Real health | core_fallback | No `health_support` route |

**Comparison:** `BUDDY_OPENAI_FIRST=0` + seeded health still returns `health_support` + "not a doctor" (pre-restoration behavior).

Without `OPENAI_API_KEY`, content-quality assertions for doctrine turns are relaxed; **routing and template-marker guards still pass**. With API key, tests also require `openAiCalled === true`.

---

## Files touched

| File | Change |
|------|--------|
| `services/openAiFirstCompanionRuntime.js` | Rewritten: evidence + OpenAI only |
| `services/retrievalEvidencePack.js` | `routingHintsOnly`, practical Sabbath / explicit history |
| `services/reasonFirstComposer.js` | `CORE_RESTORATION_INSTRUCTION`, `coreRestoration` flag |
| `services/coreRestorationDebug.js` | New debug builder |
| `routes/buddy.js` | Attach `coreDebug` in dev |
| `scripts/coreRestorationRegressionTest.js` | New 13-case suite |
| `FinalProseAuthorshipInventory.md` | Task 1 + 2 inventory |
| `CoreRestorationReport.md` | This report |

**Not deleted (experiment / rollback):** `masterBuddyRuntime`, template responders, `doctrineCompanionPath` — bypassed, not removed from repo.

---

## Remaining risks

1. **No API key in CI/local** — fallback prose is generic; production must set `OPENAI_API_KEY` for organic answers.  
2. **`finalizeBuddyResponse` enrichment** — relationship intelligence still appends after compose; monitor for bleed.  
3. **`BUDDY_RUNTIME=reason_first`** — parallel path; ensure env is explicit in deploy.  
4. **Shared `chat-html-user`** — active-conversation file contamination (ops).  
5. **Doctrine depth without API** — dietary/Sabbath/Logos quality requires live OpenAI run.

---

## Rollback

```bash
BUDDY_OPENAI_FIRST=0 BUDDY_RUNTIME=legacy node scripts/coreRestorationRegressionTest.js
# Expect health_support failures on seeded-health test — confirms master path
```

---

## Stop condition

Implementation and local validation complete. No beta, deploy, or push performed.
