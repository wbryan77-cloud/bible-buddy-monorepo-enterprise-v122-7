# Live Route Ownership Investigation

**Date:** 2026-06-05  
**Priority:** CRITICAL  
**Mode:** INVESTIGATION ONLY — no fixes, no deploy, no push  
**Question:** Why does the live Companion UI still produce witness/study/history template prose while the regression battery passes 18/18 with OpenAI?

---

## Executive finding

**The regression battery and the live Companion UI are not running the same code.**

| Surface | Runtime actually executed | Final prose author |
|---------|---------------------------|-------------------|
| `scripts/emergencyHardCutoverRegression.js` | Local **modified** `buddyBrain` → `openAiFirstCompanionRuntime` → `reasonFirstComposer` | OpenAI (with guards) |
| **Deployed** `origin/main` (Render) | `buddyBrain` → **`runMasterBuddyRuntime`** | Template responders (`presentCompanionDoctrine`, `scriptureWitnessEngine`, `personalizedFallback`, etc.) |
| Local `npm start` **if** workspace matches git `HEAD` | Same as Render | Same as Render |
| Local `npm start` **with uncommitted cutover files** | `openAiFirstCompanionRuntime` | OpenAI |

**Git evidence:**

- `HEAD` commit: `e5d388e Sprint 2.FINAL — Master Buddy Brain Consolidation`
- `git show HEAD:services/buddyBrain.js` ends with: `runMasterBuddyRuntime(...)` only
- `services/openAiFirstCompanionRuntime.js` **does not exist in `HEAD`** (`fatal: path exists on disk, but not in 'HEAD'`)
- Hard-cutover stack (`openAiFirstCompanionRuntime.js`, `reasonFirstComposer.js`, `currentMessageIntent.js`, `directnessGuard.js`, etc.) is **untracked / uncommitted**
- `origin/main` is aligned with `HEAD` — **nothing containing the cutover has been pushed**

**Conclusion:** Live UI symptoms (witness triplets, study continuation, Sabbath history on HOW) are **exactly what the deployed `masterBuddyRuntime` path is designed to produce**. Regression passing proves the **local cutover works**; it does not prove Render or a clean checkout runs it.

---

## Part A — Route ownership trace (`POST /buddy/chat`)

### Complete route map (both deployed and local-cutover)

```
Browser (public/chat.html | public/index.html | public/beta.html)
  POST /buddy/chat  { userId, mode, personaKey, message }
    │
    ▼
server.js
  express.json()
  express.static('public')
  app.use('/buddy', routes/buddy.js)     ← no auth middleware, no runtime middleware
    │
    ▼
routes/buddy.js
  router.post('/chat') → runBuddy(...)
  [local only] buildLiveRequestTrace + logLiveRequestTrace
    │
    ▼
services/buddyBrain.js  runBuddy()
  ┌─────────────────────────────────────────────────────────────┐
  │ DEPLOYED (HEAD): runMasterBuddyRuntime(H, ...)              │
  │ LOCAL CUTOVER:   runOpenAiFirstCompanionRuntime(H, ...)     │
  └─────────────────────────────────────────────────────────────┘
```

### Deployed path detail (`masterBuddyRuntime` — **what live Render runs today**)

