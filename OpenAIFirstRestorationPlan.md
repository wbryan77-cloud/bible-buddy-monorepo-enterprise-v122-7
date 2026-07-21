# OpenAI-First Restoration Plan

**Date:** 2026-06-01  
**Status:** **Implemented** — see `OpenAIFirstRestorationReport.md`.  
**Recommended strategy:** **Option 3** from `ArchitectureRollbackAnalysis.md`  
**Constraints:** No beta, Sprint 3, deploy, or push. No new routing-rule sprawl.

---

## Goal

Restore **`POST /buddy/chat`** so **normal companion conversation** is composed by **OpenAI by default**, as at `37c59c3`, while **keeping**:

- Crisis/safety guard  
- Doctrine / Sabbath / historical depth paths  
- Post-compose doctrine validator (where already present)  
- RACL **retrieval** as context (not prose owner)  

And **removing/bypassing**:

- `masterBuddyRuntime` as default dispatcher  
- `routeOwnershipTable` inherited-topic routing  
- `activeConversationManager` **forcing** routes  
- Health/grief/job/prayer **template final answers**  

---

## Target architecture (after restoration)

```text
POST /buddy/chat
  → routes/buddy.js
  → buddyBrain.runBuddy
      → classifySafety
      → if crisis → crisisHandler (KEEP)
      → if explicit doctrine/sabbath/history/registry match → doctrineHandler (KEEP, from master slice)
      → else → openAiFirstCompanionPath (RESTORE)
            → build retrieval hints (health/grief/memory/RACL — facts only)
            → openai.chat.completions.create OR reasonFirstComposer if BUDDY_RUNTIME=reason_first
            → optional doctrineBoundaryValidator (post-compose)
            → finalizeBuddyResponse (session log, memory — unchanged)
      → activeConversation: update summary for context ONLY, never resolveRouteKey
```

```text
BUDDY_RUNTIME=reason_first  →  same OpenAI-first policy; composer uses retrievalEvidencePack, not health templates
BUDDY_RUNTIME=legacy        →  default OpenAI-first (NOT masterBuddyRuntime)
```

---

## Implementation phases (after approval)

### Phase 0 — Preconditions (no code)

- [ ] Confirm production deploy commit (likely `e5d388e`, not dirty tree with untracked gates).  
- [ ] Set `OPENAI_API_KEY` on staging before regression script.  
- [ ] Change `public/chat.html` to per-user `userId` (ops; separate from this plan).  
- [ ] Clear contaminated `data/active-conversation-state.json` health rows for shared IDs.

### Phase 1 — Default path bypass (core)

| Task | File(s) | Action |
|------|---------|--------|
| 1.1 | `services/buddyBrain.js` | Add `runOpenAiFirstCompanionRuntime(H, …)` — restore `37c59c3`-style flow: enrich memory → build prompt → OpenAI → normalize → finalize. Extract from git `37c59c3:services/buddyBrain.js` as reference. |
| 1.2 | `services/buddyBrain.js` | `runBuddy`: `legacy` default calls **openAiFirst**, not `runMasterBuddyRuntime`. |
| 1.3 | `services/openAiFirstCompanionRuntime.js` (new) | Thin module: crisis already handled in brain; doctrine pre-check; OpenAI compose; loop guard. |
| 1.4 | `services/buddyBrain.js` | Gate: `runMasterBuddyRuntime` only when `BUDDY_USE_DOCTRINE_MASTER=1` or internal `isDoctrineOrHistoryMessage(message)` — **narrow detector**, not expanding routing table. |

**Doctrine detector (minimal, not new rules engine):** reuse existing `runDoctrineRuntimePipeline({ message }).intercepted`, `resolveSabbathCompanionIntent`, `detectRegistryStudyTopic` — same calls master used, without full route ownership.

### Phase 2 — Demote dangerous responders

| Task | File(s) | Action |
|------|---------|--------|
| 2.1 | `services/companionRetrievalHints.js` (new) | `buildCompanionHints({ message, userId })` → `{ health, grief, prayer, discernment, memory, activeTopicHint }` booleans/text only. |
| 2.2 | `healthCompanionResponse.js` | Export `classifyHealthCompanion` only for hints; **do not** call `buildHealthSupportResponse` from live path. |
| 2.3 | `griefCompanionResponse.js` | Same — classify only. |
| 2.4 | `companionDiscernmentResponder.js` | Remove or narrow `/what do I do/i` from **routing**; optional hint flag `userAskedWhatToDo`. |
| 2.5 | `masterBuddyRuntime.js` | **No default entry**; keep file for doctrine subset or mark deprecated. |

### Phase 3 — Active conversation demotion

