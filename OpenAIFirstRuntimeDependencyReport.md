# OpenAI-First Runtime Dependency Report

**Date:** 2026-06-06  
**Deploy commit:** `57b3f96`  
**Goal:** Ensure next deploy does not fail on the next missing module after `answerVerifier` is added.  
**Audit artifact:** `docs/regression-trace/openai-first-dependency-audit.json`  
**Scope:** No code changes, deploy, or push.

---

## 1. Hot-path entry points audited

| File | Role | In `57b3f96`? |
|------|------|---------------|
| `routes/buddy.js` | HTTP `/buddy/chat` | Yes |
| `services/buddyBrain.js` | `runBuddy` → `openAiFirstCompanionRuntime` | Yes |
| `services/openAiFirstCompanionRuntime.js` | Sole runtime | Yes |
| `services/reasonFirstComposer.js` | OpenAI compose | Yes |
| `services/doctrineBoundaryValidator.js` | `validateReasonFirstReply` | Yes |

**Local-only additions (not on Render at `57b3f96`):**

| File | Notes |
|------|-------|
| `routes/buddy.js` | Local diff adds `liveResponseCapture` require |
| `services/liveResponseCapture.js` | Untracked — would break route load if buddy.js diff deployed without it |

---

## 2. Module load order (`openAiFirstCompanionRuntime.js`)

At **57b3f96** (top-level `require` order):

| Order | Module | Missing dep? |
|-------|--------|--------------|
| 1 | `runtimeOrchestrator` | No |
| 2 | `retrievalEvidencePack` | No |
| 2a | ↳ `sabbathHistoryDeepResponder` (via pack) | No — **no `metaAnswerResponder` at 57b3f96** |
| 3 | `reasonFirstComposer` | — |
| 3a | ↳ `doctrineBoundaryValidator` | — |
| 3b | ↳ ↳ **`answerVerifier`** | **YES — Render crash** |
| 4 | `doctrineBoundaryValidator` (direct) | Same as 3b |
| 5+ | guards, polish, sanitizers | No |

**Render fails at step 3b** before any request handler runs.

---

## 3. Full transitive audit (115 modules visited)

Automated walk from hot roots: `scripts/openAiFirstDependencyAudit.js`

### CRITICAL untracked on hot path

| File | Status | Blocks |
|------|--------|--------|
| `services/answerVerifier.js` | Untracked | `doctrineBoundaryValidator` load — **current** |
| `services/metaAnswerResponder.js` | Untracked | `answerVerifier` load — **next** |

### LOW risk untracked (not in `57b3f96` buddy route)

| File | Status | Notes |
|------|--------|-------|
| `services/liveResponseCapture.js` | Untracked | Only if local `routes/buddy.js` instrumentation is committed |

### False positive in audit script

| File | Note |
|------|------|
| `services/evidenceCards.js` | Script looks for `.js` file; actual module is **`services/evidenceCards/index.js`** — **tracked in git** |

---

## 4. Per-layer dependency check

### `routes/buddy.js` (57b3f96)

| Require | Tracked |
|---------|---------|
| `../services/buddyBrain` | Yes |
| `../services/coreRestorationDebug` | Yes |
| `../services/liveRequestTrace` | Yes |

### `buddyBrain.js` → `runBuddy` (57b3f96)

| Require | Tracked |
|---------|---------|
| `./openAiFirstCompanionRuntime` (dynamic) | Yes |

*Note: `buddyBrain.js` imports many legacy modules at top level, but `runBuddy` only calls `openAiFirstCompanionRuntime`. Legacy imports are still loaded at process start — all tracked in git at 57b3f96.*

### `openAiFirstCompanionRuntime.js`

| Require | Tracked | Missing transitive |
|---------|---------|-------------------|
| `./runtimeOrchestrator` | Yes | — |
| `./retrievalEvidencePack` | Yes | — |
| `./reasonFirstComposer` | Yes | → `answerVerifier` **missing** |
| `./doctrineBoundaryValidator` | Yes | → `answerVerifier` **missing** |
| `./companionReplyPolish` | Yes | — |
| `./runtimeResponseSanitizer` | Yes | — |
| `./runtimeLabelStripper` | Yes | — |
| `./coreRestorationDebug` | Yes | — |
| `./coreResponseGuards` | Yes | — |
| `./ownershipAntiOverrideGuard` | Yes | — |
| `./directnessGuard` | Yes | — |
| `./forbiddenProseGuard` | Yes | — |

### `reasonFirstComposer.js`

