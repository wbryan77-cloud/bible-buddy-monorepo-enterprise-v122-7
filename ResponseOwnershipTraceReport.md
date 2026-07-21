# Response Ownership Trace Report

**Date:** 2026-06-05  
**Mode:** Emergency audit only — **no fixes, no Phase 2, no deploy, no push**  
**Script:** `scripts/responseOwnershipTraceAudit.js`  
**JSON:** `docs/regression-trace/response-ownership-trace.json`

---

## Executive summary

Live transcript failures are **not a single bug**. They come from **stacked ownership paths** depending on which runtime is active and whether OpenAI succeeds:

| Class | What the user sees | Who speaks |
|-------|-------------------|------------|
| **A. OpenAI unreachable** | Generic connection line; question unanswered | `buildConnectionErrorReply` (not listening) |
| **B. Master / template runtime** | Witness triplets, Sabbath history on HOW, study loops | `masterBuddyRuntime` → `sourceGroundedResponder`, `sabbathHistoryDeepResponder`, `companionDoctrinePresenter` |
| **C. Fallback / learning profile** | "You've been studying…", Psalm 46, study continuation | `personalizedFallback` ← `companionLearningLayer` |
| **D. Post-OpenAI enrichment** (when flags off) | Study prompts appended after answer | `enrichResponseWithRelationshipIntelligence`, `studyJourneyEngine`, `companionNextSteps` |

**Today's trace environment:** OpenAI returns `429 quota exceeded` on every `openAiFirstCompanionRuntime` call. Live `/buddy/chat` with current code therefore shows **Class A** unless the deployed server still runs **Class B/C** paths.

**When OpenAI worked** (ownership battery 60/60, `ownership-cleanup-results.json`): Class A/B/C were suppressed; OpenAI authored with `reason_first_openai`. Live UI failures imply **production/runtime mismatch** or **API failure fallback**, not Evidence Cards alone.

---

## Runtime path (default code today)

```
POST /buddy/chat → routes/buddy.js → buddyBrain.runBuddy
  ├─ BUDDY_RUNTIME=reason_first → reasonFirstBuddyRuntime
  ├─ BUDDY_OPENAI_FIRST=0      → masterBuddyRuntime  ← template speakers (Class B)
  └─ default (legacy)          → openAiFirstCompanionRuntime
        → buildRetrievalEvidencePack (evidence cards + discovery)
        → composeReasonFirstReply (OpenAI)
        → if !openaiCalled → buildConnectionErrorReply (Class A)
        → doctrineBoundaryValidator + ownershipAntiOverrideGuard
        → finalizeBuddyResponse (skipRelationshipEnrichment=true on core path)
```

**Live server (`npm start`) does not set** `BUDDY_TEMPLATE_PROSE=0` or `BUDDY_DISABLE_STUDY_FALLBACK=1` unless exported manually → Class C remains possible on API failure if rollback flags differ.

---

## Live transcript cases — root cause mapping

### 1. "Can I eat pork? Yes or no?" — not answered directly

| Trace mode | finalAnswerAuthor | openaiCalled | Actual reply |
|------------|-------------------|--------------|--------------|
| `live_server_default` | `connection_error` | false | "I had trouble connecting…" |
| `ownership_protected` | `connection_error` | false | same |
| `master_rollback` | unknown (template) | false | Witness triplet + Leviticus blocks, **no yes/no lead** |

**Interference systems:** `buildConnectionErrorReply` (today); `sourceGroundedResponder` + `scriptureWitnessEngine` (master); historically `personalizedFallback` when study fallback enabled.

**When OpenAI worked:** `live_01` battery — author `openai`, reply starts **"No, according to Scripture…"** (`routeUsed: reason_first_openai`).

---

### 2. "What does Logos mean?" — Sabbath response

| Trace mode | routeUsed | evidenceCardTopics | Reply pattern |
|------------|-----------|-------------------|---------------|
| `live_server_default` | `core_connection_error` | `messiah_logos` | connection error (correct card, no answer) |
| `master_rollback` | `doctrine_general` | `messiah_logos` | minimal generic fallback (OpenAI 429 in master) |

**Historical failure mode (session logs):** Shared learning profile / prior Sabbath topic → study continuation or wrong template. Evidence pack **correctly** selects `messiah_logos` card today; failure is **downstream author**, not retrieval.

**Interference systems:** `companionLearningLayer` profile bleed; `masterBuddyRuntime` doctrine intercept; OpenAI topic bleed when active Sabbath thread in `recentSessions`.

---

### 3. "How do we keep the Sabbath holy?" — Sunday history instead of HOW

| Trace mode | routeUsed | studyFallback | sundayHistory in reply |
|------------|-----------|---------------|------------------------|
| `live_server_default` | `core_connection_error` | false | false |
| `master_rollback` | **`sabbath_history`** | false | **true** |

**Reproduced on master path:** `responderUsed: sabbath_history`, `admin_flags: sabbath_history_deep`, reply opens with historical framing and Constantine/Rome chain.

