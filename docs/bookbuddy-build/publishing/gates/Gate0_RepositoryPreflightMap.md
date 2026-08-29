# Gate 0 — Repository / Corpus Preflight Map

**Status:** PASS (reuse map complete; publishing workspace separated)  
**Controlling instruction:** `docs/bookbuddy-build/BookBuddy_CURSOR_BUILD_FINAL_2026-08-28/START_HERE_CURSOR_BUILD_MASTER_FINAL.md`  
**Date:** 2026-08-28  
**Production mutation:** NONE required for manuscript build

## Decision

Reuse existing BibleBuddy evidence / history / original-language / Study Chain / G2R / IOG / ICOJ infrastructure. BookBuddy writes only under `docs/bookbuddy-build/publishing/`. Do not create a parallel evidence or doctrine engine.

## Publishing workspace

| Path | Role |
|---|---|
| `docs/bookbuddy-build/BookBuddy_CURSOR_BUILD_FINAL_2026-08-28/` | Final source drop (manifest, derivatives, support) |
| `docs/bookbuddy-build/publishing/` | All BookBuddy research + manuscript outputs |
| `docs/bookbuddy-build/publishing/gates/` | Gate milestone reports |
| `docs/bookbuddy-build/publishing/craft/` | Seven-bestseller craft lab |
| `docs/bookbuddy-build/publishing/four-winds/` | Four Winds claim ledger (verified attachments by reference only) |
| `docs/bookbuddy-build/publishing/matrices/` | Life/topic/comparison matrices |
| `docs/bookbuddy-build/publishing/manuscript/` | Pilot + controlled chapter drafts |

## Artifact map (locate-by-content where filenames moved)

### Sprint / freeze / inventory names from master

| Logical name | Located? | Current path / note | BookBuddy may READ | Extension point |
|---|---|---|---|---|
| SprintResumeCheckpoint | YES | `docs/evidence-candidates/SprintResumeCheckpoint.md` (+ BIE v1.3c/v1.3d copies) | YES | Read-only continuity; do not reopen closed product sprints |
| HistoricalCorpusFreeze | BY CONTENT | Referenced in `docs/evidence-candidates/bible-intelligence-engine-phase1c/00_PreflightSnapshot.md` | YES | Attach Four Winds only after verification; no new freeze file |
| HistoricalReferenceInventory | EQUIVALENT | Covered by phase1c historical audits + `services/historicalReferenceIndex.js` | YES | Claim matches against index IDs |
| HistoricalVerificationQueue / BookAndArticleList / SourceCitationQualityReport | EQUIVALENT / DISTRIBUTED | phase1c historical docs; `data/analytics-snapshots/Historical*.json` | YES | Publishing ledger tracks manuscript claims |
| BookIntegrationAssessment | EQUIVALENT | `docs/evidence-candidates/bible-intelligence-engine-v1.3d-full-product-proof/17_BookProof.md`, phase1c `09_ApprovedBooksActivationAudit.md` | YES | Reference INDEXED_ONLY books carefully |
| BibleIntelligence* inventories / matrices | YES (distributed) | `docs/bible-intelligence-engine/`, BIE evidence-candidate folders, root `*GenesisToRevelation*.md` | YES | Prefer existing G2R/chain objects |
| FounderKnowledgeAssessment | EQUIVALENT | Founder corpus / certification packs under `docs/evidence-candidates/` | YES | Read-only |

### Runtime historical / evidence owners (DO NOT MUTATE for BookBuddy)

| Path | Function | Status | READ | Mutate? |
|---|---|---|---|---|
| `services/historicalEvidenceLayer.js` | Historical evidence layer entry | Active thin owner | YES | NO |
| `services/historicalReferenceIndex.js` | Reference index | Active | YES | NO |
| `services/runtimeHistoricalReferenceLayer.js` | Runtime historical refs | Active | YES | NO |
| `services/historicalReferenceSeparation.js` | Separation of ref classes | Active | YES | NO |
| `services/historicalKnowledgeProvider.js` | Historical knowledge provider | Active | YES | NO |
| `services/historicalContextRouter.js` | Context routing | Active | YES | NO |
| `services/runtimeCanonicalHistoricalTimelineEngine.js` | Timeline engine | Active | YES | NO |
| `services/runtimeScriptureContinuityHistoricalEngine.js` | Continuity + history | Active | YES | NO |

### Original language (governed)

| Path | Function | Notes |
|---|---|---|
| `services/originalLanguageProvider.js` | Source-grounded OT/NT study | **Reuse this.** OSHB Hebrew/Aramaic + Nestle1904 Greek (not SBLGNT/MACULA — use governed repo source) |
| `data/original-language/CORPUS-METADATA.json` | Corpus license/provenance | Authority for claims |
| `data/original-language/hebrew-aramaic/raw/` | OSHB XML | Primary OT |
| `data/original-language/greek/raw/Nestle1904.csv` | Greek morphology | Primary NT |
| `data/original-language/strongs/` | Strong's dictionaries | Gloss support |
| `docs/bible-learning/original-language-chain-sample.json` | Sample chain shape | Template for manuscript audit packets |

