# Four Winds Reuse Map

**Purpose:** Extension-point map only. Attach verified/qualified Four Winds claims later by **reference** to existing BibleBuddy objects.  
**Hard rules:** No production doctrine/runtime/service mutation in this gate. No parallel evidence engine. IOG/ICOJ/Holy Testaments/Study Chain objects stay owners of their domains.

---

## 1. Historical evidence / reference owners (primary B-layer)

| Existing object | Path | Attach later (if admin-approved) | Do not |
|---|---|---|---|
| `buildHistoricalEvidence` | `services/historicalEvidenceLayer.js` | Constantine/Sunday **civil-law** notes (FW-010); keep `separatedFromScripture: true` | Promote FW Dan 7:25 Sabbath-change conclusion as doctrine |
| `HISTORICAL_REFERENCE_INDEX` | `services/historicalReferenceIndex.js` | `josephus`, `romanHistory`, `ancientNearEast` (Table of Nations context), `feastAndCalendarHistory` | Treat modern identity claims as Scripture (`caution` already present) |
| `buildHistoricalReferenceLayer` / `HISTORICAL_REFERENCE_TOPICS` | `services/runtimeHistoricalReferenceLayer.js` | `kingdom_prophecy_history` for Babylon→Rome history scaffolding; `second_temple_period` for Dan 9 / AD 70; `judea_and_jerusalem` | Auto-bind EEC/papacy little-horn identity |
| Josephus investigation records | `docs/alpha/phase6e-coverage-*/HistoricalSourceInvestigation.json` (+ related phase6e artifacts) | AD 70 Titus / Passover crowd / temple destruction corroboration (FW-048) | Duplicate Josephus text into a Four Winds subsystem |
| World Scope / Last Two Million Years / Jasher | `docs/evidence-candidates/bible-intelligence-engine-phase1c/09_ApprovedBooksActivationAudit.md`; `.../v1.3c-continuous-certification/14_BookEvidenceReassessment.md`; pre-cursor note in `docs/bookbuddy-build/.../10_SUPPORT/BOOKBUDDY_PRE_CURSOR_DIAGNOSIS.md` | Citation provenance + INDEXED_ONLY page leads (e.g. Last Two Million Years Jerusalem/Titus tracking) | Activate fulltext or change INDEXED_ONLY status without Admin |

---

## 2. Prophecy / kingdom / death continuity (A-layer Scripture objects)

| Existing object | Path | Candidate FW topics | Attachment rule |
|---|---|---|---|
| Prophecy continuity | `services/runtimeProphecyContinuityEngine.js` | Daniel 2:31-45, Daniel 7, Daniel 2:44 | Scripture anchors only; FW empire/EEC conclusions stay off-path until verified |
| Death / resurrection / kingdom catalog | `services/deathResurrectionKingdomCatalog.js` | `kingdomComesToEarth`, `threeHeavens`, `firstResurrection`, `stateOfTheDead` | Align FW-019–022, FW-045 with **existing teachingOrder**; do not replace catalog with FW prose |
| Study / traversal / continuity engines that already list Daniel 2/7 / Rev | e.g. `runtimeStudyReferenceIndex.js`, `runtimeScriptureAnchorNetwork.js`, `runtimeGenesisRevelationContinuityGraph.js`, `runtimeScriptureJudgmentContinuityEngine.js` | Daniel–Revelation continuity questions | Reference existing graphs; no second graph |
| Sabbath history route ownership | `services/routeOwnershipTable.js` → `sabbathHistoryDeepResponder` | Sunday-history user questions | History secondary; Scripture primary (existing posture) |

---

## 3. IOG / ICOJ governed ingestion (cross-refs — not primary witnesses)