| Task | File(s) | Action |
|------|---------|--------|
| 3.1 | `activeConversationManager.js` | Keep read for `buildCompanionHints` / prompt context. |
| 3.2 | `masterBuddyRuntime.js` / openAiFirst | **Never** call `resolveRouteKey({ followUp.inheritedTopic })` on companion path. |
| 3.3 | `recordConversationState` | Optional: write `topic` as soft metadata only after OpenAI turn (for reviewer), not before route. |

### Phase 4 — Keep validators & retrieval

| Component | Action |
|-----------|--------|
| `doctrineBoundaryValidator` | Run **after** compose on all paths (legacy + reason_first). |
| `retrievalEvidencePack` / RACL | Inject into composer context when `BUDDY_RUNTIME=reason_first` or `BUDDY_RACL_HINTS=1`; **never** short-circuit to template. |
| `answerMatchGate` / `responseContract` | **Leave disabled** on default path until OpenAI-first stable. |
| `reasoningSnapshot` | **Do not wire** into `runBuddy` default. |

### Phase 5 — Regression tests

Create **`scripts/openAiFirstRegressionTest.js`** (approved in Part E below).

Run:

```bash
OPENAI_API_KEY=... BUDDY_RUNTIME=legacy node scripts/openAiFirstRegressionTest.js
```

### Phase 6 — Report

Write **`OpenAIFirstRestorationReport.md`** with trace output, pass/fail table, before/after previews.

---

## PART E — Regression test specification

Script: **`scripts/openAiFirstRegressionTest.js`** (create when implementation approved).

| # | Test | Pass criteria |
|---|------|----------------|
| 1 | Relationship loss | `masterRoute` ≠ `health_support`; reply lacks “I'm not a doctor” / “flaring up again” |
| 2 | Correction after relationship | Not identical to prior template; OpenAI or non-health fallback |
| 3 | “I just want to talk…” | ≠ `health_support`; no health block |
| 4 | “Why are you broken?” | ≠ `health_support` |
| 5 | “Mom has Alzheimer's…” | ≠ `health_support`; ≠ generic job_discernment triplet unless caregiver discernment intended |
| 6 | “I'm going through grief what do I do?” | ≠ `job_discernment` OR equals grief-aware OpenAI (not Proverbs triplet-only) |
| 7 | Doctrine after grief session | Logos/Sabbath question answers doctrine; reply not grief opener |
| 8 | “What is a Sabbath day?” | Scripture-first / doctrine path OK; may include witness triplet |
| 9 | “My knees hurt again today” | Health handled compassionately (OpenAI or explicit health mode); allowed |
| 10 | Normal companion | `openAiCalled === true` for tests 1–4, 6–7 with API key |

Implementation notes:

- Unique `userId` per test; `clearActiveConversation` between tests.  
- Optional suite with **seeded** `activeConversation.topic=health` to ensure fix **does not** inherit (test 2b).  
- Export JSON to `docs/regression-trace/openai-first-results.json`.

---

## Effort estimate

| Phase | Effort | Risk |
|-------|--------|------|
| Phase 1 | 1–2 days | Med — touch `runBuddy` entry |
| Phase 2 | 0.5–1 day | Low |
| Phase 3 | 0.5 day | Low |
| Phase 4 | 0.5 day | Low |
| Phase 5 | 0.5 day | Low |
| **Total** | **~3–4 days** | Lower than full revert |

---

## What we explicitly will NOT do

- Add more `messageStartsNewTopic` keyword rules.  
- Tune health opener copy.  
- Expand `routeOwnershipTable`.  
- Default production to `reason_first` without OpenAI-first guard.  
- Beta enablement work.  
- Deploy/push in this task.

---

## Approval checklist

Reply **approve implementation** to proceed with:

1. `services/openAiFirstCompanionRuntime.js` + `buddyBrain.runBuddy` switch  
2. Responder demotion (hints only)  
3. `scripts/openAiFirstRegressionTest.js`  
4. `OpenAIFirstRestorationReport.md`  

Until then: **only** `ArchitectureRollbackAnalysis.md` and this plan exist.

---

## Rollback of the restoration

If restoration regresses Sabbath:

- Env `BUDDY_OPENAI_FIRST=0` → temporary restore `runMasterBuddyRuntime` while fixing doctrine detector scope.

---

## Summary

| Item | Decision |
|------|----------|
| Strategy | **Option 3** — OpenAI-first default; doctrine/history via narrow handler |
| masterBuddyRuntime | **Bypass** default |
| activeConversationManager | **Hints only** |
| routeOwnershipTable | **Remove** from companion path |
| health/grief/job responders | **Retrieval only** |
| RACL | **Retrieval only** |
| doctrineBoundaryValidator | **Keep** post-compose |
| Tests | **Pending approval** |
