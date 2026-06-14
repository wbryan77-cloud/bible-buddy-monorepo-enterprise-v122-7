# Phase 5A Existing Asset Audit

**Date:** 2026-06-01  
**Scope:** Modules listed in Phase 5A mission + legacy/experimental companions.  
**Constraint:** No corpus, doctrine packs, evidence cards, or witness chain mutation.

---

## Executive Summary

Phase 5A should **orchestrate** existing Phase 4 lanes rather than rebuild them. The live companion path (`openAiFirstCompanionRuntime.js`) now delegates to `bibleCompanionOrchestrator.js` first. Most production value sits in Phase 4M–4O modules; older runtimes (`masterBuddyRuntime`, `reasonFirstBuddyRuntime`, `bibleBuddyLiteRuntime`) are alternate or experiment paths not wired to the primary chat route.

---

## Phase 4 Production Core (Reuse — Active)

| Module | Purpose | Production Status | Safe to Reuse? | Duplicate? | Memory Risk | Doctrine Risk | Phase 5A Role |
|--------|---------|-------------------|----------------|------------|-------------|---------------|---------------|
| `strictDoctrineGate.js` | Hard gate: strict doctrine never reaches OpenAI | **Live** — called from orchestrator | Yes | No — unique gate | Low | **Authority layer** — keep | Specialist for explicit strict topics |
| `doctrineFinalAuthorityEngine.js` | Builds approved witness-chain answers from contracts | **Live** | Yes | Partial overlap with `doctrineStrictSafeAnswer` | Low | **High authority** — do not bypass | Answer builder behind strict gate |
| `doctrineConversationState.js` | Session doctrine/Bible concept state, TTL fields | **Live** | Yes | No | Low (bounded per-user JSON) | State only — no doctrine mutation | State load/update in orchestrator |
| `doctrineLivePathHandlers.js` | Memory recall, before-that, witness continuation, correction | **Live** | Yes | Overlaps router continuation patterns | Low | Uses approved contracts only | Called via strict gate |
| `companionDoctrineRouter.js` | Two lanes, one router; current message wins | **Live** — feeds reasoning plan | Yes | Overlaps `companionTurnIntent` posture logic | Low | Routes correctly — low drift if lane honored | Intent/lane planner for orchestrator |
| `bibleConceptConcordance.js` | 8+ concepts, synonyms, witnesses | **Live** | Yes | Extended by `bibleConceptGraph` | Low (static in-memory) | Witness lists are curated — not auto doctrine | Base concordance for graph |
| `bibleWideReasoningEngine.js` | Line-upon-line Bible-wide answers + continuation | **Live** | Yes | Overlaps `bibleWideTopicDiscovery` (experimental) | Low | Uses concordance witnesses — not OpenAI doctrine | Bible-wide specialist |
| `userCorrectionMemory.js` | Session prefs (No-first, forbid Yes opener) | **Live** | Yes | Overlaps `reflectionMemoryEngine` (broader) | Low (bounded session map) | Prefs only — no doctrine promotion | Merged into reflection prefs path |
| `directAnswerFormatter.js` | Yes/No polarity, denial leak cleanup | **Live** | Yes | No | Low | Fixes polarity bugs | Post-process in orchestrator verify step |
| `claimToScriptureValidator.js` | Blocks unsupported Scripture claims | **Live** | Yes | Similar checks in `doctrineStrictValidator` | Low | Safety net after compose | Final validator |
| `doctrineTopicDetector.js` | Maps messages to strict topic ids | **Live** | Yes | Overlaps concordance strictTopic links | Low | Detection only | Used by router |
| `responseGuarantee.js` | Timeout + safe JSON wrapper for chat | **Live** — outer wrapper | Yes | No | Low | Emergency strict fallback | Layer 1 in routing order |
| `runtimeHealthMonitor.js` | RSS/heap tracking, memory pressure | **Live** | Yes | No | **Guard** — prevents OOM | None | Monitor only |
| `safeJsonlWriter.js` | Bounded append-only JSONL | **Live** | Yes | Overlaps raw `companionIntelligence` append | **Bounded** when used | Logging only | All new JSONL should use this |
| `stateTtlCleanup.js` | TTL cleanup for state files | **Live** | Yes | No | **Helps** Render stability | None | Background hygiene |

---

## Phase 5A New Modules (Created)

