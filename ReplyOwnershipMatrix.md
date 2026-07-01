# Reply Ownership Matrix

**Audit type:** Read-only  
**Generated:** 2026-06-02  
**Objective:** For every user-facing reply path — which module owns final prose, OpenAI involvement, and post-processing.

---

## 1. Measured Production Reply Mix

Source: Baseline experiment — 50 turns across 24 threads (`CurrentRuntimeBaselineReport.md`, `docs/baseline-experiment/results.json`).

| Ownership class | Turns | % | Description |
|-----------------|-------|---|-------------|
| **OpenAI reasoning** | 0 | **0%** | `generateOpenAnswer` → `chat.completions.create` |
| **Templates** | 30 | **60%** | Canned blocks (history, meta, doctrine, study) |
| **Responders** | 20 | **40%** | Companion modules (grief, health, prayer, job, memory) |
| **Route-owned prose** | 50 | **100%** | All turns exited via `generateAnswer()` |
| **Fallback systems** | 0 | **0%** | `fallbackReply` / `personalizedFallback` (latent, not triggered) |

### Route frequency (which owner fired)

| Route key | Turns | % of sample | Prose owner module |
|-----------|-------|-------------|-------------------|
| `doctrine_general` | 12 | 24% | `sourceGroundedResponder` + `companionDoctrinePresenter` |
| `meta_about_previous_answer` | 6 | 12% | `metaAnswerResponder` |
| `health_support` | 6 | 12% | `healthCompanionResponse` |
| `sabbath_definition` | 6 | 12% | `sourceGroundedResponder` + `companionDoctrinePresenter` |
| `sabbath_history` | 4 | 8% | `sabbathHistoryDeepResponder` |
| `grief_support` | 4 | 8% | `griefCompanionResponse` |
| `prayer` | 4 | 8% | `prayerCompanionResponse` |
| `job_discernment` | 3 | 6% | `companionDiscernmentResponder` |
| `memory_recall` | 3 | 6% | `relationshipRecallEngine` via `buildMemoryRecallStructured` |
| `continue_study` | 2 | 4% | `continueStudyIntent` |
| `open_general` | 0 | 0% | Would be OpenAI or fallback — **never reached** |
| `crisis` | 0 | 0% | `fallbackReply` — not in sample |

---

## 2. Master Reply Path Matrix

For each path: **OpenAI called?** **Output discarded?** **Modified?** **Replaced by responder?**

