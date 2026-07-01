# Reason-First Restoration Check

Generated: 2026-06-02  
**Pre–Listening 7.5 gate** — audit only. No restoration performed. No implementation.

---

## Answer

### **A. Nothing to restore — Lite changes are isolated.**

No Lite experiment removals were applied to shared production or current RACL reason-first code. Nothing was altered outside `services/reasonFirstLiteRuntime.js` and `scripts/reasonFirstLiteExperiment.js` for the purpose of the simplification experiment.

---

## Question 1 — Were Lite removals applied to shared production / reason-first code?

**No.**

| Area | Lite touched shared code? | Evidence |
|------|---------------------------|----------|
| Production default (`BUDDY_RUNTIME=legacy`) | **No** | `buddyBrain.runBuddy` dispatches to `masterBuddyRuntime` when unset or `legacy` |
| Reason-first path (`BUDDY_RUNTIME=reason_first`) | **No** | Dispatches only to `reasonFirstBuddyRuntime` → `composeReasonFirstReply` |
| `buddyBrain` wiring for Lite | **No** | No `require('./reasonFirstLiteRuntime')` anywhere in `buddyBrain.js` |
| Git: new Lite-only files | **Yes (isolated)** | `?? services/reasonFirstLiteRuntime.js`, `?? scripts/reasonFirstLiteExperiment.js` |
| Git: shared RF composer/validator diff vs HEAD | **None** | `reasonFirstComposer.js`, `doctrineBoundaryValidator.js`, `reasonFirstBuddyRuntime.js`, `runtimeOrchestrator.js`, `answerMatchGate.js`, `responseContract.js` — no diff from HEAD for Lite work |

`buddyBrain.js` has uncommitted changes from **reason-first migration** (`BUDDY_RUNTIME=reason_first` → `runReasonFirstBuddyRuntime`). That predates Lite and does not reference Lite.

---

## Question 2 — Shared components altered outside isolated Lite runtime?

**No.** Each item below remains on the **current RACL reason-first** path as implemented before the Lite experiment.

### `buildRuntimeInstructions`

| | |
|---|---|
| **Shared file** | `services/runtimeOrchestrator.js` — unchanged for Lite |
| **Reason-first usage** | `services/reasonFirstComposer.js` line 32: `buildRuntimeInstructions(runtimeContext)` passed into `buildSystemPrompt` |
| **Lite usage** | **Not called** — Lite uses `buildLiteSystemPrompt()` inside `reasonFirstLiteRuntime.js` only |

### `responseContract`

| | |
|---|---|
| **Shared file** | `services/responseContract.js` — not modified for Lite |
| **Reason-first usage** | Via `answerMatchGate.matchAnswerToSnapshot` → `validateResponseContract` on meta/correction turns |
| **Lite usage** | **Not imported or called** |

### `answerMatchGate`

| | |
|---|---|
| **Shared file** | `services/answerMatchGate.js` — not modified for Lite |
| **Reason-first usage** | `doctrineBoundaryValidator.validateAnswerMatch` → `matchAnswerToSnapshot` |
| **Lite usage** | **Not used** |

### `doctrineBoundaryValidator`

| | |
|---|---|
| **Shared file** | `services/doctrineBoundaryValidator.js` — **full validator intact** |
| **Reason-first usage** | `validateReasonFirstReply` (doctrine + answerMatch + loopControl + regen hints) via `reasonFirstComposer.js` |
| **Lite usage** | Imports **`validateDoctrineBoundaries` only** (read-only subset; does not change shared behavior for RF) |

Exports on shared module (all still present):

- `validateDoctrineBoundaries`
- `validateAnswerMatch`
- `validateLoopControl`
- `validateReasonFirstReply`

### Normalization chain

| | |
|---|---|
| **Reason-first path** | `normalizeStructured` → `validateReasonFirstReply` → **`lightPolish`** (`polishCompanionReply` + `sanitizeDoctrineResponse` + `stripInternalRuntimeLabels`) in `reasonFirstComposer.js` |
| **Lite path** | `safeJsonParse` only; **no** polish/sanitize/strip in `reasonFirstLiteRuntime.js` |

### Overlap validation

| | |
|---|---|
| **Shared file** | `services/correctionLedger.js` — `replyViolatesLoopControl` unchanged for Lite |
| **Reason-first usage** | `doctrineBoundaryValidator.validateLoopControl` on correction turns |
| **Lite usage** | **Not called** |

### Regeneration logic

| | |
|---|---|
| **Reason-first** | Up to **3** attempts; `regenInstruction` from full `validateReasonFirstReply`; temperature **0.72** → **0.55** on retry (`reasonFirstComposer.js`) |
| **Lite** | Up to **2** attempts; **doctrine-only** regen in `composeReasonFirstLiteReply` inside Lite file only |

---

## Question 3 — Restore shared components?

**Not required.** Shared components were not removed or disabled for Lite.

---

## Question 4 — Isolation confirmation

All Lite removals exist **only** inside:

| File | Role |
|------|------|
| `services/reasonFirstLiteRuntime.js` | Alternate compose path: slim system prompt, capped scripture, doctrine-only validation, no polish/answerMatch/loop regen |
| `scripts/reasonFirstLiteExperiment.js` | Test harness; calls `runReasonFirstLiteRuntime` directly |

**Nowhere else:**

- Not in `buddyBrain.js`
- Not in `reasonFirstBuddyRuntime.js`
- Not in `reasonFirstComposer.js`
- Not in `retrievalEvidencePack.js` (Lite uses the **same** `buildRetrievalEvidencePack` — no retrieval removals)
- Not in `doctrineBoundaryValidator.js`, `answerMatchGate.js`, or `responseContract.js`

Repo-wide search for `reasonFirstLite` / `runReasonFirstLiteRuntime` hits only the two files above plus experiment docs.

---

## Current RACL reason-first path (unchanged stack)

```
BUDDY_RUNTIME=reason_first
  → reasonFirstBuddyRuntime
    → buildRetrievalEvidencePack (RACL)
    → composeReasonFirstReply
        → buildSystemPrompt + buildRuntimeInstructions
        → COMPOSER_INSTRUCTION + RACL_ADDENDUM
        → evidence JSON in system
        → validateReasonFirstReply (doctrine + answerMatch + loopControl)
        → regen loop (max 3)
        → lightPolish
    → finalizeBuddyResponse (skipRelationshipEnrichment)
```

This is the stack validated at **6.3/10** human listening in `docs/racl/validation-results.json`.

---

## Related but separate test runtimes (not Lite experiment)

| File | Purpose | Wired to production? |
|------|---------|----------------------|
| `services/minimalReasonFirstRuntime.js` | Prompt hierarchy experiment | **No** |
| `services/bibleBuddyLiteRuntime.js` | BibleBuddy Lite baseline experiment | **No** |
| `services/reasonFirstLiteRuntime.js` | **This** simplification experiment | **No** |

None of these replace or patch shared reason-first modules.

---

## Gate for Listening 7.5

| Check | Status |
|-------|--------|
| Lite removals isolated | **PASS** |
| Shared RACL reason-first intact | **PASS** |
| Restoration required | **None** |
| Safe to proceed to Listening 7.5 design | **Yes** (subject to separate implementation plan) |

---

## Stop conditions

- No Listening 7.5 implementation in this check
- No deploy, push, or Sprint 3
- No code changes made during this audit
