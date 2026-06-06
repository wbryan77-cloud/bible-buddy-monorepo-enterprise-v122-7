# Deploy Parity Implementation Plan

**Date:** 2026-06-05  
**Priority:** CRITICAL  
**Goal:** Bring Render into parity with the passing local hard-cutover stack  
**Mode:** Plan + verification only — **no deploy, no push, no doctrine/evidence/concordance changes**

---

## Executive summary

Local hard-cutover is **wired and active** in the workspace. Git `HEAD` / `origin/main` still runs **`masterBuddyRuntime`**. The entire OpenAI-first stack is **mostly untracked** — Render cannot run it until files are committed, pushed, and deployed.

| Check | Local workspace | Git `HEAD` / Render today |
|-------|-----------------|---------------------------|
| `runBuddy` routes to | `openAiFirstCompanionRuntime` | `masterBuddyRuntime` |
| `openAiFirstCompanionRuntime.js` | Exists | **Missing** |
| Hard-cutover guards | Active | **Absent** |
| `render.yaml` cutover env | Declared (local diff) | **Not declared** |
| Regression 18/18 | Passes | N/A until deploy |

---

## Task 1 — Hard-cutover files: exists & wired

| File | Exists locally | Imported | Active in live path |
|------|----------------|----------|-------------------|
| `services/openAiFirstCompanionRuntime.js` | ✅ | `buddyBrain.js` → `require('./openAiFirstCompanionRuntime')` | ✅ sole `runBuddy` target |
| `services/currentMessageIntent.js` | ✅ | `retrievalEvidencePack.js` | ✅ evidence + composer guidance |
| `services/directnessGuard.js` | ✅ | `openAiFirstCompanionRuntime.js` → `evaluateDirectness` | ✅ pre-return regen |
| `services/forbiddenProseGuard.js` | ✅ | `openAiFirstCompanionRuntime.js`, `liveRequestTrace.js` | ✅ detect + strip + regen |
| `scripts/emergencyHardCutoverRegression.js` | ✅ | standalone battery | ✅ validation only |

### Dependency chain (required runtime path)

```
POST /buddy/chat
  routes/buddy.js
    services/buddyBrain.runBuddy()
      services/openAiFirstCompanionRuntime.runOpenAiFirstCompanionRuntime()
        services/retrievalEvidencePack.buildRetrievalEvidencePack()
          services/currentMessageIntent.classifyCurrentMessageIntent()
        services/reasonFirstComposer.composeReasonFirstReply()
        services/ownershipAntiOverrideGuard.validateOwnershipReply()
        services/directnessGuard.evaluateDirectness()
        services/forbiddenProseGuard.detectForbiddenProse()
        services/coreResponseGuards.buildConnectionErrorReply()  [API failure only]
      services/buddyBrain.finalizeBuddyResponse()
        skipRelationshipEnrichment / skipStudyPrompts (BUDDY_TEMPLATE_PROSE≠1)
```

---

## Task 2 — Deployment parity checklist

Legend: **Committed** = tracked in git at `HEAD` after commit; **Pushed** = on `origin/main`.

### Core cutover (must ship)

| File | Exists | Committed | Pushed | Imported | Active |
|------|--------|-----------|--------|----------|--------|
| `services/openAiFirstCompanionRuntime.js` | ✅ | ❌ | ❌ | ✅ buddyBrain | ✅ |
| `services/reasonFirstComposer.js` | ✅ | ❌ | ❌ | ✅ openAiFirst | ✅ |
| `services/retrievalEvidencePack.js` | ✅ | ❌ | ❌ | ✅ openAiFirst | ✅ |
| `services/currentMessageIntent.js` | ✅ | ❌ | ❌ | ✅ retrievalEvidencePack | ✅ |
| `services/directnessGuard.js` | ✅ | ❌ | ❌ | ✅ openAiFirst | ✅ |
| `services/forbiddenProseGuard.js` | ✅ | ❌ | ❌ | ✅ openAiFirst | ✅ |
| `services/ownershipAntiOverrideGuard.js` | ✅ | ❌ | ❌ | ✅ openAiFirst, buddyBrain | ✅ |
| `services/coreResponseGuards.js` | ✅ | ❌ | ❌ | ✅ openAiFirst | ✅ |
| `services/coreRestorationDebug.js` | ✅ | ❌ | ❌ | ✅ openAiFirst, routes/buddy | ✅ |
| `services/buddyRuntimeConfig.js` | ✅ | ❌ | ❌ | ✅ server.js | ✅ |
| `services/liveRequestTrace.js` | ✅ | ❌ | ❌ | ✅ routes/buddy | ✅ |
| `services/buddyBrain.js` | ✅ | ⚠️ modified | ❌ | entry | ✅ local / ❌ HEAD |
| `routes/buddy.js` | ✅ | ⚠️ modified | ❌ | server mount | ✅ local / ❌ HEAD |
| `server.js` | ✅ | ⚠️ modified | ❌ | startup diagnostics | ✅ local / ❌ HEAD |
| `render.yaml` | ✅ | ⚠️ modified | ❌ | Render blueprint | ✅ local / ❌ HEAD |
| `scripts/emergencyHardCutoverRegression.js` | ✅ | ❌ | ❌ | — | ✅ |
| `scripts/deployParityVerification.js` | ✅ | ❌ | ❌ | — | ✅ |