```
runMasterBuddyRuntime
  ├─ classifySafety → crisis → buddyBrain.fallbackReply
  ├─ enrichRuntimeContextWithMemory (learning, relationship, study journey → runtimeContext.memory)
  ├─ getActiveConversation + resolveQuestionIntent + resolveFollowUpQuestion
  ├─ buildReasoningSnapshot → recommendedRoute
  ├─ resolveRouteKey / overrides (continue_study, memory_recall, health, grief, prayer, discernment)
  ├─ sabbathIntentRouter → routeKey = 'sabbath_history' (common for Sabbath threads)
  ├─ generateAnswer(routeKey)  ← TEMPLATE DISPATCH
  │    ├─ doctrine_general / sabbath_definition
  │    │     runDoctrineRuntimePipeline → sourceGroundedResponder prose
  │    │     presentCompanionDoctrine → scriptureWitnessEngine + study path blocks
  │    ├─ sabbath_history → buildSabbathHistoryResponse → sabbathHistoryDeepResponder
  │    ├─ registry_study → presentRegistryStudyResponse → witness block
  │    ├─ study_connection → buildStudyConnectionResponse ("You've been studying…")
  │    ├─ health/grief/prayer/discernment → *CompanionResponse + witness blocks
  │    └─ open_general → generateOpenAnswer (OpenAI JSON) OR personalizedFallback
  ├─ applyFallbackLoopGuard → buildPersonalizedFallback (study lines)
  ├─ finalizeBuddyResponse
  │    ├─ enrichResponseWithRelationshipIntelligence (prepend reflection, study journey)
  │    ├─ buildCompanionNextSteps
  │    └─ persistBuddyMemory → recordCompanionLearning, relationship memory, active conversation
  └─ return structured reply → routes/buddy.js → JSON to browser
```

### Local cutover path detail (uncommitted — **what regression runs**)

```
runOpenAiFirstCompanionRuntime
  ├─ crisis → buddyBrain.fallbackReply (exception)
  ├─ buildRetrievalEvidencePack (routingHintsOnly, currentMessageIntent, no template dispatch)
  ├─ composeReasonFirstReply → OpenAI JSON
  ├─ validateOwnershipReply + evaluateDirectness + forbiddenProseGuard → optional regen
  ├─ buildConnectionErrorReply if API fails (no study/witness fallback)
  ├─ finalizeBuddyResponse with skipRelationshipEnrichment + skipStudyPrompts
  └─ return (template responders never called; debug flags hard-false)
```

### Middleware summary

| Layer | Present? | Effect on runtime selection |
|-------|----------|----------------------------|
| `express.json` | Yes | None |
| Auth / API key gate | **No** | None |
| Runtime env middleware | **No** | Env read inside `buddyBrain` only |
| Route-level runtime switch | **No** | Single `runBuddy` entry |

**There is no HTTP-level switch.** Runtime is chosen entirely inside `buddyBrain.runBuddy()` — and that function differs between git `HEAD` and the local workspace.

---

## Part B — Phrase source trace

### Primary generators (prose authors — not detectors)

| Phrase | File | Function | How it reaches users (deployed) |
|--------|------|----------|--------------------------------|
| `establishes the matter` / `confirms it alongside Scripture` / `carries the theme forward` | `services/scriptureWitnessEngine.js` | `buildWitnessConnectionText` → `buildScriptureWitnessBlock` | Called by `companionDoctrinePresenter`, `registryStudyPresenter`, `griefCompanionResponse`, `healthCompanionResponse`, `prayerCompanionResponse`, `companionDiscernmentResponder`, `studyConnectionIntent` |
| `Witness path: A → B → C` | `services/scriptureWitnessEngine.js` | `buildScriptureWitnessBlock` L91-93 | Appended in `presentCompanionDoctrine` L350-354 |
| `Genesis-to-Revelation Study Path:` | `services/companionDoctrinePresenter.js` | `presentCompanionDoctrine` L394-401 | Appended when study mode not suppressed |
| `You've been studying ${label}` | `services/personalizedFallback.js` | `buildPersonalizedFallback` L105-119 | `applyFallbackLoopGuard` swap; `masterBuddyRuntime.generateOpenAnswer` fallback |
| `You've been studying ${label}. Here is how…` | `services/studyConnectionIntent.js` | `buildStudyConnectionResponse` L74 | `masterBuddyRuntime` route `study_connection` |
| `Would you like to continue studying ${label} together?` | `services/companionDoctrinePresenter.js` | study invitation helpers L181-184 | Appended in `presentCompanionDoctrine` |
| `You recently studied ${topic}` | `services/runtimePersonalizedFollowupEngine.js` L34 | suggestion builder | Relationship / next-steps surfaces |
| `You recently studied ${recent.topic}` | `services/runtimeCompanionReflectionEngine.js` L27 | reflection prompts | Reflection prepend path |
| Sabbath history on HOW | `services/sourceGroundedResponder.js` | `sabbathReply` includes Constantine/Laodicea block on comparison path | `doctrine_general` pipeline |
| Sabbath history on HOW | `services/masterBuddyRuntime.js` | follow-up sets `isSabbathHistory` L503-505; routes `sabbath_history` L580-596 | `buildSabbathHistoryResponse` → `sabbathHistoryDeepResponder` |
| `You've been studying general` | `services/personalizedFallback.js` + `companionLearningLayer` | `favoriteTopics[0]` → `formatTopic` → `"general"` label | Learning profile topic key `general` / `scripture_study` |

