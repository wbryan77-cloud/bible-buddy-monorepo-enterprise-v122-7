# Biblical Knowledge Inventory — Phase 6A.1

Generated during PHASE 6 — Biblical Knowledge Completion. This inventory
reflects the repository state AFTER this batch's Local KJV Corpus
Completion and governed IOG/ICOJ ingestion work (both implemented in this
same batch — see FINAL-IMPLEMENTATION-REPORT.md for the full before/after).

Classification legend: `LIVE_PRODUCTION`, `APPROVED_NOT_LOADED`,
`CANDIDATE_PENDING_REVIEW`, `RAW_SOURCE_ONLY`, `DUPLICATED`, `SUPERSEDED`,
`ORPHANED`, `UNKNOWN_DO_NOT_TOUCH`.

## Local KJV Corpus

| Repository | Classification | Notes |
|---|---|---|
| `data/kjv-corpus/raw/` (66 books, 1189 chapters, 31,102 verses) | **LIVE_PRODUCTION** | Vendored from `bible-kjv@1.1.3` (MIT). Now Tier 1 of `services/bibleTextProvider.js` AND wired directly inside `services/canonicalScriptureProvider.fetchCanonicalScripture` so every existing production caller (`scriptureAuthorityEngine`, `groundedScriptureEngine`) resolves locally by default. See `data/kjv-corpus/CORPUS-METADATA.json` for full provenance/checksum. |
| `services/canonicalScriptureProvider.js` (bible-api.com) | **LIVE_PRODUCTION** (fallback tier) | Retained exactly as before, now only invoked when the local corpus cannot resolve a specific reference. |

## Canonical Scripture Providers / Adapters

| Repository | Classification | Notes |
|---|---|---|
| `services/bibleTextProvider.js` | **LIVE_PRODUCTION** (adapter, used by `routes/runtimeHealth.js` and test harnesses; not required by `scriptureAuthorityEngine`/`groundedScriptureEngine`, which call `canonicalScriptureProvider` directly) | Tier 1 now active (local corpus). |
| `services/localKjvCorpusProvider.js` | **LIVE_PRODUCTION** | New in this batch. |

## Scripture Evidence Cards

| Repository | Classification | Notes |
|---|---|---|
| `services/evidenceCards/*.card.js` (deathState, dietaryLaw, feasts, heavens, holiness, kingdom, lawCommandments, messiahLogos, sabbath, traditions) | **LIVE_PRODUCTION** | Confirmed live in prior batches (Knowledge Integration Lineage report); unchanged this batch. |

## Doctrine Packs / Topic Catalogs

| Repository | Classification | Notes |
|---|---|---|
| `services/doctrineAuthorityContract.js` (`BASE_CONTRACTS` — 10 strict topics: death_state, dietary_law, acts_10, sabbath, kingdom, resurrection, holy_spirit, david, new_jerusalem, heavens) | **LIVE_PRODUCTION** | Primary/supporting witness source of record for strict-doctrine answers. |
| `services/bibleConceptConcordance.js` (`CONCEPTS` — 8 entries) | **LIVE_PRODUCTION** | Natural-language concept detection + witness registry. |
| `services/bibleConceptGraph.js` (`MERGED_GRAPH` incl. `GRAPH_EXTENSIONS` — 25 total nodes) | **LIVE_PRODUCTION** | Adds `relatedConcepts` cross-reference links on top of the concordance. |
| `docs/evidence-candidates/master-topic-packs.json`, `matured-doctrine-packs.json`, `topic-approval-packs.json`, `enriched-topic-packs.json` | **CANDIDATE_PENDING_REVIEW** | Contain no verified `approve: true` marker for IOG/ICOJ content (confirmed by search in the prior Knowledge Integration batch); not loaded into any live `require()` closure. |

## Support Graphs / Concept Graphs / Concordances

| Repository | Classification | Notes |
|---|---|---|
| `services/approvedSupportGraph.js` | **LIVE_PRODUCTION** | Approved support edges used by the rules engine's duplicate-detection rule. |
| `services/supportGraphCandidateQueue.js` | **LIVE_PRODUCTION** | Append-only candidate/decision queue; extended this batch with Phase 6D metadata fields (backward compatible — see code comments). |
| `services/topicWitnessRegistry.js` | **LIVE_PRODUCTION** (new this batch) | Shared read-only aggregation of BASE_CONTRACTS + CONCEPTS + MERGED_GRAPH, used by the Phase 6A.2 coverage analyzer and the Phase 6D ingestion pipeline. |
| `data/approved-cross-references.jsonl` | **LIVE_PRODUCTION** (new this batch) | New governed, append-only "BIBLICAL_KNOWLEDGE" evidence-graph store. Populated exclusively by the rules engine's deterministic AUTO_APPROVED path; consumed live by `scriptureAuthorityEngine.buildCrossReferencesForConcept`. |
| `data/knowledge-audit-log.jsonl` | **LIVE_PRODUCTION** (new this batch) | Immutable audit log for every promotion/rejection/queue action taken by the Phase 6D pipeline. |

