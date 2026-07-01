# Final Response Ownership Audit

**Date:** 2026-06-01  
**Priority:** CRITICAL  
**Mode:** Audit only — no implementation, deploy, push, beta, or Sprint 3.

---

## PART G — One-page answer (executive summary)

### 1. What is the main reason Buddy still fails after OpenAI is connected?

**OpenAI is connected but not always the final speaker.** The default path (`openAiFirstCompanionRuntime`) is designed for OpenAI authorship, but failures cluster in three places:

1. **Fallback/study speakers still win** when `openaiCalled` is false (API/OOM/process error) or when **`personalizedFallback`** is invoked via `buddyBrain.fallbackReply` / `applyFallbackLoopGuard` / shared **`chat-html-user`** learning profile (`favoriteTopics: general`, `traditions`).
2. **OpenAI is called but misuses evidence** — pasting Leviticus/Deuteronomy/Daniel blocks, witness-style triplets, or Sabbath **history** instead of answering the **current question** (yes/no pork, HOW to keep holy, Yahweh wording).
3. **Evidence mis-gating** — history facts and prior-session topic still influence composer payload; **`answerGuidance`** is advisory, not enforced hard enough.

Relationship and Alzheimer’s improved when OpenAI actually authored — that confirms the architecture works when fallback/template layers do not intercept.

### 2. What systems are still speaking instead of OpenAI?

| System | When it speaks | Default path active? |
|--------|----------------|----------------------|
| **`personalizedFallback`** | API failure, loop guard, `BUDDY_TEMPLATE_PROSE` unset + learning profile | **Yes** (connection error path; loop guard elsewhere) |
| **`companionLearningLayer` → study lines** | "You've been studying general/traditions…" | **Yes** (via fallback) |
| **`buildConnectionErrorReply`** | Real API/OOM failure | **Yes** (allowed) |
| **`masterBuddyRuntime` + template responders** | `BUDDY_OPENAI_FIRST=0` | Rollback only |
| **`scriptureWitnessEngine`** | Master/doctrine presenters; OpenAI paste | Bypass default; **paste risk remains** |
| **`sourceGroundedResponder`** | Doctrine pipeline / rollback | Not default core |
| **`enrichResponseWithRelationshipIntelligence`** | finalize when enrichment not skipped | **No** on core (`skipRelationshipEnrichment: true`) |

### 3. What percentage of bad answers come from fallback/study/template ownership?

**Estimated 45–55%** of wrong answers on reported live failures (heavens → traditions study, Bible search → study continuation, connection drops).  
**Estimated 35–45%** when OpenAI is called but answers wrong (pork yes/no, Sabbath HOW, dietary loops, Yahweh → Rome).  
See [OwnershipDamageRanking.json](docs/regression-trace/OwnershipDamageRanking.json).

### 4. What should be removed completely from the default path?

- **`personalizedFallback` as primary answer** (any path that returns study continuation instead of answering).
- **`masterBuddyRuntime` template routing** as default (keep rollback env only).
- **All template responders** as final authors: health/grief/prayer/discernment, `presentCompanionDoctrine`, `sabbathHistoryDeepResponder`, `registryStudyPresenter`, `buildContinueStudyResponse`, `buildMemoryRecallStructured` prose.
- **`applyFallbackLoopGuard` → alternate personalizedFallback** on core path.
- **`dispatchActiveConversationFollowUp`** (dead code path in `buddyBrain.js` but still present).

### 5. What should be demoted to evidence only?

- **`scriptureChainExpansion` / `bibleTopicCatalog`** → references in evidence pack only.
- **`doctrineEvidenceSnippets`** → expand, never render as final blocks.
- **`sabbathHistoryDeepResponder.HISTORICAL_CHAIN`** → history object in pack when user asks history only.
- **`scriptureWitnessEngine`** → remove connection text from any live path; references only.
- **`sourceGroundedResponder`** → delete from `/buddy/chat` or convert to snippet builder only.
- **`companionLearningLayer` / `studyJourneyEngine`** → hints after answer, never opener.
- **`activeConversationManager`** → context summary only (`routingHintsOnly`).

### 6. What must stay to preserve Bible-first doctrine?

- **`reasonFirstComposer` / OpenAI** as sole normal author.
- **`retrievalEvidencePack`** + **`doctrineBoundaries`** + **`doctrineBoundaryValidator`**.
- **`answerGuidance`** (strengthen enforcement).
- **Crisis protocol** (`buddyBrain.fallbackReply` crisis branch).
- **Memory/session context** as JSON facts in composer payload.
- **`coreDebug`** for ownership proof.

### 7. What implementation should happen next?

1. **Hard-disable `personalizedFallback` on core path** — connection errors only; no study speaker; require `BUDDY_TEMPLATE_PROSE=0` in prod.
2. **Validator hard-fail** on study-loop openers, witness triplets, and missing yes/no lead when `answerGuidance.requireYesNoLead`.
3. **Per-user `userId` in `chat.html`** — stop `chat-html-user` learning profile bleed.
4. **Run `scripts/ownershipAuditBattery.js`** locally with OpenAI key; gate release on 60-test scores.
5. **Render memory fix** — see [RenderMemoryStabilityNotes.md](RenderMemoryStabilityNotes.md).