| # | Route / trigger | Final prose module | Function | Class | OpenAI called? | Discarded? | Modified? | Replaced? |
|---|-----------------|-------------------|----------|-------|----------------|------------|-----------|-----------|
| 1 | Empty message | `buddyBrain` | `fallbackReply` | Fallback | No | — | polish | — |
| 2 | Crisis safety | `buddyBrain` | `fallbackReply` (crisis) | Fallback | No | — | polish | — |
| 3 | `continue_study` | `continueStudyIntent` | `buildContinueStudyResponse` | Template | No | — | polish + finalize | — |
| 4 | `study_connection` | `studyConnectionIntent` | `buildStudyConnectionResponse` | Template | No | — | polish + finalize | — |
| 5 | `memory_recall` | `relationshipRecallEngine` | `formatRelationshipRecallResponse` | Responder | No | — | polish | — |
| 6 | `sabbath_history` | `sabbathHistoryDeepResponder` | `buildSabbathHistoryDeepResponse` | Template | No | — | polish + gate? | meta on wording sub-case |
| 7 | `historical_*` | `sabbathHistoryDeepResponder` | `buildSabbathHistoryDeepResponse` | Template | No | — | polish | meta on wording |
| 8 | `health_support` | `healthCompanionResponse` | `buildHealthSupportResponse` | Responder | No | — | polish + enrich | — |
| 9 | `grief_support` | `griefCompanionResponse` | `buildEmotionalSupportResponse` | Responder | No | — | polish + enrich | — |
| 10 | `rest_support` | `griefCompanionResponse` | `buildEmotionalSupportResponse` | Responder | No | — | polish + enrich | — |
| 11 | `prayer` | `prayerCompanionResponse` | `buildPrayerCompanionResponse` | Responder | No | — | polish + enrich | — |
| 12 | `job_discernment` | `companionDiscernmentResponder` | `buildDiscernmentResponse` | Responder | No | — | polish + enrich | — |
| 13 | `meta_about_previous_answer` | `metaAnswerResponder` | `buildMetaAnswerResponse` | Template | No | — | gate may regen | self-replace on gate fail |
| 14 | `sabbath_definition` | `sourceGroundedResponder` | `buildSourceGroundedReply` | Template | No | — | presenter + polish + enrich | — |
| 15 | `doctrine_general` | `sourceGroundedResponder` + `companionDoctrinePresenter` | pipeline + present | Template | No | — | presenter + polish + enrich | — |
| 16 | `registry_study` | `registryStudyPresenter` | `presentRegistryStudyResponse` | Template | No | — | polish + finalize | — |
| 17 | `open_question` (in generateAnswer) | `companionDiscernmentResponder` | `buildOpenLifeResponse` | Responder | **No** | — | polish | **Replaces OpenAI entirely** |
| 18 | `open_general` (null from generateAnswer) | `personalizedFallback` | `buildPersonalizedFallback` | Fallback | No* | — | polish + loop guard | — |
| 19 | `open_general` + OpenAI ready | `masterBuddyRuntime` | `generateOpenAnswer` → OpenAI | **OpenAI** | **Yes** | On parse fail | polish + loop guard + enrich | fallback on fail |
| 20 | Answer match gate fail | `metaAnswerResponder` | `buildMetaAnswerResponse` | Template | No | **Prior reply discarded** | — | **Yes — replaces route output** |
| 21 | Contract validation fail | `metaAnswerResponder` | `buildMetaAnswerResponse` | Template | No | **Prior reply discarded** | — | **Yes** |
| 22 | Final null structured | `buddyBrain` | `fallbackReply` | Fallback | No | — | polish | — |

\*Row 18: OpenAI path not attempted because `!openai` or `open_question` branch taken first.

---

## 3. Per-Module Prose Ownership Detail

### 3.1 Template owners (60% measured)

| Module | File | Prose mechanism | Sample routes |
|--------|------|-----------------|---------------|
| `sabbathHistoryDeepResponder` | `services/sabbathHistoryDeepResponder.js` | `SCRIPTURE_BLOCK` + `HISTORICAL_CHAIN` + `SOURCES_REFS` concatenation | `sabbath_history` |
| `metaAnswerResponder` | `services/metaAnswerResponder.js` | Fixed wording-explanation strings | `meta_about_previous_answer` |
| `sourceGroundedResponder` | `services/sourceGroundedResponder.js` | Topic-specific answer templates (sabbath, dietary, feast, etc.) | `doctrine_general`, `sabbath_definition` |
| `companionDoctrinePresenter` | `services/companionDoctrinePresenter.js` | OPENINGS, transitions, study prompts appended | doctrine routes |
| `continueStudyIntent` | `services/continueStudyIntent.js` | Continue/study journey template | `continue_study` |
| `registryStudyPresenter` | `services/registryStudyPresenter.js` | Registry catalog presentation | `registry_study` |
| `studyConnectionIntent` | `services/studyConnectionIntent.js` | Study connection template | `study_connection` |

### 3.2 Responder owners (40% measured)