## IOG / ICOJ Extracts

| Repository | Classification | Notes |
|---|---|---|
| `docs/evidence-candidates/icoj-pdf-extraction-review.json` (47 documents, 910 total Scripture-reference mentions) | **RAW_SOURCE_ONLY** → now has a governed derivative | The file itself remains raw/unmodified (never loaded into any live answer path directly). This batch built `services/iogIcojGovernedIngestion.js`, which reads it as an ACQUIRE-stage input and produces governed derivatives: 135 `AUTO_APPROVED` cross-references (now `LIVE_PRODUCTION` via `data/approved-cross-references.jsonl`), 532 `NEEDS_ADMIN_REVIEW` candidates (now `CANDIDATE_PENDING_REVIEW` via `data/support-graph-candidates.jsonl`), 14 `AUTO_REJECTED_DUPLICATE`, 3 `AUTO_REJECTED_INVALID_REFERENCE`, 226 unclassified (no deterministic topic match — recorded, not queued, not discarded silently). |
| `docs/evidence-candidates/icoj-pdf-human-review-pipeline.json` | **RAW_SOURCE_ONLY** | Not yet re-run through the new Phase 6D pipeline in this batch; a follow-on task, not a blocker (no production dependency on it). |
| `docs/evidence-candidates/youtube-transcripts/IOGIsrael/*.vtt`, `docs/evidence-candidates/youtube-transcripts/The Israel of God 📖/*.vtt` (240 files, ~158MB) | **RAW_SOURCE_ONLY** | Inventoried this batch (`iogIcojGovernedIngestion.acquireIogTranscriptSources()` — immutable metadata recorded per file: sourceId, sourceType, sourceLocation, size). Full transcript parsing (speech-to-Scripture extraction) is out of scope for this batch — see FINAL-IMPLEMENTATION-REPORT.md "technical debt" for the documented follow-on plan. Never loaded into any live answer path. |

## Historical References

| Repository | Classification | Notes |
|---|---|---|
| (none found in the live repository as structured historical-record data) | **UNKNOWN — NOT PRESENT** | No pre-existing historical-record dataset was found. Phase 6C implements the contract/trust-tier schema (`services/historicalKnowledgeProvider.js`) with zero seeded production-eligible records — see Phase 6C section of the final report for the exact scope decision (schema-first, no fabricated historical claims). |

## Original-Language Seeds

| Repository | Classification | Notes |
|---|---|---|
| (no OSHB/MorphGNT/STEPBible dataset found in-repo or importable within this batch's network access — see Phase 6B section of the final report) | **UNKNOWN_DO_NOT_TOUCH / BLOCKED** | `services/originalLanguageProvider.js` (this batch) implements the `getPassageStudy` contract and a small, explicitly-labeled seed dataset (hand-verified against the KJV translators' own marginal notes already present in the vendored corpus — e.g. Genesis 1:1, Exodus 3:14 — for the 10 batch-mandated validation references only). Full OSHB/MorphGNT import is a documented, licensable follow-on (public/open-license datasets exist on GitHub, e.g. openscriptures/morphhb, MorphGNT), not completed in this batch due to time/scope, not a licensing blocker. |

## Generated Reports / Orphaned Evidence

| Repository | Classification | Notes |
|---|---|---|
| `docs/alpha/**` (hundreds of prior-batch evidence folders) | **ORPHANED** (documentation only) | Historical audit trail; none of it is `require()`d by production code. Preserved, never deleted, per transactional-safety rules. |
| `services/runtime*.js` (226 files, ~10 confirmed near-duplicate pairs) | **ORPHANED** | Confirmed in the prior "Knowledge Integration, Lineage & Production Simplification" batch — not reachable from any production entry point. Untouched this batch (no redesign mandate). |

## Summary Counts

- Local KJV corpus: 66/66 books **LIVE_PRODUCTION** (new this batch).
- Doctrine/topic sources: 3 live modules (BASE_CONTRACTS, CONCEPTS, MERGED_GRAPH) = 25 unified topic identifiers.
- Governed IOG/ICOJ derivatives promoted to production this batch: 135 cross-references.
- Governed IOG/ICOJ derivatives pending Admin review: 532 candidates.
- Raw IOG/ICOJ source material never loaded into any live answer path: 47 PDF-extraction records + 240 transcript files.