### Import / caller chains for witness triplet (deployed)

```
POST /buddy/chat
  → buddyBrain.runBuddy (HEAD)
  → masterBuddyRuntime.runMasterBuddyRuntime
  → generateAnswer('doctrine_general' | 'sabbath_definition')
  → runDoctrineRuntimePipeline
  → sourceGroundedResponder.buildSourceGroundedReply (canned doctrine prose)
  → presentCompanionDoctrine
  → scriptureWitnessEngine.buildScriptureWitnessBlock
  → parts.push(witness.block)   // "establishes the matter…" + "Witness path: …"
  → structured.reply returned to browser
```

### Guard files (detectors only — **not on deployed path**)

These **match** forbidden phrases but **do not generate** them on `HEAD`:

- `services/coreResponseGuards.js`
- `services/forbiddenProseGuard.js`
- `services/ownershipAntiOverrideGuard.js`
- `services/doctrineBoundaryValidator.js`

They are wired into `openAiFirstCompanionRuntime` locally — **not** into `masterBuddyRuntime` on `HEAD`.

### Evidence Cards / Concordance

Grep under `services/evidenceCards/` found **no** witness triplet strings. Evidence cards are not the direct source of these phrases on the deployed path.

---

## Part C — Multiple runtime detection

Can each component still produce **final user-visible prose** on a live request?

| Component | On deployed `HEAD` | On local cutover | How (if YES) |
|-----------|-------------------|------------------|--------------|
| `buddyBrain.runBuddy` | Router only | Router only | No — delegates |
| `openAiFirstCompanionRuntime` | **NO** (file absent) | **YES** | `reasonFirstComposer` → OpenAI |
| `masterBuddyRuntime` | **YES** | **NO** (bypassed locally) | `generateAnswer` template dispatch |
| `reasonFirstBuddyRuntime` | **NO** (not in HEAD router) | **NO** (warn + bypass) | — |
| `sourceGroundedResponder` | **YES** | **NO** | `doctrine_general` / pipeline |
| `scriptureWitnessEngine` | **YES** | **NO** (not called) | Via presenters |
| `companionDoctrinePresenter` | **YES** | **NO** | `presentCompanionDoctrine` assembles final `reply` string |
| `personalizedFallback` | **YES** | **NO** (disabled when `BUDDY_TEMPLATE_PROSE=0`) | Fallback / loop guard on master path |
| `companionLearningLayer` | **Indirect YES** | Evidence only locally | Feeds fallback + reflection text |
| `sabbathHistoryDeepResponder` | **YES** | **NO** | `sabbath_history` route |
| `studyConnectionIntent` | **YES** | **NO** | `study_connection` route |
| `grief/health/prayer/discernment responders` | **YES** | **NO** | Companion template routes |
| `enrichResponseWithRelationshipIntelligence` | **YES** | **NO** (skipped on cutover) | Prepends reflection / study journey |
| `reasonFirstComposer` | **NO** on HEAD | **YES** | OpenAI author |

**Deployed live requests can be answered by at least 8 distinct template/fallback authors without OpenAI.**

---

## Part D — Session contamination & post-answer injection

### Persistent identity (live UI vs regression)

| Source | Live UI | Regression |
|--------|---------|------------|
| `public/chat.html` | `localStorage.buddyChatUserId` — **stable across sessions** | Fresh `cutover-${id}-${timestamp}` per test |
| `public/index.html` | Hardcoded `userId: 'demo-user'` — **shared by all homepage users** | N/A |
| `public/beta.html` | `POST /buddy/chat` (beta tester id) | N/A |

