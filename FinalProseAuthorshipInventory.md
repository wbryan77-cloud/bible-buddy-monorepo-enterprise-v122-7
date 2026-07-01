# Final Prose Authorship Inventory

**Date:** 2026-06-01  
**Scope:** Every module that can produce **final user-facing prose** on or before the OpenAI composer on `POST /buddy/chat`.  
**Live default path (after core restoration):** `routes/buddy.js` → `buddyBrain.runBuddy` → `openAiFirstCompanionRuntime` → `buildRetrievalEvidencePack` (evidence) → `composeReasonFirstReply` (OpenAI author).

**Legend:** A = AUTHOR (final prose without OpenAI) · B = EVIDENCE · C = VALIDATOR · D = MEMORY · E = DEAD/EXPERIMENTAL

---

## Production path summary

| Stage | Module | Class | On default `/buddy/chat`? |
|-------|--------|-------|---------------------------|
| Entry | `routes/buddy.js` | — | Yes (pass-through) |
| Dispatch | `buddyBrain.runBuddy` | — | Yes |
| Default runtime | `openAiFirstCompanionRuntime` | OpenAI author | **Yes** (`BUDDY_OPENAI_FIRST` unset) |
| Evidence | `retrievalEvidencePack` | B | **Yes** (`routingHintsOnly: true`) |
| Composer | `reasonFirstComposer` | OpenAI author | **Yes** (`coreRestoration: true`) |
| Validator | `doctrineBoundaryValidator` | C | **Yes** (post-compose) |
| Crisis only | `buddyBrain.fallbackReply` | A | Yes (crisis only) |
| No OpenAI | `personalizedFallback` via `fallbackReply` | A | Yes (API missing only) |

---

## Task 1 — Module classification (requested + related)

### Orchestration / routing (ownership layers)

| Module | Class | Final prose? | Default path |
|--------|-------|--------------|--------------|
| `masterBuddyRuntime` | A (orchestrates many AUTHORS) | Yes when enabled | **BYPASS** — only if `BUDDY_OPENAI_FIRST=0` |
| `openAiFirstCompanionRuntime` | OpenAI pipeline | Via composer | **KEEP** — default owner |
| `reasonFirstBuddyRuntime` | OpenAI pipeline | Via composer | Separate — `BUDDY_RUNTIME=reason_first` |
| `activeConversationManager` | D (+ was routing input) | No | **DEMOTE** — context summary only; `routingHintsOnly` |
| `routeOwnershipTable` | Routing metadata | No direct prose | **BYPASS** on default path |
| `reasoningSnapshot` | B (understanding facts) | No | Evidence input only on default path |
| `questionIntentResolver` | B | No | Evidence / understanding only |
| `answerMatchGate` | A (replacement prose) | Yes when used | **BYPASS** — not called on default path |
| `responseContract` | A (canned replacement) | Yes when used | **BYPASS** — not called on default path |
| `reasoningSnapshot` → `recommendedRoute` | Routing | — | **BYPASS** on default path |

### Template responders (were AUTHORS)

| Module | Class | Canned markers | Default path |
|--------|-------|----------------|--------------|
| `healthCompanionResponse` | A (`buildHealthSupportResponse`) | "not a doctor", "flaring up" | **DEMOTE** — `classify*` only in evidence pack |
| `griefCompanionResponse` | A (`buildEmotionalSupportResponse`) | grief opener blocks | **DEMOTE** — classify only |
| `companionDiscernmentResponder` | A (`buildDiscernmentResponse`, `buildOpenLifeResponse`) | job triplet | **DEMOTE** — classify only |
| `prayerCompanionResponse` | A (`buildPrayerCompanionResponse`) | "glad you asked to pray" | **DEMOTE** — classify only |
| `companionDoctrinePresenter` | A (`presentCompanionDoctrine`) | witness + study prompts | **BYPASS** on default path |
| `sabbathHistoryCompanion` | A (delegates deep) | history blocks | **BYPASS** on default path |
| `sabbathHistoryDeepResponder` | A (`buildSabbathHistoryDeepResponse`) | Constantine chain prose | **BYPASS** on default path |
| `scriptureWitnessEngine` | A (`buildScriptureWitnessBlock`) | "establishes the matter…" | **BYPASS** — not final author on default path |
| `scriptureChainExpansion` | B | References only | **KEEP** — evidence via `getScriptureChain` |
| `doctrineRuntimePipeline` | A (template intercept) | doctrine blocks | **BYPASS** on default path |
| `doctrineCompanionPath` | A (orchestrates presenters) | templates | **BYPASS** — removed from default path |
| `registryStudyPresenter` | A (`presentRegistryStudyResponse`) | registry templates | **BYPASS** on default path |
| `metaAnswerResponder` | A | meta templates | **BYPASS** on default path |
| `sourceGroundedResponder` | A (`dietaryLawReply`, etc.) | topic templates | **BYPASS** on default path |
| `continueStudyIntent` | A (`buildContinueStudyResponse`) | study continuation | **BYPASS** — OpenAI + study evidence |
| `studyConnectionIntent` | A | study templates | **BYPASS** |
| `relationshipRecallEngine` | A (`searchRelationshipRecall` reply) | recall prose | **BYPASS** — memory in evidence pack |
| `personalizedFallback` | A | generic companion | **KEEP** — OpenAI unavailable only |
| `buddyBrain.dispatchActiveConversationFollowUp` | A | locks topic handlers | **DEAD** on default path (not called) |

### Evidence / retrieval (no final prose ownership)