### IOG / ICOJ / Holy Testaments / Study Chain / Precept / G2R

| Path | Function | BookBuddy use |
|---|---|---|
| `services/iogIcojGovernedIngestion.js` | Governed IOG/ICOJ ingestion | READ owners/status only |
| `data/approved-cross-references.jsonl` | Approved IOG/ICOJ cross-refs | Cite approved links only |
| `data/approved-book-relationships.jsonl` | Approved book relationships | Cite only |
| `docs/recovery/certification-v5/11-IOG-ICOJ-Utilization*` | Utilization proof | READ |
| `docs/recovery/phase6x/14-IOGRetrievalVerification.md` | IOG retrieval | READ |
| `docs/recovery/phase6x/15-ICOJRetrievalVerification.md` | ICOJ retrieval | READ |
| `services/studyChainEvaluation.js` | Study Chain evaluation (includes Holy Testaments corpus tag) | READ; do not invent parallel chains |
| `services/runtimeScripturePreceptEngine.js` | Precept engine | READ |
| `lib/precept/` | Precept library | READ |
| Root/docs `*GenesisToRevelation*`, `ExpandedGenesisToRevelationChains.md`, `MasterGenesisToRevelationExpansion.md` | G2R expansion artifacts | Prefer existing chains in manuscripts |
| `ICOJPDFExtractionReview.md`, `IOGIngestion*.md` | Ingestion status | READ |

Holy Testaments appear as a **corpus class** inside Study Chain evaluation (`corpus === 'Holy Testaments'`), not as a standalone `HolyTestament*.md` tree at repo root. Do not rebuild.

### Approved historical books (World Scope / Last Two Million Years / Jasher)

| Path | Status for BookBuddy |
|---|---|
| `docs/evidence-candidates/bible-intelligence-engine-phase1c/09_ApprovedBooksActivationAudit.md` | Three books tracked; treat as INDEXED_ONLY / edition-sensitive |
| `docs/evidence-candidates/bible-intelligence-engine-v1.3d-full-product-proof/17_BookProof.md` | Confirms INDEXED_ONLY / edition-unresolved — **no status promotion** |
| Last Two Million Years p.87 “Faith survives the dispersion” | Prior governed tracking noted in BookBuddy diagnosis — locate via historical audits before citing |

### Four Winds

| Path | Status |
|---|---|
| Drop derivative `07_CURSOR_TEXT_DERIVATIVES/The_Four_Winds_of_Heaven_The_Israel_of_God_Henry_Buie.txt` | FULL text present (~4156 lines) |
| Prior BibleBuddy runtime integration | **Not found as a dedicated production evidence object** — Gate 2 builds publishing ledger + reuse map only; no auto-promotion |

### Prior BookBuddy artifacts

| Path | Note |
|---|---|
| `docs/bookbuddy-build/.../10_SUPPORT/BOOKBUDDY_PRE_CURSOR_DIAGNOSIS.md` | Superseded strategy notes; useful but master controls |
| `docs/bookbuddy-build/.../SOURCE_MANIFEST_FINAL.json` | Closed corpus inventory |
| `docs/bookbuddy-build/.../10_SUPPORT/SOURCE_INTEGRITY_REPORT.json` | SHA inventory of drop |

## Conflicts / duplicates

1. Multiple `SprintResumeCheckpoint` copies across BIE evidence folders — use latest relevant + do not reopen closed product items.
2. Master names exact filenames that often exist as **distributed equivalents** under `docs/evidence-candidates/` and `services/` — map by function, not invent new systems.
3. Original-language preference wording (SBLGNT/MACULA) vs repo reality (Nestle1904 + OSHB) — **repo governed source wins**.
4. Pre-cursor diagnosis asked for founder architecture approval; **BUILD MASTER supersedes** — select architecture from evidence unless a genuine unresolved theological fork appears.
5. Modern bestseller OCR derivatives — craft analysis only; originality required for manuscript stories.

## Production code touch?

| Touch type | Allowed in this sprint? |
|---|---|
| Manuscript / publishing docs under `docs/bookbuddy-build/publishing/` | YES |
| Attaching verified Four Winds claims into production evidence objects | ONLY if separately justified + regressions; default **defer** — use publishing ledger + reference existing objects |
| Doctrine / runtime mutation | **NO** for BookBuddy writing |

## Gate 0 outcome

- Reuse map established.
- Publishing workspace created.
- No blank-slate rebuild.
- Next: Gate 1 corpus integrity confirmation against drop + derivatives.