### State that bleeds into routing (deployed)

| Store | File | Injection mechanism |
|-------|------|---------------------|
| Session log | `data/buddy-sessions.jsonl` | `getRecentSessions(userId)` → follow-up / Sabbath context |
| Active conversation | `data/active-conversation-state.json` | `getActiveConversation` → `resolveFollowUpQuestion` inherits `sabbath` topic |
| Learning profile | `data/companion-learning-profiles.json` | `buildLearningContext` → `personalizedFallback` study lines |
| Relationship memory | `data/runtime-relationship-memory.json` etc. | `enrichResponseWithRelationshipIntelligence`, recall |
| Study continuity | `continuityStudySessionRuntime` | `study_connection`, registry study presenters |
| Prayer continuity | `runtimePrayerContinuityEngine` | Prayer fallback lines |

### Post-answer injection points (can modify text **after** any OpenAI call)

| Point | File | Function | Active on deployed? |
|-------|------|----------|---------------------|
| Witness append | `companionDoctrinePresenter.js` | `presentCompanionDoctrine` | **YES** — primary author, not post-process |
| Relationship prepend | `companionRelationshipOrchestrator.js` | `enrichResponseWithRelationshipIntelligence` | **YES** in `finalizeBuddyResponse` |
| Reflection prepend | `companionReflectionLayer.js` | `prependReflection` | **YES** when enrichment runs |
| Study journey append | `studyJourneyEngine.js` | via orchestrator | **YES** on study/doctrine turns |
| Fallback swap | `buddyBrain.js` | `applyFallbackLoopGuard` → `buildPersonalizedFallback` | **YES** on master path |
| Polish strip | `companionReplyPolish.js` | `polishCompanionReply` | **YES** — cosmetic, does not remove witness blocks from presenters |
| Next steps bundle | `companionNextSteps.js` | `buildCompanionNextSteps` | **YES** unless suppressed |

On the **local cutover** path, `finalizeBuddyResponse` sets `skipRelationshipEnrichment` and `skipStudyPrompts`, and `hardCutover` blocks next-steps — so these injection points are **disabled locally** but **active on deployed master runtime**.

---

## Part E — Live vs regression difference

| Dimension | Regression (`emergencyHardCutoverRegression.js`) | Live Companion UI (Render / git HEAD) |
|-----------|---------------------------------------------------|---------------------------------------|
| Entry | `require('../services/buddyBrain')` direct | `POST /buddy/chat` → same module **if same files loaded** |
| `buddyBrain.runBuddy` | Local: `openAiFirstCompanionRuntime` | HEAD: `runMasterBuddyRuntime` |
| OpenAI composer | `reasonFirstComposer` | Only on `open_general` fallback; often bypassed |
| Witness engine | Never called | **`presentCompanionDoctrine` always appends** |
| Intent layer | `currentMessageIntent` | `questionIntentResolver` + follow-up inheritance |
| History on Sabbath HOW | `historyAllowed: false` | `sabbath_history` route + sourceGrounded history blocks |
| Guards | ownership + directness + forbidden prose | **Absent** on master path |
| userId | Unique per test | Persistent `localStorage` / `demo-user` |
| Env | Script sets `BUDDY_TEMPLATE_PROSE=0` etc. | HEAD `render.yaml`: **no cutover env vars** |
| Debug | `BUDDY_DEBUG=1` in script | HEAD route: **no `coreDebug` / `liveRequestTrace` in response** |
| Fallback normalize | Connection error message | HEAD: `"I'm here with you. Tell me a little more."` |

**Exact code-path difference:** Regression exercises the **uncommitted OpenAI-first stack**. Live Render exercises **`e5d388e` master template stack**. The HTTP route is the same; the **implementation behind `runBuddy` is not**.

### Why symptoms match deployed code perfectly

From `docs/sprint2final/master-runtime-results.json` and `docs/regression-trace/response-ownership-trace.json` (captured under `BUDDY_OPENAI_FIRST=0` / master path):

