# Phase 6X Option D — Controlled Systemic Recovery Report

**Mode:** Production Safe · Evidence Driven · Incremental · No Greenfield Rewrite  
**Authorization:** Option D supersedes B, replaces C  
**Status:** IN PROGRESS (Objective 1 COMPLETE locally; deploy + live replay pending)

---

## Objective 1 — Semantic Understanding — COMPLETE (local)

### Evidence
- Founder Engineering History / Conversation Analysis / Behavior families BF-15 (matrix closed; expand on FAIL)
- Gate 3 multi-part governance already prevents bible_wide short-circuit on mixed-intent turns
- Live path used multiple single-label classifiers (`questionIntentResolver`, `currentMessageIntent`, `reasoningSnapshot`, etc.) without one structured primary/secondary object

### Root cause
Understanding signals existed but were not aggregated into a single pack-visible snapshot. Composers/orchestrator could not reliably read primary vs secondary intent, requested format/evidence/depth, or mixed-intent flags from one place. Multi-part detection was duplicated in the orchestrator.

### Implementation (smallest change)
| Item | Detail |
|---|---|
| **Reason** | Support mixed-intent + structured understanding without replacing certified classifiers |
| **Subsystem** | `services/semanticUnderstandingSnapshot.js` + `retrievalEvidencePack` + shared multi-part helper |
| **Root cause** | Fragmented intent signals; no pack-level primary/secondary object |
| **Change** | Aggregate existing signals into `semanticUnderstanding` on the evidence pack; orchestrator multi-part delegates to shared helper |
| **Not done** | No new Semantic Engine; no keyword-only router replacement; no Founder special-cases |

### Fields produced
`primaryIntent`, `secondaryIntents`, `mixedIntent`, `requestedAction`, `requestedFormat`, `requestedEvidence`, `requestedDepth`, `requestedComparison`, `outstandingQuestions`, `conversationObjective`, `emotionalContext`, `latestMessagePriority`

### Regression evidence (local)
- `node tests/phase6xObj1SemanticUnderstanding.test.js` → **PASS**
- Pack probe: mixed-intent message → `semanticUnderstanding.mixedIntent === true`, secondary intents present
- Syntax check: snapshot, pack, orchestrator → OK

### Expected behavioral improvement
Downstream composers/guards can read mixed intent and requested evidence/format from the pack without inventing parallel classification. Multi-part rule stays single-sourced (Gate 3 invariant preserved).

### Live production
Requires deploy of this commit tip. Post-deploy: replay FTC B1 / Gate 3 G8 multipart / Gate 4 J multipart.

---

## Objectives 2–9

Pending sequential execution per Option D Rule 4.

---

## Objective 2 — Conversation Intelligence — COMPLETE (local)

### Evidence
- Obj2 audit: state fragmented across `activeConversationManager`, correction ledger, and pack `semanticUnderstanding`; no verified production FAIL (go-deeper concurrent flake remains unreproduced P2)
- Gap: `outstandingQuestions` / format / evidence prefs were ephemeral and not passed to `reasonFirstComposer`; corrections soft-replaced via ledger only

### Root cause
Conversation intelligence fields were computed (Obj1) but not wired into durable thread state or composer userPayload, so mixed-intent carryover and preferred style/evidence could not influence the live reply or next-turn thread context.

### Implementation (smallest change)
| Item | Detail |
|---|---|
| **Reason** | Make outstanding questions, objective, prefs, and correction replace visible without a new Conversation Intelligence store |
| **Subsystem** | `reasonFirstComposer`, `activeConversationManager`, `buddyBrain` record turn, `openAiFirstCompanionRuntime` runtimeContext |
| **Root cause** | Pack intelligence not surfaced to composer or thread persistence |
| **Change** | Pass slim `semanticUnderstanding` into composer payloads; persist intelligence fields on active conversation; on correction set `rejectedInterpretation` / `acceptedCorrection`; clear those on non-correction |
| **Not done** | No new CI store; no concurrent file-lock for go-deeper P2 until repro |

### Regression evidence (local)
- `node tests/phase6xObj2ConversationIntelligence.test.js` → **PASS**
- Obj1 unit still **PASS**
- Syntax check on touched services → OK

### Expected behavioral improvement
Composer sees mixed intent / outstanding questions / preferred evidence; thread retains those for continuity; corrections immediately overwrite rejected interpretation fields.

### Live production
Requires deploy of Obj2 tip. Post-deploy: FTC continuity + Gate 3 correction probes; serial go-deeper still expected green.

---

## Objective 3 — Unified Evidence Broker — COMPLETE (local)

### Evidence
- BF-10 mitigated; E1 PARTIAL utilization; dual-path audit: bible_wide consulted approved IOG/ICOJ xrefs, OpenAI pack did not
- Users never needed to say “IOG”; gap was path ownership, not keyword gate

### Root cause
`readApprovedCrossReferences` wired only in `scriptureAuthorityEngine`; `retrievalEvidencePack` never auto-consulted the same store.

### Implementation
| Item | Detail |
|---|---|
| **Reason** | Make approved repositories consistently consulted on the live OpenAI pack path |
| **Subsystem** | Evidence broker (`retrievalEvidencePack`) — extend, do not replace |
| **Root cause** | Dual retrieval owners; pack missing approved xref consult |
| **Change** | `retrieveApprovedCrossReferenceEvidence`; attach to pack + supplemental scripture refs; `brokerConsult` telemetry; composer evidence slice |
| **Not done** | KJV hydrate; history/OL phrase-gate redesign; second broker |

### Regression
`tests/phase6xObj3EvidenceBroker.test.js` PASS; Obj1/Obj2 still PASS.

### Docs
`10-EvidenceBrokerVerification.md`, `14-IOGRetrievalVerification.md`, `15-ICOJRetrievalVerification.md`

---

## Objectives 4–8 — COMPLETE (local)

### Obj4 Truth classification
Extended `truthClassificationGuidance` into reason-first composer. Categories never merge. Docs: `13-HistoricalClassificationVerification.md`.

### Obj5 Response composer
Composition order + anti-verbosity in `COMPOSER_INSTRUCTION`; polish strips transactional openers. Composer not replaced.

### Obj6 General knowledge
**FAIL evidence:** capital of France / photosynthesis → clarifier on production.  
**Root cause:** over-broad `UNKNOWN_BIBLE_RE`.  
**Repair:** `isUnknownBiblePhraseAsk` + `GENERAL_FACTUAL` intent. Docs: `11-OpenAIRoutingAudit.md`, `12-GeneralKnowledgeRecovery.md`.

### Obj7–8 Companion engine / quality
Tone guidance + polish; measurable `scoreCompanionQuality` dimensions. Docs: `09-CompanionQualityReport.md`.

### Regression
`tests/phase6xObj4to6.test.js` PASS; Obj1–3 still PASS.

---

## Objective 9 — Founder Truth Corpus V2 — COMPLETE (artifact)

`08-FounderTruthCorpusV2.md` + `scripts/runFounderTruthCorpusV2.js` (live after deploy).

---

## Certification status

**NOT YET GO_FOR_FOUNDER_ALPHA under Option D** until production deploy + live FTC + V2 + prior Gate suites pass on the new tip.

Auth / streaming / memory ownership / claim verifier / certified runtime path: preserved (extend-only).