| Object | Path / ID | Use for Four Winds |
|---|---|---|
| Governed pipeline owners | `services/iogIcojGovernedIngestion.js` exports: `runGovernedIcojIngestion`, `runBoundedIogTranscriptSample`, `processExtractedReference`, `readApprovedCrossReferences`, `readKnowledgeAuditLog`, `appendAuditLog` | Future: if FW Scripture relationships pass ACQUIRE→…→RULES_APPROVAL→ADMIN_EXCEPTION_REVIEW, append via **this** pipeline only |
| Approved cross-references | `data/approved-cross-references.jsonl` (135 AUTO_APPROVED) | Topics already live: `kingdom`, `death_state`, `new_jerusalem`, `abomination_desolation`, `sabbath`, `heavens`, `repentance`, `holy_spirit`, `faith_obedience`, `david` |
| Utilization report / matrix | `docs/recovery/certification-v5/11-IOG-ICOJ-UtilizationReport.md`, `11-IOG-ICOJ-UtilizationMatrix.json` | Governance status: indexed/reachable as KJV xrefs; **not** primary witnesses; raw IOG prose not composer authority |
| IOG/ICOJ reassessment | `docs/evidence-candidates/.../13_IOGICOJReassessment.md` | Remains INDEXED_ONLY / NEEDS_ADMIN_REVIEW / CITATION_ONLY per prior governance — FW must not bypass |

**Signatures/owners note (read-only):** ingestion is gated; `readApprovedCrossReferences` is the live reader. Four Winds must not invent a second approval store.

---

## 4. Doctrine / boundary owners (prevent auto-promotion)

| Object | Path | Role vs Four Winds |
|---|---|---|
| Doctrine guard / boundaries | `services/doctrineGuard.js`, `services/doctrineAuthorityContract.js` | Block unsupported Sunday-replaced-Sabbath / similar promotions |
| Evidence cards / traditions | `services/evidenceCards/traditions.card.js` | Chronology/tradition questions stay card-owned |
| Source manifest rule | `docs/bookbuddy-build/.../SOURCE_MANIFEST_FINAL.json` → `four_winds` | “Verify claim-by-claim and attach only to existing…; no parallel subsystem.” |

---

## 5. Suggested future attachment matrix (post-admin only)

| FW claim IDs | Target object (by reference) | Minimum status before attach |
|---|---|---|
| FW-003, 005, 006, 007, 009, 011 | `runtimeHistoricalReferenceLayer.kingdom_prophecy_history` + `historicalReferenceIndex.romanHistory/ancientNearEast` | QUALIFIED / VERIFIED |
| FW-010 | `historicalEvidenceLayer` sabbath history notes + sabbathHistory route | QUALIFIED history only |
| FW-016 | `historicalReferenceIndex.romanHistory` | VERIFIED |
| FW-021, 045 | `deathResurrectionKingdomCatalog` + approved topics `david` / `heavens` | VERIFIED / QUALIFIED |
| FW-019–022, 025 | approved topics `kingdom`, `death_state`, `new_jerusalem` via `readApprovedCrossReferences` | QUALIFIED after admin doctrine decision |
| FW-035–038, 043, 048 | `abomination_desolation` xrefs + Josephus / second_temple_period | PARTIAL→QUALIFIED; C-layer needs admin |
| FW-029 | `ancientNearEast.table_of_nations` context only | QUALIFIED Scripture genealogy; identity C held |
| FW-039 | IOG governed xref posture / precept method | QUALIFIED method — not new doctrine chain |
| FW-017, 015, 032, 034 C, 040, 050 | **No attach** until admin resolves DISPUTED / NEEDS_ADMIN_REVIEW | Hold |

---

## 6. Explicit non-goals

- Do not create `services/fourWindsEvidenceEngine.js` or similar.
- Do not copy World Scope / Last Two Million Years / Salvadori / Grolier bodies into a new corpus.
- Do not mark Four Winds conclusions as AUTO_APPROVED cross-references.
- Do not wire runtime routes in Gate 2 (master §6F regressions belong to a later authorized sprint).

---

## 7. Provenance pointers for later work

- Source text: `.../07_CURSOR_TEXT_DERIVATIVES/The_Four_Winds_of_Heaven_The_Israel_of_God_Henry_Buie.txt`
- Claim ledger: `docs/bookbuddy-build/publishing/four-winds/FourWindsClaimLedger.jsonl`
- High-priority audit: `docs/bookbuddy-build/publishing/four-winds/FourWindsHighPriorityAudit.md`
- Master Gate 2 criteria: `START_HERE_CURSOR_BUILD_MASTER_FINAL.md` §6 and Gate 2 pass conditions