| Require | Tracked | Missing transitive |
|---------|---------|-------------------|
| `./openaiClient` | Yes | — |
| `./buddyBrain` | Yes | — |
| `./runtimeOrchestrator` | Yes | — |
| `./doctrineBoundaryValidator` | Yes | → **`answerVerifier`** |
| `./listeningSpecificityValidator` | Yes | — |
| `./companionReplyPolish` | Yes | — |
| `./runtimeResponseSanitizer` | Yes | — |
| `./runtimeLabelStripper` | Yes | — |
| `./goldenCompanionExamples` | Yes | — |
| `./emotionalCenter` | Yes | — |
| `./emotionalCenterValidator` | Yes | — |
| `./coreResponseGuards` | Yes | — |

### `doctrineBoundaryValidator.js`

| Require | Tracked | Missing |
|---------|---------|---------|
| `./doctrineBoundaries` | Yes | — |
| `./answerVerifier` | **Importer yes** | **Target NO** |
| `./listeningSpecificityValidator` | Yes | — |
| `./ownershipAntiOverrideGuard` | Yes | — |

### `retrievalEvidencePack.js` (loaded before composer)

Key requires — all tracked at `57b3f96`:

- `evidenceCards/index.js` ✓
- `scriptureDiscoveryEngine.js` ✓
- `concordanceFoundation.js` ✓
- `currentMessageIntent.js` ✓
- `sabbathHistoryDeepResponder.js` ✓ (no `metaAnswerResponder` at 57b3f96)

---

## 5. Untracked `services/*.js` files (23 total) — hot-path relevance

| Untracked file | Reachable from OpenAI-first? |
|----------------|------------------------------|
| **`answerVerifier.js`** | **Yes — CRITICAL** |
| **`metaAnswerResponder.js`** | **Yes — CRITICAL (via answerVerifier)** |
| `liveResponseCapture.js` | Only if local route instrumentation deployed |
| `answerMatchGate.js` | No (`masterBuddyRuntime`) |
| `companionPostureValidator.js` | No |
| `responseContract.js` | No |
| `reasonFirstBuddyRuntime.js` | No (not wired to `runBuddy`) |
| `shadowReasonFirstRuntime.js` | No |
| `minimalReasonFirstRuntime.js` | No |
| `reasonFirstLiteRuntime.js` | No |
| `bibleBuddyLiteRuntime.js` | No |
| Experiment / beta / classifier files | No |

---

## 6. Local workspace drift warning

Uncommitted changes **not on Render** but dangerous if pushed piecemeal:

| File | Change | Risk if committed alone |
|------|--------|-------------------------|
| `services/sabbathHistoryDeepResponder.js` | Adds `require('./metaAnswerResponder')` | **CRASH** on `retrievalEvidencePack` load |
| `routes/buddy.js` | Adds `require('./liveResponseCapture')` | **CRASH** on route load |

**At `57b3f96` on Render:** neither diff is present — only `answerVerifier` is missing.

---

## 7. Deploy sequence prediction

| Step | Action | Result on Render |
|------|--------|------------------|
| Current | `57b3f96` | `Cannot find module './answerVerifier'` |
| Add only `answerVerifier.js` | commit + deploy | `Cannot find module './metaAnswerResponder'` |
| Add `answerVerifier.js` + `metaAnswerResponder.js` | commit + deploy | **Hot path should load** (verify with `require` smoke test) |
| Also commit local `sabbathHistoryDeepResponder` without `metaAnswerResponder` | — | Would still need `metaAnswerResponder` (same file) |

---

## 8. Pre-push verification commands (documentation only)

```bash
# Confirm both modules tracked
git ls-files services/answerVerifier.js services/metaAnswerResponder.js

# Load-chain smoke tests
node -e "require('./services/answerVerifier'); console.log('answerVerifier OK')"
node -e "require('./services/doctrineBoundaryValidator'); console.log('doctrineBoundaryValidator OK')"
node -e "require('./services/reasonFirstComposer'); console.log('reasonFirstComposer OK')"
node -e "require('./services/openAiFirstCompanionRuntime'); console.log('openAiFirstCompanionRuntime OK')"

# Optional: emergency regression (needs OPENAI_API_KEY)
node scripts/emergencyHardCutoverRegression.js
```

---

## 9. Conclusion

| Question | Answer |
|----------|--------|
| Only missing module? | **No** — need **`answerVerifier.js` + `metaAnswerResponder.js`** |
| Other OpenAI-first missing modules at `57b3f96`? | **None identified** in 115-module walk |
| Next failure after partial fix? | **`./metaAnswerResponder`** |
| Evidence cards / concordance missing? | **No** — `evidenceCards/index.js` is tracked |

---

**STOP — report only.**

**End of report.**