| Module | Class | Role |
|--------|-------|------|
| `retrievalEvidencePack` | B | Scripture chains, history facts, memory snippets, doctrine boundaries |
| `companionRetrievalHints` | B | Health/grief/prayer hint flags |
| `scriptureChainExpansion` | B | KJV chain references |
| `doctrineBoundaries` | B/C | Topic detection + forbidden teachings |
| `bibleTopicCatalog` | B | Catalog metadata |
| `correctionLedger` | B | Correction facts for composer |
| `listeningSpecificityValidator` | B/C | Composer signals + regen hints |
| `retrievalFirstBuddyOrchestrator` | B | Scripture chain orchestration (not live final on default) |
| `RACL` / `retrievalEvidencePack` thread-local | B | Same pack |

### Validators (no prose ownership)

| Module | Class | Role |
|--------|-------|------|
| `doctrineBoundaryValidator` | C | Post-compose boundary check |
| `companionPostureValidator` | C | Experiment / reason-first regen |
| `emotionalCenterValidator` | C | ECP regen when enabled |
| `runtimeResponseSanitizer` | C | Strip labels / sanitize |
| `runtimeLabelStripper` | C | Strip internal labels |
| `companionReplyPolish` | C | Light polish (not author) |
| `runtimeLoopGuard` / `fallbackLoopSuppressor` | C | Loop suppression |

### Memory / context only

| Module | Class | Role |
|--------|-------|------|
| `activeConversationManager` | D | Thread hint summary (not route owner when `routingHintsOnly`) |
| `memoryRecallEngine` | D/B | Hits for evidence |
| `companionRelationshipOrchestrator` | D | Enrichment after compose (finalize) |
| `runtimeConversationStateEngine` | D | Persist state |
| `continuityMemoryRuntime` | D | Continuity store |
| `buddyBrain` session/memory append | D | Logging |

### Composer (OpenAI author)

| Module | Class | Role |
|--------|-------|------|
| `reasonFirstComposer` | **OpenAI AUTHOR** | Primary final prose with `coreRestoration: true` |
| `openaiClient` | — | API |

### Emotional center / golden examples

| Module | Class | Default path |
|--------|-------|--------------|
| `emotionalCenter` | B (signals) | Off when `coreRestoration` (ECP disabled in composer) |
| `goldenCompanionExamples` | B (appendix) | Off when `coreRestoration` |

### Experiment / shadow runtimes (not production default)

| Module | Class | Notes |
|--------|-------|-------|
| `companionConversationExperimentRuntime` | E | Script-driven |
| `companionOperatingModelExperiment` | E | Script-driven |
| `reasonFirstLiteRuntime` | E | `reasonFirstLiteExperiment.js` |
| `bibleBuddyLiteRuntime` | E | Lite baseline |
| `shadowReasonFirstRuntime` | E | Comparison only |
| `minimalReasonFirstRuntime` | E | Experiments |
| `structuredCompanionRuntime` | E | Deprecated |
| `autonomousCompanion` | E | Plans only, not wired |
| `responseStructureRemovalExperiment` | E | Script |
| `promptHierarchyExperiment` | E | Script |

### Dietary / Sabbath / death / law evidence sources

| Module | Class | Default |
|--------|-------|---------|
| `doctrineBoundaries.detectTopicFromMessage` | B | Topic for evidence |
| `scriptureChainExpansion` (`dietaryLaw`, `sabbath`, …) | B | In evidence pack |
| `sabbathHistoryDeepResponder.HISTORICAL_CHAIN` | B when parsed in pack | History only if **explicit** historical question |
| `sourceGroundedResponder` | A if called | **BYPASS** live path |

---

## Paths that produced final prose **before** restoration

```text
e5d388e default:
  runBuddy → masterBuddyRuntime
    → resolveRouteKey + activeConversation inheritance
    → generateAnswer (health/grief/prayer/discernment/sabbath/doctrine templates)
    → generateOpenAnswer (sometimes)
    → answerMatchGate / responseContract (meta)
```

```text
After core restoration:
  runBuddy → openAiFirstCompanionRuntime
    → crisis → fallbackReply only
    → buildRetrievalEvidencePack(routingHintsOnly: true)
    → composeReasonFirstReply(coreRestoration: true)
    → validateReasonFirstReply
    → finalizeBuddyResponse
```

---

## Task 2 — Decisions (summary)

| Module | Decision |
|--------|----------|
| `openAiFirstCompanionRuntime` + `reasonFirstComposer` | **KEEP** (default author) |
| `retrievalEvidencePack` + `scriptureChainExpansion` | **KEEP** evidence |
| `doctrineBoundaryValidator` | **KEEP** validator |
| `masterBuddyRuntime` | **BYPASS** default (`BUDDY_OPENAI_FIRST=0` escape) |
| `doctrineCompanionPath` | **BYPASS** (no longer on default path) |
| All template responders listed above | **DEMOTE TO EVIDENCE** or **BYPASS** |
| `scriptureWitnessEngine` | **DEMOTE** — chains in evidence only |
| `answerMatchGate`, `responseContract` | **BYPASS** |
| `activeConversationManager`, `routeOwnershipTable` | **DEMOTE** context / **BYPASS** ownership |
| Experiment runtimes | **KEEP EXPERIMENT-ONLY** |
| `buddyBrain.fallbackReply` / crisis | **KEEP** (allowed non-OpenAI authors) |

---

## Proof fields (Task 7)

When `NODE_ENV !== 'production'` or `BUDDY_DEBUG=1`, responses include `coreDebug`:

- `runtimeUsed`, `openaiCalled`, `finalAnswerAuthor`, `templateUsed`, `responderUsed`, `routeUsed`, `doctrineValidatorUsed`, `scriptureEvidenceUsed`, `activeTopicUsedAsContextOnly`

See `services/coreRestorationDebug.js` and `routes/buddy.js`.