| Module | File | Prose mechanism | Sample routes |
|--------|------|-----------------|---------------|
| `healthCompanionResponse` | `services/healthCompanionResponse.js` | Fixed openings + scripture witness block | `health_support` |
| `griefCompanionResponse` | `services/griefCompanionResponse.js` | Grief/rest openings + scripture witness | `grief_support` |
| `prayerCompanionResponse` | `services/prayerCompanionResponse.js` | Composed prayer text | `prayer` |
| `companionDiscernmentResponder` | `services/companionDiscernmentResponder.js` | Job/decision openings + scripture | `job_discernment` |
| `companionDiscernmentResponder` | `services/companionDiscernmentResponder.js` | `buildOpenLifeResponse` — open question prose | default / open_question |
| `relationshipRecallEngine` | `services/relationshipRecallEngine.js` | Formatted memory recall dump | `memory_recall` |

### 3.3 Fallback owners (0% measured, architecturally present)

| Module | File | Trigger |
|--------|------|---------|
| `buddyBrain.fallbackReply` | `services/buddyBrain.js` | Crisis, empty message, final null, OpenAI error |
| `personalizedFallback` | `services/personalizedFallback.js` | `!openai`, loop guard, alternate fallback |

### 3.4 OpenAI owner (0% measured)

| Module | File | Trigger |
|--------|------|---------|
| `generateOpenAnswer` | `services/masterBuddyRuntime.js` | `generateAnswer` returns null AND not `open_question` AND client ready |

---

## 4. Post-Ownership Modification Chain

Even after prose owner is determined, these modules **modify** the reply before HTTP response:

| Order | Module | Applies to | Effect |
|-------|--------|------------|--------|
| 1 | `answerMatchGate` | Meta/correction turns | May **replace** entire reply |
| 2 | `stripInternalRuntimeLabels` | All | Strip debug labels |
| 3 | `sanitizeDoctrineResponse` | All | Remove forbidden phrases |
| 4 | `polishCompanionReply` | All | Tone polish |
| 5 | `enrichResponseWithRelationshipIntelligence` | Most non-locked routes | Append memory/reflection |
| 6 | `buildCompanionNextSteps` | Some routes | Attach study suggestion metadata |

**OpenAI-specific:** If row 19 ever fires, steps 2–6 still apply to model output. Steps 1 may replace model output with template.

---

## 5. Primary Failure Thread — Reply Ownership Trace

**Sabbath wording thread (7 turns)** — 100% template, 0% OpenAI:

| Turn | User intent | Route | Prose owner | OpenAI? |
|------|-------------|-------|-------------|---------|
| 1 | Sunday worship why | `sabbath_history` | `sabbathHistoryDeepResponder` | No |
| 2 | Roman church wording | `meta_about_previous_answer` | `metaAnswerResponder` | No |
| 3 | Wording repeat | `meta_about_previous_answer` | `metaAnswerResponder` (identical) | No |
| 4 | Correction — wording not history | `meta_about_previous_answer` | `metaAnswerResponder` | No |
| 5 | Frustration — not answering | `meta_about_previous_answer` | `metaAnswerResponder` | No |
| 6 | Correction — wording | `meta_about_previous_answer` | `metaAnswerResponder` | No |
| 7 | Not listening | `meta_about_previous_answer` | `metaAnswerResponder` | No |

**Answer match gate:** May run on turns 2–7 but regen target is `metaAnswerResponder`, not OpenAI.

---

## 6. Ownership vs. User-Perceived Quality

| Thread | Dominant owner | Rubric overall (baseline) | Failure mode |
|--------|----------------|---------------------------|--------------|
| Sabbath wording | Template (meta + history) | 5.9 | Repeated template; history on wording turns |
| Job opportunity | Responder (discernment) | 6.1 | Turn 3 repeats turn 1 opening |
| Alzheimer's | Template (doctrine) + Responder (grief) | 5.6 | Misroute to doctrine; wrong grief frame |
| Distant from God | Template (doctrine) + Responder (prayer) | 5.7 | Generic template; prayer embeds user text |

Route-owned prose optimizes **route correctness** (keywords, markers), not **listening**.

---

## 7. Proposed Migration — OpenAI as Primary Composer

**Constraint:** No new responders, routes, or handlers. Repurpose existing modules as retrieval only.

