# Phase 5C Production Fallback Root Cause Report

**Date:** 2026-06-14  
**Live URL:** `https://bible-buddy-monorepo-enterprise-v122-7.onrender.com`  
**Status:** Root cause confirmed — **not routing, not orchestrator logic — missing deployed files**

---

## Step 1 — Live Health Trace

**Command:** `curl -s 'https://bible-buddy-monorepo-enterprise-v122-7.onrender.com/api/runtime-health?trace=1'`

### recentErrors (exact)

```
Cannot find module './directAnswerFormatter'
Require stack:
- /opt/render/project/src/services/openAiFirstCompanionRuntime.js
```

(3 identical errors at 2026-06-14T05:59:09–05:59:22Z; reproduced again after further chat probes.)

### missingModules / trace block

Render response **does not include** `trace` object — `routes/runtimeHealth.js` Phase 5B `?trace=1` handler is **not deployed** on Render yet. Module manifest cannot be queried live until Phase 5B/5C server changes are pushed.

### route owner (from error stack)

```
POST /buddy/chat
  → routes/buddy.js → withBuddyChatGuarantee → runBuddy()
  → openAiFirstCompanionRuntime.js (line 29: require('./directAnswerFormatter'))
  → THROW MODULE_NOT_FOUND
  → responseGuarantee catch → COMPANION_SAFE_FALLBACK
```

Orchestrator **never runs** — failure is at **module load** inside `openAiFirstCompanionRuntime`.

### commit hash

| Ref | Hash | Notes |
|-----|------|-------|
| **Render (origin/main)** | `ce08268` | Phase 5A orchestration — **without** live-path modules |
| **Local HEAD** | `f2b8d19` | Adds 4 missing modules — **not pushed** |
| **Live trace gitCommit** | unavailable | `?trace=1` not deployed |

### Module load status on Render (inferred from thrown error)

| Module | On Render? |
|--------|------------|
| `directAnswerFormatter.js` | **NO** — exact missing module in stack |
| `bibleCompanionOrchestrator.js` | Likely yes (in ce08268) — never reached |
| `bibleConceptConcordance.js` | **NO** — not in origin/main |
| `bibleWideReasoningEngine.js` | **NO** — not in origin/main |
| `userCorrectionMemory.js` | **NO** — not in origin/main |

---

## Step 2 — Fallback Source (grep)

**Only one match in repo:**

| File | Function |
|------|----------|
| `services/responseGuarantee.js` | `COMPANION_SAFE_FALLBACK` → `buildCompanionEmergencyReply()` |

Triggered when `withBuddyChatGuarantee()` catch block runs after `runBuddy()` throws.

---

## Step 3 — Module Manifest Audit

**Script:** `scripts/runPhase5CModuleManifestAudit.js`  
**Output:** `Phase5CModuleManifestAudit.json`

**Local result:** 13/13 pass (all files exist, `require()` succeeds)

**NOT on origin/main (Render deploy source):**

1. `services/directAnswerFormatter.js` ← **blocking throw**
2. `services/bibleConceptConcordance.js`
3. `services/bibleWideReasoningEngine.js`
4. `services/userCorrectionMemory.js`
5. `services/buddyLivePathVerifier.js` (Phase 5B — staged, not yet committed)

---

## Step 4 — Untracked / Unpushed Live-Path Dependencies

### Unpushed commit (local only)

```
f2b8d19 Phase 5A missing live-path modules
  services/directAnswerFormatter.js    (+126)
  services/bibleConceptConcordance.js  (+275)
  services/bibleWideReasoningEngine.js (+196)
  services/userCorrectionMemory.js     (+200)
```

`git show origin/main:services/directAnswerFormatter.js` → **fatal: not in origin/main**

### Staged for next commit (Phase 5B/5C lockdown)

```
A  services/buddyLivePathVerifier.js
A  scripts/runPhase5CModuleManifestAudit.js
M  routes/runtimeHealth.js
M  server.js
M  services/responseGuarantee.js
```

---

## Why Render Fallback Fired Instantly