### Supporting (cutover depends on — also untracked)

| File | Role |
|------|------|
| `services/doctrineBoundaryValidator.js` | `validateReasonFirstReply` |
| `services/doctrineEvidenceSnippets.js` | Evidence-only snippets (not prose author) |
| `services/answerGuidance.js` | Composer guidance facts |
| `services/correctionLedger.js` | Correction repair context |
| `services/reasoningSnapshot.js` | Understanding snapshot |
| `services/evidenceCards/*` | Phase 1 evidence (no doctrine change in this plan) |
| `services/concordanceFoundation.js` | Concordance hints |
| `services/scriptureDiscoveryEngine.js` | Discovery reinforcement |

### Modified on HEAD branch but not cutover-complete

| File | Local change | HEAD still has |
|------|--------------|----------------|
| `services/buddyBrain.js` | `runOpenAiFirstCompanionRuntime` only | `runMasterBuddyRuntime` only |
| `services/personalizedFallback.js` | study fallback gated | full study speaker |
| `services/masterBuddyRuntime.js` | local edits | **still present and used on HEAD** |

---

## Task 3 — `runBuddy` routing documentation

### Local workspace (current disk)

```javascript
// services/buddyBrain.js (local)
if (process.env.BUDDY_OPENAI_FIRST === '0' || BUDDY_RUNTIME === 'reason_first') {
  console.warn('... disabled by hard cutover — using openAiFirstCompanionRuntime.');
}
const { runOpenAiFirstCompanionRuntime } = require('./openAiFirstCompanionRuntime');
return runOpenAiFirstCompanionRuntime(H, inputOrUserId, modeArg, personaKeyArg, messageArg);
```

**Routes to:** `openAiFirstCompanionRuntime` → `reasonFirstComposer` (OpenAI)  
**masterBuddyRuntime:** not called (warn-only if env tries legacy bypass)

### Git `HEAD` / `origin/main` (what Render runs today)

```javascript
// services/buddyBrain.js (HEAD)
const { runMasterBuddyRuntime } = require('./masterBuddyRuntime');
return runMasterBuddyRuntime(H, ...);
```

**Routes to:** `masterBuddyRuntime` → `generateAnswer` → template responders  
**openAiFirstCompanionRuntime:** file does not exist in repository

---

## Section A — Files missing from git (untracked)

These exist locally but are **not in `HEAD`**:

- `services/openAiFirstCompanionRuntime.js`
- `services/reasonFirstComposer.js`
- `services/retrievalEvidencePack.js`
- `services/currentMessageIntent.js`
- `services/directnessGuard.js`
- `services/forbiddenProseGuard.js`
- `services/ownershipAntiOverrideGuard.js`
- `services/coreResponseGuards.js`
- `services/coreRestorationDebug.js`
- `services/buddyRuntimeConfig.js`
- `services/liveRequestTrace.js`
- `services/doctrineBoundaryValidator.js`
- `services/doctrineEvidenceSnippets.js`
- `services/answerGuidance.js`
- `services/correctionLedger.js`
- `services/reasoningSnapshot.js`
- `services/evidenceCards/` (directory)
- `services/concordanceFoundation.js`
- `services/scriptureDiscoveryEngine.js`
- `scripts/emergencyHardCutoverRegression.js`
- `scripts/deployParityVerification.js`
- `scripts/liveRuntimeVerification.js`
- (plus other experiment/validation scripts — not required for minimal deploy)

---

## Section B — Files modified locally but uncommitted

Tracked files with local diffs vs `HEAD`:

