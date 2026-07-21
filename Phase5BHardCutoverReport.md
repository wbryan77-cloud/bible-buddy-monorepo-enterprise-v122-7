# Phase 5B Hard Cutover Report

**Date:** 2026-06-01  
**Status:** Root cause identified — incomplete deploy (untracked modules), not wrong route wiring

---

## Exact Fallback Source

| Field | Value |
|-------|--------|
| **File** | `services/responseGuarantee.js` |
| **Constant** | `COMPANION_SAFE_FALLBACK` |
| **Function** | `buildCompanionEmergencyReply()` |
| **Trigger** | `withBuddyChatGuarantee()` catch block when `runBuddy()` throws |
| **User text** | "I want to stay with you on this. Could you ask your question again in one short sentence?" |

**Only this file contains the exact fallback text** (repo-wide grep).

---

## Why Live Render Hit Fallback (Production Evidence)

`GET /api/runtime-health` on Render (`bible-buddy-monorepo-enterprise-v122-7.onrender.com`) showed:

```
recentErrors: "Cannot find module './directAnswerFormatter'"
Require stack: .../services/openAiFirstCompanionRuntime.js
errors: 11
```

Live `POST /buddy/chat` with "Can we eat pork?" returned the short-sentence fallback.

**Root cause:** `openAiFirstCompanionRuntime.js` requires `directAnswerFormatter.js` at module load (line 29). That file exists locally but is **not tracked in git** — Render deploy from `origin/main` does not include it.

### Untracked modules required for live path (git status)

| File | Tracked? |
|------|----------|
| `services/directAnswerFormatter.js` | **NO** — causes Render crash |
| `services/bibleConceptConcordance.js` | **NO** |
| `services/bibleWideReasoningEngine.js` | **NO** |
| `services/userCorrectionMemory.js` | **NO** |

Phase 5A orchestrator modules (`bibleCompanionOrchestrator.js`, etc.) are tracked and on Render, but the runtime throws before orchestrator runs because `openAiFirstCompanionRuntime` fails to load dependencies.

---

## Route Owner Before Fix

Route wiring was **already correct** — no wrong runtime selected:

```
POST /buddy/chat
  → routes/buddy.js (router.post('/chat'))
  → handleBuddyChat()
  → withBuddyChatGuarantee(() => runBuddy(...))
  → buddyBrain.runBuddy()
  → openAiFirstCompanionRuntime (hard cutover — not masterBuddyRuntime)
  → [THROW on require directAnswerFormatter — orchestrator never reached]
  → responseGuarantee catch → COMPANION_SAFE_FALLBACK
```

`masterBuddyRuntime` and `reasonFirstBuddyRuntime` are **not** used by `/buddy/chat`.

---

## Route Owner After Fix (unchanged path, added verification + loud errors)

```
POST /buddy/chat
  → routes/buddy.js
  → withBuddyChatGuarantee
  → runBuddy → openAiFirstCompanionRuntime
  → bibleCompanionOrchestrator FIRST
  → strict / bible-wide / companion specialists
  → responseGuarantee (only on throw/timeout)
```

### Code changes (Phase 5B)

| File | Change |
|------|--------|
| `services/buddyLivePathVerifier.js` | **NEW** — startup module manifest for live path |
| `services/responseGuarantee.js` | `recordRouteFallback`, error codes, route metadata on fallback |
| `services/runtimeHealthMonitor.js` | `recordRouteFallback()` export |
| `routes/runtimeHealth.js` | `GET /api/runtime-health?trace=1` — git commit, module manifest |
| `services/buddyRuntimeConfig.js` | Reflect buddyBrain hard cutover in diagnostics |
| `server.js` | Startup CRITICAL log if live-path modules missing |
| `scripts/traceLiveBuddyRoute.js` | **NEW** — route trace script |
| `scripts/runPhase5BLiveHttpRegression.js` | **NEW** — real HTTP regression |

No corpus, doctrine packs, evidence cards, witness chains, or package.json changes.

---

## Bypasses Phase 5A?

Yes — when `runBuddy` throws at module load, orchestrator never executes. `responseGuarantee` returns generic fallback **before** any Phase 5A logic runs. This is a deploy gap, not an orchestration bug.

---

## Deploy Action Required (not performed)

To fix Render live chat, commit and deploy these untracked service files:

1. `services/directAnswerFormatter.js` (blocking)
2. `services/bibleConceptConcordance.js`
3. `services/bibleWideReasoningEngine.js`
4. `services/userCorrectionMemory.js`

After deploy, verify:

```bash
curl -s 'https://your-app.onrender.com/api/runtime-health?trace=1' | jq '.trace.ok, .trace.missingModules'
curl -s -X POST https://your-app.onrender.com/buddy/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"Can we eat pork?"}' | jq '.reply.reply[:80]'
```

---

## Regression Results (Local)

| Suite | Result |
|-------|--------|
| Phase 5B route trace | 6/6 OK, manifest OK |
| Phase 5B HTTP regression | 6/6 PASS |
| Phase 5A orchestration | 11/11 PASS |
| Phase 4O | 12/12 PASS |
| Phase 4N | 8/8 PASS |
| Phase 4M | 15/15 PASS |
| Phase 4H | 28/28 PASS |

---

## Safe for Controlled Deploy

**Yes — after including untracked live-path modules in the deploy commit.**

Until those files ship, Render will continue returning the short-sentence fallback regardless of orchestrator code on the server.

---

## Fail Loud Improvements

On fallback, `responseGuarantee` now:

- Logs `errorCode` (`MODULE_LOAD_ERROR`, `CHAT_TIMEOUT`, `RUNTIME_ERROR`)
- Records `recordRouteFallback` in `runtimeHealthMonitor.recentErrors`
- Sets `reply.runtime.masterRoute = 'response_guarantee_fallback'`
- Sets `reply.runtime.fallbackErrorCode` and `reply.runtime.routeOwner`

Server startup logs **CRITICAL** if manifest verification fails.