### Phase 0 — Proof (complete / in progress)

| Artifact | Status |
|----------|--------|
| `services/shadowReasonFirstRuntime.js` | POC built — not production |
| `scripts/shadowRuntimeComparison.js` | Comparison harness |
| `ShadowRuntimeProofReport.md` | Requires OpenAI key for verdict |

### Phase 1 — Evidence layer (weeks 1–3)

| Current prose owner | Migration action | Retrieval output |
|--------------------|------------------|------------------|
| `sabbathHistoryDeepResponder` | Strip `buildSabbathHistoryDeepResponse` prose path | `{ chainSteps[], sources[], scripture[] }` |
| `metaAnswerResponder` | Remove from runtime | — (composer handles wording) |
| `sourceGroundedResponder` | Return topic + scripture refs only | `{ topic, references[], boundaries[] }` |
| `companionDoctrinePresenter` | Remove from runtime | — |
| `grief/health/prayer/discernment` responders | Return `{ supportType, scriptures[], flags }` | No openings |
| `relationshipRecallEngine` | Return `{ hits[], summaries[] }` | No formatted reply |
| `continueStudyIntent` | Return `{ lastTopic, position }` | No continue template |
| `reasoningSnapshot` | Keep — feeds composer | Understanding object |
| `doctrineBoundaries` | Keep — enforced in validation | Boundary list |

### Phase 2 — Single composer (weeks 4–5)

```
runBuddy (unchanged HTTP contract)
  └─ BUDDY_RUNTIME=reason_first flag
       └─ composeReply()  [evolved from generateOpenAnswer]
            ├─ gather evidence from Phase 1 adapters
            ├─ openai.chat.completions.create (primary)
            ├─ validate (boundaries + answer match)
            └─ regen via model on fail (NOT metaAnswerResponder)
```

### Phase 3 — Shadow parity (weeks 6–7)

- Dual-run: legacy + reason_first log `replyOwner` field
- Acceptance criteria shift: comprehension rubric, not route keywords
- Target: **>80%** turns with `replyOwner: openai`

### Phase 4 — Cutover (weeks 8–10)

- Default `BUDDY_RUNTIME=reason_first`
- Legacy route switch behind `BUDDY_RUNTIME=legacy` for rollback
- Deprecate prose functions (do not delete until 30-day stable)

### What stays enforced

| System | Role post-migration |
|--------|---------------------|
| `doctrineBoundaries` | Hard validation + regen |
| `classifySafety` | Crisis protocol (fixed text OK) |
| Memory engines | Retrieval into evidence bundle |
| Scripture chains | Retrieval into evidence bundle |
| Session persistence | Unchanged |
| `activeConversationManager` | State for composer context |

### What is removed from hot path

| System | Action |
|--------|--------|
| `generateAnswer` switch | Replace with evidence gather |
| `routeOwnershipTable` dispatch | Advisory only or removed |
| `answerMatchGate` template regen | Model regen |
| `presentCompanionDoctrine` | Removed |
| `enrichResponseWithRelationshipIntelligence` append | Composer integrates |
| `personalizedFallback` | Last-resort only |

### Success metrics (before full cutover)

1. OpenAI reply ownership **> 80%** of non-crisis turns
2. Sabbath wording thread: **zero** history template on turns 4–7
3. Rubric overall **≥ 7.5/10** on primary threads
4. Doctrine boundary violation rate ≤ current
5. Zero new routes/responders added

---

## 8. Decision Matrix

| Option | OpenAI % | Listening risk | Migration effort | Verdict |
|--------|----------|----------------|------------------|---------|
| Keep route-first | ~0% | High (proven) | None | **Reject** |
| Hybrid (doctrine routed, life OpenAI) | ~30–50% | Medium | Medium | **Reject** — bypasses remain |
| Reason-first (this plan) | Target >80% | Low (projected) | 8–10 weeks | **Accept** |

---

**Audit only. No production changes. No new responders. No new routes.**
