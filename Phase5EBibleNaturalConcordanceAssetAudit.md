# Phase 5E — Bible Natural Concordance Asset Audit

**Date:** 2026-06-14  
**Scope:** Reuse existing assets before building BNC; no corpus/evidence/doctrine/witness mutation.

## Mission

Map natural language, typos, and synonyms to Bible concepts using **existing** inventories — BNC is a language bridge, not doctrine authority.

## Assets Inspected

| Location | Finding | Reuse decision |
|----------|---------|----------------|
| `services/evidenceCards/` | 10 doctrine topics (death_state, dietary_law, kingdom, sabbath, heavens, etc.) | **Read-only** source for BNC builder topic labels |
| `docs/bible-learning/approved-doctrine-registry.json` | Approved strict topics + witness refs | **Reused** for strictTopic mapping |
| `docs/bible-learning/concordance-index-plan.json` | Prior concordance plan | **Referenced**; not duplicated |
| `docs/regression-trace/` | Live failure phrases | **Sampled** where present |
| `services/bibleConceptGraph.js` | Primary concept nodes, witnesses, forbidden confusions | **Extended** (12+ concepts); detection order tuned |
| `services/bibleConceptConcordance.js` | Phrase → concept synonyms | **Extended** (heaven-on-earth phrases) |
| `services/bibleWideReasoningEngine.js` | Bible-wide answer lane | **Wired** to semantic normalizer + BNC safety |
| `services/bibleCompanionOrchestrator.js` | Routing hub | **Updated** for learning candidates, follow-ups |
| `services/reflectionMemoryEngine.js` | Session memory | **Extended** with `recordConceptLearningCandidate` |
| `services/userCorrectionMemory.js` | User prefs | **Reused** unchanged |
| `services/pendingQuestionResolver.js` | Pending Q challenges | **Reused** unchanged |
| `services/retrievalEvidencePack.js` | Evidence pack assembly | **Reused** unchanged |
| `services/approvedCatalogEvidence.js` | Catalog witnesses | **Read-only** BNC scan |
| `services/approvedEvidenceGraph.js` | Evidence graph | **Read-only** BNC scan |
| `services/approvedSupportGraph.js` | Support graph | **Read-only** BNC scan |
| `services/companionDoctrineRouter.js` | Doctrine routing | **Updated** stale-topic + before-that routing |
| `services/doctrineConversationState.js` | Topic memory | **Extended** topicHistory, lastAnsweredConcept |
| `services/doctrineTopicDetector.js` | Strict topic patterns | **Tuned** (abomination removed from dietary) |
| `services/directAnswerFormatter.js` | Doctrine opener style | **Updated** "No. Staying with Scripture…" |
| `services/companionStateEngine.js` | Prayer/overwhelmed | **Updated** actual prayer + comfort |
| Phase4*.md reports | Prior phase audits | **Referenced** for failure patterns |
| Phase5A*.md reports | Orchestration baseline | **Referenced** for routing contracts |

## Duplicate Concept Systems (not rebuilt)

1. **Strict doctrine topics** (`doctrineTopicDetector`, evidence cards, BASE_CONTRACTS) — authority for strict lanes.
2. **Bible concept graph** (`bibleConceptGraph.js`) — witnesses + direct answers for bible_wide.
3. **BNC generated map** (`bible-natural-concordance.generated.json`) — scan output only.
4. **Semantic normalizer** — runtime phrase/typo bridge atop graph + BNC.

Authority order preserved: user message → BNC match → strict doctrine → witnesses → formatters.

## Prior Failure Phrases Addressed

| Live phrase | Root issue | BNC / routing fix |
|-------------|-----------|-------------------|
| "abomination talk about by Daniel" | Dietary hijack | `abomination_desolation` before dietary in detection order |
| "abomination of desalation" | Typo | TYPO_MAP `desalation→desolation` |
| "Give me more scriptures on that" (after kingdom) | heaven_layers drift | `followUpContextResolver` continues lastAnsweredConcept |
| "Can you have sex" | Weak single verse | `fornication_sexual_sin` + 3 witness refs |
| Pull-out mechanics question | Missing boundary first | Sexual boundary style in formatter |
| "Put it in your database" | False denial | `recordConceptLearningCandidate` pending_review |
| sed / sleeping together / premarital | Missing aliases | BNC + graph aliases |
| Pork then abomination | Stale topic hijack | `shouldClearStaleTopic` + strong-new-topic clear |

## Evidence Card Topics (read-only)

- death_state, dietary_law, feasts, heavens, holiness, kingdom, law_commandments, messiah_logos, sabbath, traditions

## Doctrine Pack Names (not modified)

Sourced from evidence cards and `approved-doctrine-registry.json` — no pack files edited.

## Witness Chain Labels (not modified)

Witness inventory from graph + approved catalog — no witness chain files edited.

## Question Inventories Found

- `scripts/runPhase4HDoctrineParityRegression.js` — Acts 10, death, memory, dietary
- `scripts/runPhase5EBibleNaturalConcordanceRegression.js` — 18 BNC scenarios
- `scripts/runPhase5ABibleCompanionOrchestrationRegression.js` — orchestration
- `scripts/runPhase4OBibleWideReasoningRegression.js` — bible_wide
- Phase 4D/4E live path regressions — continuation + memory

## Build vs Reuse Summary

| Component | Action |
|-----------|--------|
| `bibleNaturalConcordanceBuilder.js` | **New** — scans assets, writes generated JSON only |
| `bibleSemanticConceptNormalizer.js` | **New** — runtime normalization |
| `followUpContextResolver.js` | **New** — continuation + actor questions |
| `bncSafetyValidator.js` | **New** — false-doctrine safety gate |
| `bibleConceptGraph.js` | **Extended** — not replaced |
| Evidence cards / doctrine packs | **Not modified** |

## Safe for Controlled Deploy

**Yes (local)** — BNC layer is additive; authority files untouched. Render production still requires push of prior missing modules (Phase 5B/5C).