| File | Cutover relevance |
|------|-------------------|
| `services/buddyBrain.js` | **Critical** — router lock to openAiFirst |
| `routes/buddy.js` | Live trace + connection-error normalize |
| `server.js` | `logStartupDiagnostics()` on listen |
| `render.yaml` | Standard plan + cutover env vars |
| `public/chat.html` | Per-user localStorage id |
| `services/personalizedFallback.js` | Study fallback gate |
| `services/activeConversationManager.js` | Conversation state |
| `services/questionIntentResolver.js` | Intent (master path still uses on HEAD) |
| `services/masterBuddyRuntime.js` | Local edits (should remain unused after cutover) |
| `services/sabbathHistoryDeepResponder.js` | Local edits |
| Others | Lower priority for parity |

---

## Section C — Required imports

| Consumer | Must import |
|----------|-------------|
| `buddyBrain.js` | `./openAiFirstCompanionRuntime`, `./ownershipAntiOverrideGuard` |
| `openAiFirstCompanionRuntime.js` | `./retrievalEvidencePack`, `./reasonFirstComposer`, `./directnessGuard`, `./forbiddenProseGuard`, `./ownershipAntiOverrideGuard`, `./coreResponseGuards`, `./coreRestorationDebug` |
| `retrievalEvidencePack.js` | `./currentMessageIntent`, `./answerGuidance`, evidence card modules |
| `reasonFirstComposer.js` | `./doctrineBoundaryValidator`, `./coreResponseGuards` |
| `routes/buddy.js` | `./liveRequestTrace`, `./coreRestorationDebug` |
| `server.js` | `./buddyRuntimeConfig` |

---

## Section D — Required runtime path

Production normal flow after deploy:

1. `POST /buddy/chat`
2. `runBuddy` → **only** `runOpenAiFirstCompanionRuntime`
3. `buildRetrievalEvidencePack` with `routingHintsOnly: true` + `currentMessageIntent`
4. `composeReasonFirstReply` (OpenAI authors final prose)
5. `validateOwnershipReply` + `evaluateDirectness` + `detectForbiddenProse` (+ one regen if needed)
6. `finalizeBuddyResponse` with enrichment skipped (`BUDDY_TEMPLATE_PROSE=0`)

**Must NOT run on normal turns:** `runMasterBuddyRuntime`, `presentCompanionDoctrine`, `buildScriptureWitnessBlock` as final speaker, `buildPersonalizedFallback` study lines, `sabbathHistoryDeepResponder` as final speaker.

---

## Section E — Required environment variables

| Variable | Required value | Local `render.yaml` | HEAD `render.yaml` |
|----------|----------------|---------------------|-------------------|
| `NODE_ENV` | `production` | ✅ | ✅ |
| `OPENAI_API_KEY` | set (secret) | ✅ sync:false | ❌ not declared |
| `BUDDY_RUNTIME` | `legacy` | ✅ | ❌ |
| `BUDDY_TEMPLATE_PROSE` | `0` | ✅ | ❌ |
| `BUDDY_DISABLE_STUDY_FALLBACK` | `1` | ✅ | ❌ |
| `BUDDY_OPENAI_FIRST` | unset or `1` | unset (defaults on) | unset |
| `BUDDY_DEBUG` | `1` (recommended for proof) | ✅ | ❌ |
| `BUDDY_LIVE_TRACE` | `1` (recommended) | ✅ | ❌ |
| Instance plan | `standard` (2GB) | ✅ local diff | ❌ `free` on HEAD |

---

## Verification

Run:

```bash
BUDDY_RUNTIME=legacy BUDDY_TEMPLATE_PROSE=0 BUDDY_DISABLE_STUDY_FALLBACK=1 BUDDY_DEBUG=1 \
node scripts/deployParityVerification.js
```

Output: `docs/regression-trace/deploy-parity-verification.json`

Post-deploy (future): re-run + `scripts/emergencyHardCutoverRegression.js` against live URL with `BUDDY_LIVE_TRACE=1` and confirm `runtimeUsed=core_openai_first`, `finalAnswerAuthor=openai`.

---

## Recommended commit/deploy sequence (when approved — not executed here)

1. Stage all core cutover files (Section A + Section B critical paths).
2. Commit with message describing deploy parity / hard cutover.
3. Push to `origin/main` (triggers Render autoDeploy if configured).
4. Confirm Render dashboard env matches Section E.
5. Tail logs for `=== BibleBuddy Runtime Startup ===` block.
6. Run `deployParityVerification.js` and `emergencyHardCutoverRegression.js`.
7. Browser test with fresh `userId`; inspect `liveRequestTrace` on response.

---

## Stop condition

Plan and verification script complete. **No deploy. No push. No doctrine changes.**
