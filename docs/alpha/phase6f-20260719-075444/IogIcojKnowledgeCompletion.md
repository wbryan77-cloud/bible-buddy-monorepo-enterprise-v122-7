# IOG/ICOJ Knowledge Completion — Phase 6F Part 3

Full data: `IogIcojKnowledgeCompletion.json`.

## Summary

| Metric | Value |
|---|---|
| Sources found (ICOJ PDF titles) | 47 |
| Sources parsed | 47 (100%) |
| Scripture references extracted | 910 |
| Valid references | 907 |
| Invalid references | 3 |
| Duplicates (already-approved witness) | 14 |
| New cross-reference candidates | 135 |
| Auto-approved (deterministic chapter match) | 135 |
| **Live in production relationship graph today** | **110** |
| Admin-review candidates (new doctrinal territory) | 559 |
| Unclassified (valid Scripture, no topic match) | 199 |
| Historical citations investigated | 8 |
| Historical citations resolved | 5 |
| Licensing blockers | 1 (see below) |
| Remaining raw/unprocessed sources | 240 IOG YouTube transcripts (RAW_ISOLATED) |

## What this batch verified/completed (vs. Phase 6D/6E's prior build)

The governed ingestion pipeline (`services/iogIcojGovernedIngestion.js`) and the
historical source investigation engine (`services/historicalSourceInvestigationEngine.js`)
were already built and fully wired in Phase 6D/6E. This batch's job (Part 3) was to
verify they are genuinely *used*, not merely present:

1. Re-ran the full 47-source pipeline this batch and confirmed the same
   deterministic counts persist (135 auto-approved, 559 admin-review, 199
   unclassified, 17 rejected) — **stable and reproducible**, not a one-time fluke.
2. Directly queried `services/scriptureRelationshipGraph.js` and confirmed
   **110 of the 135 auto-approved IOG/ICOJ cross-references are live in the
   production relationship graph today** (`approvedBy: 'rules_engine_deterministic_chapter_match'`),
   e.g. `Luke 4:1-8` linked to the `sabbath` topic via the same book+chapter as the
   existing primary witness `Luke 4:16`. The gap between 135 approved and 110 live
   is internal dedup (`dedupeKey` in `scriptureRelationshipGraph.js` merges records
   that resolve to the same source+target+type+topic).
3. Ran `scripts/alpha/phase6ProductionAnswerLineageSmoke.js` (part of Phase 6
   regression) — `iog_icoj_never_primary_or_supporting_witness` passes, confirming
   IOG/ICOJ material is discovery-only, never elevated to Scripture authority.
4. Ran `scripts/alpha/phase6fApprovedEvidenceProductionTest.js` against live
   `runBuddy` — 7/11 production retrieval tests passed touching topics with
   IOG/ICOJ-strengthened evidence (see Part 2C for the 4 pre-existing, unrelated
   casual-phrasing routing gaps found, not caused by IOG/ICOJ content).
5. Ran the historical source investigation engine and confirmed its honest finding:
   **zero external bibliographic citations are extractable from the 47 acquired PDF
   *titles*** (they are the ministry's own sermon/teaching titles — e.g. "THE BOOK
   OF LIFE" — not references to outside historical works). Of the demonstration/test
   candidate set (8 citations), 5 resolved against `KNOWN_SOURCE_REGISTRY`
   (Josephus, Encyclopaedia Britannica, etc.) and 3 remained unresolved, correctly
   left `NEEDS_ADMIN_REVIEW` rather than guessed at.

## Licensing blocker (documented, not integrated around)

The 240 raw IOG YouTube transcript files remain `RAW_ISOLATED_NOT_PARSED_THIS_BATCH`.
Parsing their prose text (as opposed to the already-processed 47 PDF title/reference
lists) would be a materially larger and differently-scoped licensing/ingestion
decision than this batch's mandate covers — per the batch's own instruction ("Do not
perform uncontrolled crawling. Use bounded, resumable background source-investigation
jobs"), this is recorded as an explicit blocker rather than worked around. No
transcript prose was read, stored, or promoted.

## Governance confirmed intact

- IOG/ICOJ is recorded only as `discoverySource`/provenance metadata — never a
  `PRIMARY_WITNESS` or `SUPPORTING_WITNESS` type in the relationship graph.
- The only rules-engine `AUTO_APPROVED` outcome is the weakest relationship type
  (`CROSS_REFERENCE`), and only when Scripture's own chapter structure (not AI
  judgment) places the discovered reference in the same chapter as an existing
  approved witness.
- No source document's own prose/commentary is ever stored — only the Scripture
  *reference* and the local, validated, public-domain KJV text at that reference.
- Every promoted historical claim requires independent bibliographic resolution
  against `KNOWN_SOURCE_REGISTRY`; ambiguous/unresolved claims stay `NEEDS_ADMIN_REVIEW`.