| Module | Purpose | Production Status | Safe to Reuse? | Duplicate? | Memory Risk | Doctrine Risk | Phase 5A Role |
|--------|---------|-------------------|----------------|------------|-------------|---------------|---------------|
| `bibleCompanionOrchestrator.js` | Single turn owner — 13-step pipeline | **Live** (integrated) | Yes | Overlaps orchestration in `openAiFirstCompanionRuntime` (reduced) | Low | Delegates to authority layers | **Primary orchestrator** |
| `bibleReasoningEngine.js` | Concept path + witness plan before answer | **Live** | Yes | Overlaps `bibleWideReasoningEngine` planning slice | Low | Plans from graph/concordance | Reasoning plan builder |
| `bibleConceptGraph.js` | Graph nodes extending concordance | **Live** | Yes | Extends `bibleConceptConcordance` — intentional | Low (static) | Curated witnesses | Concept detection upgrade |
| `reflectionMemoryEngine.js` | Correction/style memory → `data/reflection-memory.json` | **Live** | Yes | Extends `userCorrectionMemory` | **Bounded** (max records/TTL) | No auto doctrine promotion | Preference + learning candidates |
| `companionStateEngine.js` | Listener/teacher/prayer/clarifier modes | **Live** | Yes | Overlaps `griefCompanionResponse`, `companionTurnIntent` | Low | Companion tone only | Emotional/life lane |
| `pendingQuestionResolver.js` | "Why won't you answer?" → pending Q | **Live** | Yes | Partial overlap router emotional patterns | Low | Resolves stored question | Pending question specialist |

---

## Evidence & Support Graph (Reuse — Read Only)

| Module | Purpose | Production Status | Safe to Reuse? | Duplicate? | Memory Risk | Doctrine Risk | Phase 5A Role |
|--------|---------|-------------------|----------------|------------|-------------|---------------|---------------|
| `approvedEvidenceGraph.js` | Build graph from retrieval pack | Supporting retrieval | Yes | Overlaps `approvedSupportGraph` | Medium if full pack loaded every turn | Read-only from approved cards | Evidence context — not doctrine authority |
| `approvedSupportGraph.js` | Support relationship edges | Supporting | Yes | Pair with evidence graph | Medium | Read-only | Secondary retrieval |
| `retrievalEvidencePack.js` | Pack builder for chat | Live path | Yes | No | **Watch** — pack size per turn | Uses approved catalog | Input to strict gate |

---

## OpenAI / Compose Path

| Module | Purpose | Production Status | Safe to Reuse? | Duplicate? | Memory Risk | Doctrine Risk | Phase 5A Role |
|--------|---------|-------------------|----------------|------------|-------------|---------------|---------------|
| `openAiFirstCompanionRuntime.js` | Primary POST /buddy/chat runtime | **Live** | Yes | Many alternate runtimes exist | Medium (OpenAI context) | Orchestrator runs first — OpenAI fallback only | Integration host |
| `reasonFirstComposer.js` | OpenAI compose with evidence | Fallback compose | Yes | Overlaps `reasonFirstBuddyRuntime` | Medium | Validated post-compose | Fallback synthesis |
| `openaiClient.js` | OpenAI client singleton | Live | Yes | No | Low | External model — gated | Tone/synthesis only when allowed |

---

## Legacy / Experimental (Audit Before Use)