**Code owners:** `masterBuddyRuntime` L580–596 → `sabbathHistoryDeepResponder` via `sabbathIntentRouter` / `questionIntent.isSabbathHistory`.

**When OpenAI worked:** `live_09` — HOW from Exodus/Isaiah, no history (`reason_first_openai`).

---

### 4. "Today has been a rough day…" — study continuation

| Trace mode | routeUsed | studyFallback | relationshipEnrichment |
|------------|-----------|---------------|------------------------|
| `live_server_default` | `core_connection_error` | false | false |
| `master_rollback` | `doctrine_general` | false | **true** (minimal fallback) |

**Historical failure mode (session logs, 441-row sample):** `personalizedFallback` + `You've been studying…` on emotional turns when OpenAI not used; `griefCompanionResponse` witness blocks + study journey appended.

**When OpenAI worked:** `live_03` — empathetic listen-first, no study loop (`openai`, `studyLoopUsed: false`).

---

### 5. "That's not my question" — did not repair

| Trace mode | Prior context | routeUsed | Repair behavior |
|------------|---------------|-----------|-----------------|
| `live_server_default` | Sabbath ×2 | `core_connection_error` | none (API) |
| `master_rollback` | Sabbath ×2 | **`sabbath_history`** | partial ("I hear you…") then **history lecture** |

**Code gap:** Correction detected in `sabbathIntentRouter` CORRECTION_PATTERNS but master path still routes to `sabbath_history` and `sabbathHistoryDeepResponder` instead of OpenAI re-compose with `activeConversationLock`.

---

### 6. "What does holy mean?" — study continuation

| Trace mode | routeUsed | studyFallback | evidenceCards |
|------------|-----------|---------------|---------------|
| `live_server_default` | `core_connection_error` | false | false |
| `master_rollback` | `doctrine_general` | false | false |

**Historical failure mode:** `personalizedFallback` + `companionLearningLayer` when user profile has `favoriteTopics: general|traditions|sabbath` — common with legacy `chat-html-user` shared ID (fixed in `chat.html` to per-session ID; **live server may not have restarted**).

---

## Full trace tables (14 required fields)

### Mode: `live_server_default` (simulates `npm start` without ownership env)

| Case | routeUsed | runtimeUsed | finalAnswerAuthor | templateUsed | fallbackUsed | responderUsed | studyFallbackUsed | topicContinuationUsed | relationshipEnrichmentUsed | evidenceCardsUsed | openaiCalled | openaiResponseReceived | regenerationTriggered | loopGuardTriggered |
|------|-----------|-------------|-------------------|--------------|--------------|---------------|-------------------|----------------------|---------------------------|-------------------|--------------|------------------------|-------------------------|---------------------|
| pork yes/no | core_connection_error | core_openai_first | connection_error | false | true | core_connection_error | false | false | false | true | false | false | true | false |
| Logos meaning | core_connection_error | core_openai_first | connection_error | false | true | core_connection_error | false | false | false | true | false | false | true | false |
| Sabbath HOW | core_connection_error | core_openai_first | connection_error | false | true | core_connection_error | false | false | false | true | false | false | true | false |
| rough day | core_connection_error | core_openai_first | connection_error | false | true | core_connection_error | false | false | false | false | false | false | true | false |
| holy meaning | core_connection_error | core_openai_first | connection_error | false | true | core_connection_error | false | false | false | false | false | false | true | false |
| not my question | core_connection_error | core_openai_first | connection_error | false | true | core_connection_error | false | false | false | false | false | false | true | false |

**API error all cases:** `429 quota exceeded`

---

### Mode: `master_rollback` (`BUDDY_OPENAI_FIRST=0`) — **matches live transcript symptom shapes**

| Case | routeUsed | runtimeUsed | finalAnswerAuthor | templateUsed | fallbackUsed | responderUsed | studyFallbackUsed | topicContinuationUsed | relationshipEnrichmentUsed | evidenceCardsUsed | openaiCalled | openaiResponseReceived | regenerationTriggered | loopGuardTriggered |
|------|-----------|-------------|-------------------|--------------|--------------|---------------|-------------------|----------------------|---------------------------|-------------------|--------------|------------------------|-------------------------|---------------------|
| pork yes/no | doctrine_general | legacy | unknown | **true** | false | doctrine_general | **true** | false | false | true | false | false | false | false |
| Logos meaning | doctrine_general | legacy | unknown | false | false | doctrine_general | false | false | **true** | true | false | false | false | false |
| Sabbath HOW | **sabbath_history** | legacy | unknown | false | false | **sabbath_history** | false | false | false | true | false | false | false | false |
| rough day | doctrine_general | legacy | unknown | false | false | doctrine_general | false | false | **true** | false | false | false | false | false |
| holy meaning | doctrine_general | legacy | unknown | false | false | doctrine_general | false | false | **true** | false | false | false | false | false |
| not my question | **sabbath_history** | legacy | unknown | false | false | **sabbath_history** | false | false | false | false | false | false | false | false |