- `Genesis 2:2-3 establishes the matter… Witness path: …` — **`scriptureWitnessEngine` + `presentCompanionDoctrine`**
- `You've been studying…` — **`personalizedFallback` / `studyConnectionIntent`**
- Sabbath HOW → history — **`masterBuddyRuntime` `sabbath_history` routing**

These are **documented outputs of the deployed architecture**, not regressions of the cutover.

---

## Part F — Root cause ranking

| Rank | Cause | Probability | Files involved |
|------|-------|-------------|----------------|
| **1** | **Deploy parity gap** — cutover never committed/pushed; Render runs `masterBuddyRuntime` | **95%** | `services/buddyBrain.js` (HEAD), `services/masterBuddyRuntime.js`, `services/openAiFirstCompanionRuntime.js` (missing from git) |
| **2** | **Template responders still final authors on deployed path** | **95%** | `scriptureWitnessEngine.js`, `companionDoctrinePresenter.js`, `sourceGroundedResponder.js`, `personalizedFallback.js`, `sabbathHistoryDeepResponder.js` |
| **3** | **Production env not configured for cutover** (no `BUDDY_TEMPLATE_PROSE=0`, etc. on HEAD `render.yaml`) | **85%** | `render.yaml` (HEAD: `plan: free`, no Buddy env) |
| **4** | **Session contamination amplifies wrong routing** (persistent userId, active conversation, learning profile) | **70%** | `public/chat.html`, `public/index.html`, `activeConversationManager.js`, `companion-learning-profiles.json`, `buddy-sessions.jsonl` |
| **5** | **Follow-up inheritance routes Sabbath HOW → history** on master path | **65%** | `masterBuddyRuntime.js` L487-506, `sabbathIntentRouter.js`, `questionIntentResolver.js` |
| **6** | **Post-compose enrichment injects study/reflection text** | **60%** | `companionRelationshipOrchestrator.js`, `finalizeBuddyResponse` in `buddyBrain.js` |
| **7** | OpenAI pasting witness from evidence (cutover-only concern) | **15%** on live today | Would require cutover deployed first; guards exist locally |

---

## Recommended fix order (investigation only — do not implement yet)

1. **Verify live runtime** — On Render logs, confirm startup shows `masterBuddyRuntime` vs `openAiFirstCompanionRuntime`. On HEAD there is no startup diagnostic block in `server.js`.

2. **Deploy parity** — Commit and deploy the cutover stack (`openAiFirstCompanionRuntime`, `reasonFirstComposer`, `buddyBrain` router lock, env vars). Until this lands, regression passing is **misleading for production**.

3. **Render env** — Apply `BUDDY_RUNTIME=legacy`, `BUDDY_TEMPLATE_PROSE=0`, `BUDDY_DISABLE_STUDY_FALLBACK=1`, `BUDDY_DEBUG=1`, `BUDDY_LIVE_TRACE=1` (local `render.yaml` has these; HEAD does not).

4. **Live trace in response** — Deploy `routes/buddy.js` with `liveRequestTrace` so browser responses prove `runtimeUsed` and `finalAnswerAuthor` per turn.

5. **Session hygiene for validation** — Test with fresh `userId` or cleared `localStorage` / `demo-user` data files to separate routing bugs from contamination.

6. **Retire or hard-gate master template dispatch** — Even after cutover deploy, ensure `runMasterBuddyRuntime` cannot be re-enabled without explicit dev flag.

7. **UI client** — Replace hardcoded `demo-user` on `index.html`; consider per-session ids for validation.

---

## Verification commands (read-only)

```bash
# What git says production runs:
git show HEAD:services/buddyBrain.js | tail -20

# Confirm cutover file absent from deploy:
git show HEAD:services/openAiFirstCompanionRuntime.js

# What regression runs (local workspace):
node -e "const b=require('./services/buddyBrain'); console.log(b.runBuddy.toString().slice(0,200))"
```

---

## Stop condition

Investigation complete. **No code changes made for this report.** Root cause is overwhelmingly **live/deploy code-path mismatch**, not failure of the local hard cutover regression.