| Module | Purpose | Production Status | Safe to Reuse? | Duplicate? | Memory Risk | Doctrine Risk | Phase 5A Role |
|--------|---------|-------------------|----------------|------------|-------------|---------------|---------------|
| `companionIntelligence.js` | JSONL analytics events | Side-channel logging | Caution — unbounded if not using safeJsonlWriter | Overlaps reflection events | **Risk** if high volume | None | **Do not expand** — prefer safeJsonlWriter |
| `masterBuddyRuntime.js` | Sprint 2.FINAL master path | **Not primary** chat route | Reference only | Heavy duplicate of openAiFirst path | High (many subsystems) | Multiple doctrine presenters | **Do not wire** — reference patterns only |
| `healthCompanionResponse.js` | Health companion classifier | Partial — via master runtime | Yes for health mode | Overlaps `companionStateEngine` | Low | Non-doctrine | Health lane only |
| `companionConversationBehavior.js` | Conversation shape rules | Experimental | Partial | Overlaps router + state engine | Low | Low | Reference |
| `companionTurnIntent.js` | Posture classification (RACL) | Not on live openAiFirst path | Yes patterns | **Duplicate** of router intents | Low | Low | **Migrate patterns** — don't run parallel |
| `companionRetrievalHints.js` | Retrieval hint builder | Supporting | Yes | No | Low | Hints only | Optional retrieval boost |
| `conversationShapeAnalyzer.js` | Shape analytics | Experimental | Partial | Analytics only | Low | None | Analytics — not routing |
| `replySourceClassifier.js` | Classify reply provenance | Diagnostics | Yes | No | Low | None | Diagnostics |
| `reasonFirstBuddyRuntime.js` | BUDDY_RUNTIME=reason_first | Alternate env flag | Yes isolated | Duplicate of openAiFirst | Medium | Gated by validator | **Not Phase 5A primary** |
| `reasonFirstTrace.js` | Trace logging for reason_first | Alternate runtime | Yes | No | JSONL risk | None | Trace only |
| `bibleBuddyLiteRuntime.js` | Lite experiment — not wired to chat | Experiment only | Yes isolated | Duplicate OpenAI path | Low | Boundaries from doctrineBoundaries | **Do not wire** |
| `bibleWideTopicDiscovery.js` | Topic discovery experiment | Experimental | Partial | **Duplicate** of concordance/graph | Medium (discovery scans) | Risk if unapproved sources | **Superseded** by graph |
| `scriptureDiscoveryGenesisRevelation.js` | Genesis–Revelation discovery | Experimental / Phase 3 | Read-only discovery | Overlaps discovery pilots | Medium | Must not become authority | Discovery queue only |
| `scriptureReferenceNormalizer.js` | Normalize refs | Utility | Yes | No | Low | None | Utility |
| `supportRelationshipEngine.js` | Support graph engine | Supporting | Yes | Pairs with approvedSupportGraph | Medium | Read-only edges | Retrieval support |

---

## Duplicate Modules Found

1. **Routing / intent:** `companionDoctrineRouter` vs `companionTurnIntent` vs slices of `masterBuddyRuntime` — **keep router + orchestrator only on live path**.
2. **Bible concepts:** `bibleConceptConcordance` + `bibleConceptGraph` — **intentional extension**, not duplicate.
3. **Correction memory:** `userCorrectionMemory` + `reflectionMemoryEngine` — **reflection extends session prefs**; consolidate reads through reflection engine over time.
4. **Bible-wide discovery:** `bibleWideTopicDiscovery` vs `bibleWideReasoningEngine` — **reasoning engine is production**; discovery is experimental queue filler.
5. **Runtimes:** `openAiFirstCompanionRuntime` vs `reasonFirstBuddyRuntime` vs `masterBuddyRuntime` vs `bibleBuddyLiteRuntime` — **only openAiFirst is primary**.

---

## Memory Risk Summary

| Risk | Mitigation in Phase 5A |
|------|------------------------|
| Unbounded JSONL | `safeJsonlWriter`, `reflection-memory.json` caps, health monitor |
| Full runtimeContext in memory files | Not stored in reflection memory |
| Large evidence pack per turn | Existing retrieval pack — monitor via `runtimeHealthMonitor` |
| Legacy `companionIntelligence` raw append | Do not add new callers |

---

## Doctrine Risk Summary

| Risk | Mitigation |
|------|------------|
| OpenAI doctrine drift | `strictDoctrineGate` + orchestrator strict lane first |
| Wrong Yes/No polarity | `directAnswerFormatter` + user prefs |
| Validator leak after supported answer | `verifyOrchestratorOutput` + `claimToScriptureValidator` |
| Auto-promotion of user corrections to doctrine | Reflection engine stores candidates as `pending_review` only |
| Stale topic hijack | Phase 4M router + `before_that_recall` intent fix |

---

## Recommended Phase 5A Wiring (Achieved)

```
responseGuarantee
  → bibleCompanionOrchestrator
      → pendingQuestionResolver
      → companionDoctrineRouter (plan)
      → bibleReasoningEngine (plan)
      → companionStateEngine (emotional)
      → bibleWideReasoningEngine (concept lane)
      → strictDoctrineGate (strict lane)
  → openAiFirstCompanionRuntime fallback
  → validators / formatters
  → state + reflection memory update
```