---

## PART A — Final prose ownership (default `/buddy/chat` path)

**Live entry:** `routes/buddy.js` → `buddyBrain.runBuddy` → `openAiFirstCompanionRuntime` (unless `BUDDY_RUNTIME=reason_first` or `BUDDY_OPENAI_FIRST=0`).

| System | Class | Can author final visible prose? | Default path |
|--------|-------|--------------------------------|--------------|
| **openAiFirstCompanionRuntime** | Orchestrator | Indirect | **ACTIVE** |
| **composeReasonFirstReply / reasonFirstComposer** | **A — OPENAI AUTHOR** | **Yes** (primary) | **ACTIVE** |
| **retrievalEvidencePack** | **I — EVIDENCE ONLY** | No | **ACTIVE** |
| **doctrineEvidenceSnippets** | **I — EVIDENCE ONLY** | No (intended) | **ACTIVE** |
| **answerGuidance** | **I — EVIDENCE ONLY** | No | **ACTIVE** |
| **coreResponseGuards** | **C + strip** | Yes (connection error; strip mutator) | **ACTIVE** |
| **doctrineBoundaryValidator** | **H — VALIDATOR** | Regen hint only; no replace on core | **ACTIVE** |
| **scriptureWitnessEngine** | **E — WITNESS AUTHOR** | Yes if called | **BYPASS** default; paste via OpenAI |
| **scriptureChainExpansion** | **I — EVIDENCE** | No | **ACTIVE** (in pack) |
| **personalizedFallback** | **C + D — FALLBACK + STUDY** | **Yes** | **ACTIVE** on API fail / loop guard / fallbackReply |
| **buddyBrain.fallbackReply** | **C — FALLBACK** | Yes (non-crisis → personalizedFallback) | **ACTIVE** on crisis + fallback chain |
| **enrichResponseWithRelationshipIntelligence** | **G — ENRICHMENT** | Can append | **SKIPPED** (`skipRelationshipEnrichment: true`) |
| **buildCompanionNextSteps** | **D — STUDY** | Can append | **SKIPPED** (`skipStudyPrompts: true`) |
| **companionReplyPolish** | Polish | Can strip | **ACTIVE** |
| **activeConversationManager** | **J — MEMORY** | No | Context only |
| **routeOwnershipTable** | Routing | No | **BYPASS** |
| **masterBuddyRuntime** | **B/F multi** | Yes | **BYPASS** (`BUDDY_OPENAI_FIRST=0`) |
| **doctrineCompanionPath** | **F — DOCTRINE** | Yes | **BYPASS** |
| **healthCompanionResponse** | **F (classify) / B (build)** | build* = Yes | **BYPASS** default; classify in pack |
| **griefCompanionResponse** | Same | build* = Yes | **BYPASS** |
| **companionDiscernmentResponder** | **F / B** | build* = Yes | **BYPASS** |
| **prayerCompanionResponse** | **F / B** | build* = Yes | **BYPASS** |
| **sabbathHistoryDeepResponder** | **F — DOCTRINE** | Yes | **BYPASS** |
| **sourceGroundedResponder** | **F — DOCTRINE** | Yes (canned dietary/sabbath) | **BYPASS** core; used in pipeline |
| **responseContract** | **H — REPLACEMENT** | Yes | **BYPASS** |
| **answerMatchGate** | **H — REPLACEMENT** | Yes | **BYPASS** |
| **reasonFirstBuddyRuntime** | **A** | Via composer | `BUDDY_RUNTIME=reason_first` only |
| **Experiment runtimes** | **K — DEAD/EXPERIMENT** | Yes in scripts | **NOT** production default |

---

## PART B — Damage ranking (60-question test set)

**Full battery:** 60 cases defined in `scripts/ownershipAuditBattery.js`.  
**Measured run:** Pending local execution (API key required).  
**Ranking (estimated):** [OwnershipDamageRanking.json](docs/regression-trace/OwnershipDamageRanking.json)

| System | Times triggered (est.) | Wrong-answer count (est.) | Override count (est.) | Damage % | Recommendation |
|--------|------------------------|---------------------------|------------------------|----------|----------------|
| personalizedFallback + learning profile | 12 | 6 | 6 | **50%** | REMOVE from default |
| OpenAI composer (evidence misuse) | 48 | 5 | 0 | **42%** | KEEP; harden validator |
| evidencePack / answerGuidance bleed | 8 | 2 | 0 | **17%** | Tighten gating |
| connection_error fallback | 4 | 2 | 2 | **17%** | KEEP for real errors only |
| masterBuddyRuntime templates | 0 | 0 | 0 | 0% | Rollback only |
| relationship enrichment | 0 | 0 | 0 | 0% | Stay skipped |

**User-reported live failures mapped:**

