# PHASE 6F — PART 6: Continual Knowledge Growth and Self-Sustainability

## Definition (restated per batch)

"Self-sustainable" means BibleBuddy increasingly answers from its own
approved local knowledge stores rather than a live external API. It does
**not** mean unsupervised doctrinal self-modification — nothing in this
system ever promotes to production without a governed pipeline step
(deterministic rules engine and/or Admin review).

## Verified local-first infrastructure

| Requirement | Status | Evidence |
|---|---|---|
| Local KJV default | ✅ VERIFIED | `services/canonicalScriptureProvider.js` calls `getLocalPassage()` (local `data/kjv-corpus/`) first; `https://bible-api.com` (env-overridable) is only reached on local miss. `services/bibleTextProvider.js` follows the same local-first chain. |
| Local original-language datasets | ✅ VERIFIED | `data/original-language/` (OSHB Hebrew/Aramaic, Nestle 1904 Greek, Strong's dictionaries) — `services/originalLanguageProvider.js` never calls a network API; see Part 4. |
| Local promoted relationship graph | ✅ VERIFIED | `data/approved-cross-references.jsonl`, `data/approved-book-relationships.jsonl` — read by `services/scriptureRelationshipGraph.js` at require-time, no runtime network call. |
| Local approved historical records | ✅ VERIFIED | `services/historicalKnowledgeProvider.js` — 13 seed records (Part 5), in-process array, no network call. |
| Local approved common questions | ⚠️ PARTIAL | `data/alpha-conversations.jsonl`, `data/buddy-quality-events.jsonl` capture real usage, but there is no curated "top common questions" cache distinct from the live conversation log. Not a Founder Alpha blocker — logged for post-Alpha (`DEFER_POST_ALPHA`). |
| Local evidence and lineage | ✅ VERIFIED | `services/scriptureAuthorityLedger.js`, `services/doctrineAnswerTrace.js`, `services/reasoningSnapshot.js` persist evidence/lineage locally; confirmed live in Phase 6 knowledge-lineage HTTP verification. |
| Incremental indexing | ✅ VERIFIED | `services/knowledgeCoverageAnalyticsEngine.js` and `services/knowledgePipelineAnalytics.js` recompute from current approved-data files each run (idempotent, not additive-only, but bounded and offline — see Phase 6E `performance_*` regression gates). |
| Deterministic cache/version management | ✅ VERIFIED | `services/knowledgeAnalyticsSnapshotStore.js` writes versioned JSON snapshots to `data/analytics-snapshots/`; the Admin dashboard reads only these, never recomputes per-request (Phase 6E `performance_dashboard_reads_precomputed_snapshot_only` regression). |
| Dataset checksums | ✅ VERIFIED | `services/knowledgeDriftDetector.js` computes a SHA-256 checksum (`crypto.createHash('sha256')`) over every full knowledge snapshot for tamper-evidence, and every drift comparison records `before.checksum`/`after.checksum`. |
| Resumable acquisition jobs | ⚠️ PARTIAL | `services/iogIcojGovernedIngestion.js` supports `persist=false` dry-run vs `persist=true` apply, and re-running is idempotent (duplicate detection prevents double-promotion — verified in Part 3). There is no formal crash-resume checkpoint/queue for a job interrupted mid-run; a re-run from the start is safe (idempotent) but not literally "resume from position N." Documented honestly as `DEFER_POST_ALPHA` — acceptable because current job sizes (dozens to low hundreds of items) complete in seconds, not hours. |
| Failed-job recovery | ⚠️ PARTIAL | Same as above — safe idempotent re-run exists; no automatic retry/backoff daemon exists yet. `FEATURE_FLAG_OFF`/`DEFER_POST_ALPHA` for Founder Alpha scale. |
| Source version tracking | ✅ VERIFIED | Every historical/relationship/IOG-ICOJ record carries `provenance`, `licensingStatus`, and a stable `id`/`key`; `KnowledgeDriftReport.json` diffs snapshot-to-snapshot. |
| Promotion rollback | ✅ VERIFIED | `services/knowledgeDriftDetector.js`'s `drift_rollback_comparison_does_not_require_new_approval` regression (Phase 6E test matrix) proves a rollback-to-known-good comparison is supported without re-triggering the full approval gate. |
| Knowledge snapshots | ✅ VERIFIED | `data/analytics-snapshots/KnowledgeStateSnapshot.json` (part of the 12-file snapshot set regenerated in Part 5). |
| Drift reports | ✅ VERIFIED | `data/analytics-snapshots/KnowledgeDriftReport.json`; regenerated in Part 5, correctly flagged `HIGH_AUTHORITY_CHANGE` immediately after Part 2/5 witness additions and `LOW_METADATA_ONLY` after a metadata-only registry change — proving the risk classifier is sensitive to the actual kind of change made. |
| Admin exception queue | ✅ VERIFIED | `services/supportGraphCandidateQueue.js` + `routes/bibleAuthorityAdmin.js`; live-tested in Phase 6 (`FinalImplementationReport.md`) and reused throughout Parts 2-3 of this batch (every candidate this batch created that wasn't canon-explicit was correctly routed to `NEEDS_HUMAN_REVIEW` rather than silently auto-promoted). |

## API-dependency metrics

| Dependency | Purpose | Current provider | Local alternative | Runtime criticality | Licensing limitation | Cost/rate limitation | Outage behavior | Migration readiness | Disposition |
|---|---|---|---|---|---|---|---|---|---|
| Canonical Scripture text | KJV verse retrieval | `bible-api.com` (fallback only) | `data/kjv-corpus/` (local, complete, Tier 1 — Phase 6A) | LOW (local corpus is primary; API is fallback-only) | Public-domain KJV text, no licensing risk | Free tier, generous | Falls back to local corpus automatically; no user-facing failure observed in testing | Already migrated — local is primary | **KEEP_AS_FALLBACK** |
| Companion reasoning / doctrine answer synthesis / intent classification | Natural-language understanding, reason-first answers, clarifier generation | OpenAI API (GPT models) | None (no local LLM) | HIGH — companion mode, intent classification, and any answer path outside explicit-reference/original-language/historical lanes depends on this | Standard OpenAI commercial API terms; no redistribution restriction on BibleBuddy's own generated replies | Metered by token; a sustained outage or missing `OPENAI_API_KEY` was reproduced during this batch (see Errors/fixes) and correctly fell through to a safe generic response rather than fabricating | Verified during this batch: with no key loaded, casual/ordinary-phrasing questions fell to a clarifier prompt instead of crashing — safe degradation, not silent hallucination | No local substitute planned or appropriate at current maturity | **KEEP_AS_PRIMARY** |
| Original-language datasets (Hebrew/Aramaic/Greek morphology, lemma, Strong's) | Word-study responses | Local only (OSHB, Nestle 1904, Strong's — vendored) | N/A — already fully local | LOW | CC0/CC BY-SA per-dataset, already compliant (attributed per token via `sourceDataset`) | None (no network call) | N/A — no network dependency | Already fully local | **REPLACE_WITH_LOCAL** *(already done — no action needed)* |
| Historical/IOG-ICOJ raw source ingestion | Discovery-only input to the governed pipeline | Locally-stored PDFs/metadata (`data/full-corpus-source-registry.json` etc.) | N/A — already local, no live scraping | LOW (offline, non-hot-path) | IOG/ICOJ raw prose intentionally excluded pending licensing clarity (Part 3) | N/A | N/A | Governed pipeline is ready the moment licensing is resolved | **DEFER** (licensing, not technical) |
| Food data (Open Food Facts) | Ingredient/nutrition lookups | Not integrated live in this batch's verification scope | N/A | Feature-flagged off for Founder Alpha (Part 10) | Open Food Facts is ODbL-licensed, permissive for this use | Free, rate-limited | Feature is off — no user-facing outage possible | Behind a flag, not wired to hot path | **PILOT_BEHIND_FLAG** |
| Health data (Apple HealthKit / Android Health Connect) | Optional health context | Not integrated | N/A | Feature-flagged off | Requires platform-specific consent flows not yet built | N/A | Feature is off | Not started | **DEFER** |
| Voice / TTS-STT | Optional voice companion | Not verified as live-wired in this batch | Browser-native speech API scaffolds referenced in earlier phases | Feature-flagged off | OpenAI Realtime/audio has standard commercial terms if adopted later | N/A | Feature is off | Deferred | **DEFER** |
| Avatar/presence | Optional visual presence | Not verified as live-wired in this batch | Animated local orb (non-video) preferred per original vision | Feature-flagged off | D-ID (if ever adopted) has per-minute costs and third-party dependency — avoid for Alpha | N/A | Feature is off | Deferred | **DO_NOT_ADOPT** (D-ID); **PILOT_BEHIND_FLAG** (local orb, post-Alpha) |

## Governance boundary (re-confirmed)

No dataset, historical record, cross-reference, or relationship added in
this batch (Parts 2, 3, 5) entered production by bypassing the governed
pipeline. Every addition was either:

1. A direct, KJV-verified, canon-explicit typed relationship promoted by
   the batch operator acting as the designated reviewer (Part 2A/2B), or
2. A hand-curated seed record added the same way the existing Phase 6C
   seed records were added (Part 5) — i.e. an engineer/Admin action, not
   autonomous acquisition.

No autonomous scraping, no AI-generated doctrine, and no unsupervised
self-modification occurred. This matches the batch's explicit prohibition.
