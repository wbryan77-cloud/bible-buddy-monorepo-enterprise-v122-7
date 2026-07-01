# Bible Authority Phase 2J-E Report

**Date:** 2026-06-08T23:14:40.609Z
**Status:** Bulk discovery pipeline complete — no production updates

## Mission

Large-scale Scripture discovery: questions, chains, G2R expansions, parallel witnesses, support candidates — all for admin review.

```
External source → Question → Scripture → G2R verification → Parallel discovery
  → Support score → Admin review → Human decision
NOT: External source → Doctrine → Production
```

## Metrics

| Metric | Value |
|--------|-------|
| Sources registered | 11 |
| Questions discovered | 140 |
| Question clusters | 118 |
| Scripture chains | 29 |
| Discovery candidates | 29 |
| G2R expansions | 21 |
| G2R spans | 15 |

## Safety

✅ Production isolation PASSED
- reviewRequired: ✅ all
- autoApplied: ✅ none
- Support graph: 47 edges (unchanged)
- Evidence cards: 10 (unchanged)

## Answers

### 1. Total questions discovered
**140**

### 2. Total scripture chains discovered
**29**

### 3. Total Genesis-to-Revelation expansions
**21** expansions; **15** full spans

### 4–6. Score thresholds
- ≥95: **8**
- ≥90: **8**
- ≥80: **12**

### 7. Highest-ranked topics
1. **sabbath** (22 questions)
2. **emotional** (22 questions)
3. **heavens** (20 questions)
4. **dietary_law** (18 questions)
5. **death_state** (11 questions)
6. **kingdom** (11 questions)

### 8. Could reduce current degradation
- **bulk_0001** (sabbath, 88): approve_support_edge
- **bulk_0002** (death_state, 87): approve_support_edge
- **bulk_0004** (sabbath, 71): approve_card_ref
- **bulk_0005** (messiah_logos, 97): approve_support_edge
- **bulk_0010** (sabbath, 62): approve_card_ref
- **bulk_0011** (sabbath, 96): approve_support_edge
- **bulk_0013** (death_state, 98): approve_support_edge
- **bulk_0023** (sabbath, 96): approve_support_edge

### 9. Require theological review
- **bulk_0003** (98): hold — Clean and unclean foods in Scripture…
- **bulk_0006** (98): hold — Can I eat pork?…
- **bulk_0009** (84): hold — What does holy mean?…
- **bulk_0012** (96): hold — Jesus said where I go ye cannot come. What does that mean?…
- **bulk_0022** (83): hold — What does holy mean? I want to live right.…
- **bulk_0024** (96): hold — You did not answer my question about pork.…

### 10. Ready for human approval
- **bulk_0001** (88, approve_support_edge)
- **bulk_0002** (87, approve_support_edge)
- **bulk_0005** (97, approve_support_edge)
- **bulk_0011** (96, approve_support_edge)
- **bulk_0013** (98, approve_support_edge)
- **bulk_0023** (96, approve_support_edge)

## Topic deep-dives

### Sabbath (9 candidates)
- bulk_0001: approve_support_edge
- bulk_0004: approve_card_ref
- bulk_0007: future_research
- bulk_0010: approve_card_ref
- bulk_0011: approve_support_edge

### Logos (3 candidates)
- bulk_0005: approve_support_edge
- bulk_0008: future_research
- bulk_0019: future_research

### Death state (3 candidates)
- bulk_0002: approve_support_edge
- bulk_0013: approve_support_edge
- bulk_0014: future_research

## Duplicate clusters
- **qc_017** (sabbath, freq 8): 3 variants
- **qc_009** (holiness, freq 6): 4 variants
- **qc_018** (messiah_logos, freq 5): 2 variants
- **qc_019** (dietary_law, freq 5): 3 variants
- **qc_016** (sabbath, freq 4): 2 variants
- **qc_062** (grief, freq 4): 2 variants
- **qc_003** (sabbath, freq 3): 2 variants
- **qc_005** (death_state, freq 3): 3 variants

## Deliverables

| File |
|------|
| BulkSourceInventory.md |
| QuestionDiscoveryInventory.md |
| ScriptureExtractionInventory.md |
| GenesisToRevelationVerificationReport.md |
| ParallelScriptureExpansionReport.md |
| ScriptureSupportRankingV2.md |
| ScriptureDiscoveryAdminDigestPlan.md |
| BibleAuthorityPhase2JEReport.md |
| BulkDiscoveryAdminReviewPackage.json |
| bulk-discovery-queue.jsonl |