| Message | Likely author | Failure |
|---------|---------------|---------|
| Pork yes/no | openai (weak) | No yes/no lead; Leviticus dump |
| Dietary loops | openai / fallback | Evidence paste or study fallback |
| Heavens count | **personalizedFallback** | "You've been studying traditions" |
| Search Bible directly | **personalizedFallback** | Study continuation |
| Sabbath HOW | openai + history evidence | Sunday history not HOW |
| Yahweh vs Jesus | openai + history bleed | Rome/Sabbath not wording |
| Relationship / Alzheimer's | **openai** | Improved ✓ |

---

## PART C — Post-OpenAI mutators

| Function | File | Trigger | Changes final user-visible answer? | Verdict |
|----------|------|---------|----------------------------------|---------|
| `composeReasonFirstReply` regen loop | reasonFirstComposer.js | validation / danger phrases | **Yes** (rewrite draft) | **KEEP** (must improve answers) |
| `lightPolish` / `polishFinalReply` | reasonFirstComposer / openAiFirst | after compose | Minor strip | **KEEP** |
| `stripDangerousFallbackSpeaker` | coreResponseGuards.js | witness/study detected | **Yes** | **KEEP** |
| `detectDangerousFallbackSpeaker` | coreResponseGuards.js | pre-finalize | Diagnostic | **KEEP** |
| `validateReasonFirstReply` | doctrineBoundaryValidator.js | post-compose | Regen only | **KEEP**; strengthen |
| `enrichResponseWithRelationshipIntelligence` | companionRelationshipOrchestrator.js | finalizeBuddyResponse | **Yes** (append) | **REMOVE** on core (already skipped) |
| `buildCompanionNextSteps` | companionNextSteps.js | finalize | Append if not skipped | **REMOVE** append on core |
| `applyFallbackLoopGuard` | buddyBrain.js | loop detected | **Replaces** with personalizedFallback | **REMOVE** from core |
| `buildPersonalizedFallback` | personalizedFallback.js | fallbackReply | **Replaces** entire answer | **REMOVE** as primary |
| `buildConnectionErrorReply` | coreResponseGuards.js | API fail | **Replaces** | **KEEP** (real errors) |
| `recordActiveConversationTurn` | buddyBrain.js | after finalize | No prose | **KEEP** metadata |
| `companionReplyPolish` patterns | companionReplyPolish.js | polish | Strips study phrases | **KEEP** |

---

## PART E — Recommended clean architecture

```text
User message (highest priority)
  → crisis check → crisis protocol only
  → load memory/session (facts JSON, no route ownership)
  → buildRetrievalEvidencePack (Scripture refs, doctrine snippets, boundaries)
  → answerGuidance (direct-answer requirements)
  → composeReasonFirstReply (OpenAI sole author)
  → doctrineBoundaryValidator (block false doctrine + template/study openers)
  → light polish / strip only
  → finalize (session log, memory persist — NO study append)
  → optional coreDebug
```

**Rules:** History secondary; direct questions first; study continuation only after complete answer; templates never except crisis/API error.

---

## PART F — Deletion / demotion plan (ranked)

| File | Function | Action | Why | Risk | Test |
|------|----------|--------|-----|------|------|
| personalizedFallback.js | buildPersonalizedFallback | **REMOVE** default | Study speaker | Low if OpenAI required | ownershipAuditBattery live_06, live_08 |
| buddyBrain.js | fallbackReply → personalizedFallback | **REMOVE** chain | Same | Medium | connection vs study |
| buddyBrain.js | applyFallbackLoopGuard | **REMOVE** core | Swaps to fallback | Low | correction turns |
| masterBuddyRuntime.js | runMasterBuddyRuntime | **BYPASS** | Template owner | Low | BUDDY_OPENAI_FIRST=0 only |
| scriptureWitnessEngine.js | buildScriptureWitnessBlock | **DEMOTE** | Triplet prose | Low | witness markers |
| sourceGroundedResponder.js | *Reply functions | **DEMOTE/DELETE** live | Canned doctrine | Med | dietary/sabbath |
| companionLearningLayer.js | favoriteTopics in fallback | **DEMOTE** | "studying general" | **High** | heavens question |
| retrievalEvidencePack.js | history inclusion | **TIGHTEN** | HOW→history | Med | live_09 |
| answerGuidance.js | requireYesNoLead | **ENFORCE** | pork yes/no | Med | live_01 |
| reasonFirstComposer.js | composer | **KEEP** | Core author | — | all doctrine |
| doctrineBoundaryValidator.js | validate* | **KEEP+ strengthen** | Guardrails | — | false doctrine |
| openAiFirstCompanionRuntime.js | orchestrator | **KEEP** | Entry | — | coreDebug |

---

## PART H — Outputs

| Deliverable | Path |
|-------------|------|
| This audit | **FinalResponseOwnershipAudit.md** |
| Bible learning architecture | **BibleLearningArchitectureAudit.md** |
| Damage ranking JSON | **docs/regression-trace/OwnershipDamageRanking.json** |
| Runnable 60-test battery | **scripts/ownershipAuditBattery.js** |

**Stop condition:** Audit complete. No runtime fixes applied in this task.