1. User sends `POST /buddy/chat`.
2. `runBuddy()` loads `openAiFirstCompanionRuntime.js`.
3. Top-level `require('./directAnswerFormatter')` throws **synchronously** — no orchestrator, no strict gate, no OpenAI.
4. `responseGuarantee` catches → returns short-sentence fallback in **~6ms** (matches `averageLatencyMs: 6` on live health).
5. `openAiCalls: 0`, `strictDoctrineCalls: 0` on Render — confirms engine never started.

**Not** timeout, not memory pressure, not doctrine logic — **deploy gap**.

---

## Exact Thrown Error

```
Error: Cannot find module './directAnswerFormatter'
Require stack:
- /opt/render/project/src/services/openAiFirstCompanionRuntime.js
- /opt/render/project/src/services/buddyBrain.js
- /opt/render/project/src/routes/buddy.js
- ...
```

## Exact Missing File

`services/directAnswerFormatter.js` (and three sibling modules also absent on origin/main)

---

## Step 6 — Local HTTP Regression

**Command:** `node -r dotenv/config scripts/runPhase5BLiveHttpRegression.js`  
(spins local server with full local module tree)

| Case | Result |
|------|--------|
| Can we eat pork? | PASS — starts "No." |
| Acts 10 | PASS |
| I had a bad day today. | PASS — companion |
| Can we have sex without marriage? | PASS — starts "No." |
| show me another verse about fornication? | PASS |
| kingdom-on-earth scriptures | PASS |

**6/6 PASS** — path works when files exist on disk.

---

## Exact Files Required to Commit + Push + Deploy

### Already in local commit `f2b8d19` (push required)

- `services/directAnswerFormatter.js` **(critical)**
- `services/bibleConceptConcordance.js`
- `services/bibleWideReasoningEngine.js`
- `services/userCorrectionMemory.js`

### Staged — include in next commit before deploy

- `services/buddyLivePathVerifier.js`
- `routes/runtimeHealth.js` (`?trace=1`)
- `server.js` (startup module verification)
- `services/responseGuarantee.js` (loud fallback logging)
- `scripts/runPhase5CModuleManifestAudit.js`

### Optional diagnostics (not required for chat fix)

- `scripts/traceLiveBuddyRoute.js`
- `scripts/runPhase5BLiveHttpRegression.js`

**No corpus, evidence, doctrine packs, witness chains, or package.json changes.**

---

## Tests Passed

| Test | Result |
|------|--------|
| Phase 5C module manifest audit | 13/13 local |
| Phase 5B HTTP regression | 6/6 |

---

## Safe to Deploy

**Yes — after push `f2b8d19` + Phase 5B/5C staged commit to origin/main and Render redeploy.**

Until push + deploy:

- Render will keep throwing `Cannot find module './directAnswerFormatter'`
- Every `/buddy/chat` will return the short-sentence fallback instantly

### Post-deploy verification

```bash
curl -s 'https://bible-buddy-monorepo-enterprise-v122-7.onrender.com/api/runtime-health?trace=1' | jq '.trace.ok, .trace.missingModules, .recentErrors[-1]'

curl -s -X POST 'https://bible-buddy-monorepo-enterprise-v122-7.onrender.com/buddy/chat' \
  -H 'Content-Type: application/json' \
  -d '{"message":"Can we eat pork?","testerId":"post-deploy-check"}' | jq '.reply.reply[:80]'
```

Expected: `trace.ok=true`, pork answer starts with "No.", no `directAnswerFormatter` in `recentErrors`.

---

## Summary

| Question | Answer |
|----------|--------|
| Exact thrown error | `Cannot find module './directAnswerFormatter'` |
| Exact missing file | `services/directAnswerFormatter.js` on Render |
| Why instant fallback | Sync throw at `openAiFirstCompanionRuntime` require — orchestrator never runs |
| Route owner | Correct (`openAiFirstCompanionRuntime`); deploy incomplete |
| Fix | Push `f2b8d19` + staged 5B/5C files, redeploy Render |