---

## Systems still speaking instead of OpenAI

| System | Speaks final prose? | When active | Transcript symptom |
|--------|---------------------|-------------|-------------------|
| **openai.reasonFirstComposer** | Yes (intended) | Default path + API success | Direct answers in battery |
| **buildConnectionErrorReply** | Yes | OpenAI API fail / 429 | Nothing answered; "trouble connecting" |
| **masterBuddyRuntime** | Dispatches templates | `BUDDY_OPENAI_FIRST=0` or old deploy | Wrong route entirely |
| **sourceGroundedResponder** | Yes | Master doctrine_general | Witness triplet, no yes/no |
| **sabbathHistoryDeepResponder** | Yes | Master sabbath_history | Sunday history on HOW/correction |
| **companionDoctrinePresenter** | Yes | Master doctrine paths | Study + witness blocks |
| **scriptureWitnessEngine** | Yes (paste) | Inside presenters | "establishes the matter…" |
| **personalizedFallback** | Yes | API fail + study fallback enabled | "You've been studying…" |
| **companionLearningLayer** | Feeds fallback | Shared user profile | traditions/general bleed |
| **enrichResponseWithRelationshipIntelligence** | Appends prose | `finalizeBuddyResponse` when not skipped | Study prompts on grief |
| **studyJourneyEngine / companionNextSteps** | Appends prose | Same | "continue your study journey" |
| **continueStudyEngine** | Yes | Master continue_study route | Study continuation |
| **Evidence Cards / Discovery** | **No** (facts only) | Always on core path | Not the speaker |

---

## Component damage ranking (highest → lowest)

From session log tail (5000 rows) + live trace audit:

```json
[
  { "component": "buildConnectionErrorReply", "responseCount": 168, "ownershipCount": 0, "interferenceCount": 168, "damageScore": 108.2 },
  { "component": "masterBuddyRuntime.templateDispatch", "responseCount": 21, "ownershipCount": 0, "interferenceCount": 21, "damageScore": 18.5 },
  { "component": "sabbathHistoryDeepResponder", "responseCount": 17, "ownershipCount": 0, "interferenceCount": 17, "damageScore": 15.0 },
  { "component": "sourceGroundedResponder", "responseCount": 15, "ownershipCount": 0, "interferenceCount": 15, "damageScore": 10.2 },
  { "component": "scriptureWitnessEngine", "responseCount": 10, "ownershipCount": 0, "interferenceCount": 10, "damageScore": 6.8 },
  { "component": "companionDoctrinePresenter", "responseCount": 10, "ownershipCount": 0, "interferenceCount": 10, "damageScore": 6.8 },
  { "component": "enrichResponseWithRelationshipIntelligence", "responseCount": 21, "ownershipCount": 0, "interferenceCount": 21, "damageScore": 14.3 },
  { "component": "personalizedFallback", "responseCount": 8, "ownershipCount": 0, "interferenceCount": 8, "damageScore": 5.1 },
  { "component": "companionLearningLayer.studyContinuation", "responseCount": 2, "ownershipCount": 0, "interferenceCount": 2, "damageScore": 1.4 },
  { "component": "studyJourneyEngine", "responseCount": 2, "ownershipCount": 0, "interferenceCount": 2, "damageScore": 1.4 },
  { "component": "openai.reasonFirstComposer", "responseCount": 184, "ownershipCount": 184, "interferenceCount": 0, "damageScore": 0.0 }
]
```

**Note:** `damageScore` weights interference vs session volume. OpenAI composer has **zero interference** when reached; highest damage today is **connection error** blocking OpenAI entirely.

---

## Conclusions (audit only)

1. **Live "not listening" today is primarily OpenAI not being reached** (`429` / quota) → user gets connection stub, not an answer. Evidence cards load correctly but **do not speak**.

2. **Live transcript symptom shapes match `masterBuddyRuntime` + template responders**, not the OpenAI-first path when API works. If production or local server runs `BUDDY_OPENAI_FIRST=0` or pre-restore code, users will see Class B/C behavior exactly as reported.

3. **Sabbath HOW → Sunday history** is **reproduced** on master path via `sabbath_history` → `sabbathHistoryDeepResponder` (not OpenAI).

4. **Study continuation on emotional/general questions** maps to `personalizedFallback` + `companionLearningLayer` in historical logs; core path skips enrichment when `skipRelationshipEnrichment: true`.

5. **Correction turns** partially acknowledge on master path but still route to history template instead of OpenAI re-compose.

6. **Evidence Cards are not the speaker** — retrieval topic matches question (`dietary_law`, `messiah_logos`, `sabbath`) even when the final reply is wrong or empty.

---

## Stop condition

Audit complete. **No fixes applied.** Re-run trace when OpenAI quota restored:

```bash
node scripts/responseOwnershipTraceAudit.js
```

Ensure `BUDDY_DEBUG=1` on live server to expose `coreDebug` on `/buddy/chat` responses for production parity checks.
