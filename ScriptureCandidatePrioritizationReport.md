# Scripture Candidate Prioritization Report

**Phase:** 2J-B Part A
**Date:** 2026-06-08T14:58:50.518Z
**Pilot total:** 47 | **Potentially useful:** 16

## Prioritization criteria

1. **supportScore** — fraction of cited refs on frozen card + support graph
2. **Partial approval** — refs already on card/edge boost priority
3. **Approved ref count** — more grounded refs = safer review
4. **Phase 2I Class C impact** — missing_retrieval / missing_support_edge remediation
5. **Topic importance** — Sabbath, death_state, holiness, messiah_logos weighted highest
6. **Risk level** — missing refs, chain leaps, tradition language

## Ranked review queue (potentially useful only)

| Rank | ID | Topic | supportScore | Approved refs | Phase 2I impact | Risk | Recommended action | Priority |
|------|-----|-------|--------------|---------------|-----------------|------|-------------------|----------|
| 1 | sdp_0010 | sabbath | 66.7 | 2/3 | high (doc_13) | medium | approve_card_ref | 89.3 |
| 2 | sdp_0037 | sabbath | 66.7 | 2/3 | high (chain_sabbath_5) | medium | approve_card_ref | 89.3 |
| 3 | sdp_0001 | sabbath | 66.7 | 2/3 | medium (stress_gap) | high | approve_card_ref | 72.3 |
| 4 | sdp_0023 | messiah_logos | 65 | 0/1 | high (mix_14) | medium | approve_support_edge | 68.8 |
| 5 | sdp_0046 | sabbath | 50 | 1/2 | medium (admin_note) | medium | approve_card_ref | 65.5 |
| 6 | sdp_0008 | messiah_logos | 50 | 0/1 | high (doc_01) | medium | approve_support_edge | 63.5 |
| 7 | sdp_0038 | doctrine | 35 | 1/1 | high (chain_kingdom_5) | medium | hold_for_more_review | 62.3 |
| 8 | sdp_0039 | doctrine | 35 | 1/1 | high (chain_kingdom_5) | medium | hold_for_more_review | 62.3 |
| 9 | sdp_0040 | doctrine | 35 | 1/1 | high (chain_kingdom_5) | medium | hold_for_more_review | 62.3 |
| 10 | sdp_0041 | doctrine | 35 | 1/1 | high (chain_kingdom_5) | medium | hold_for_more_review | 62.3 |
| 11 | sdp_0024 | messiah_logos | 57.5 | 0/2 | high (mix_14) | high | approve_support_edge | 59.1 |
| 12 | sdp_0033 | mixed | 35 | 1/1 | high (chain_death_5) | medium | hold_for_more_review | 56.3 |
| 13 | sdp_0034 | mixed | 35 | 1/1 | high (chain_death_5) | medium | hold_for_more_review | 56.3 |
| 14 | sdp_0035 | mixed | 35 | 1/1 | high (chain_death_5) | medium | hold_for_more_review | 56.3 |
| 15 | sdp_0007 | sabbath | 15 | 0/1 | low (continuity_expansion) | high | future_research | 16.3 |
| 16 | sdp_0006 | kingdom | 3.3 | 0/3 | medium (stress_gap) | high | future_research | 13.2 |

## Tier summary

- **Tier 1 (P0 review):** sdp_0010, sdp_0037, sdp_0001
- **Tier 2 (P1 review):** sdp_0023, sdp_0046, sdp_0008, sdp_0038, sdp_0039, sdp_0040, sdp_0041, sdp_0024, sdp_0033, sdp_0034, sdp_0035
- **Tier 3 (P2 / hold):** sdp_0007, sdp_0006

## Answers

### Highest value candidates

- **sdp_0010** (sabbath): Jesus Himself observed the Sabbath regularly (Luke 4:16), and the early believers met on the Sabbath…
- **sdp_0037** (sabbath): Jesus Himself observed the Sabbath by attending synagogue and teaching (Luke 4:16), and the early be…
- **sdp_0001** (sabbath): Sabbath observance pattern from creation through apostolic era (candidate chain extension)…

### Safest to approve later

- **sdp_0010**: 2/3 refs grounded; action: `approve_card_ref`
- **sdp_0037**: 2/3 refs grounded; action: `approve_card_ref`
- **sdp_0023**: 0/1 refs grounded; action: `approve_support_edge`
- **sdp_0046**: 1/2 refs grounded; action: `approve_card_ref`
- **sdp_0008**: 0/1 refs grounded; action: `approve_support_edge`

### Require more review

- **sdp_0038**: hold_for_more_review — missing: none
- **sdp_0039**: hold_for_more_review — missing: none
- **sdp_0040**: hold_for_more_review — missing: none
- **sdp_0041**: hold_for_more_review — missing: none
- **sdp_0033**: hold_for_more_review — missing: none
- **sdp_0034**: hold_for_more_review — missing: none
- **sdp_0035**: hold_for_more_review — missing: none
- **sdp_0007**: future_research — missing: Revelation 14:12
- **sdp_0006**: future_research — missing: Job 1:21-22, Romans 5:3-5, Revelation 21:4

### Should reject (from useful set)

- None in useful set — rejections apply to unsupported/pastoral pool outside this package.

### Could reduce Phase 2I degradation if approved later

- **sdp_0010** → doc_13 (missing_support_edge): approve_card_ref
- **sdp_0037** → chain_sabbath_5 (missing_support_edge): approve_card_ref
- **sdp_0023** → mix_14 (missing_support_edge): approve_support_edge
- **sdp_0008** → doc_01 (missing_support_edge): approve_support_edge
- **sdp_0038** → chain_kingdom_5 (missing_retrieval): hold_for_more_review
- **sdp_0039** → chain_kingdom_5 (missing_retrieval): hold_for_more_review
- **sdp_0040** → chain_kingdom_5 (missing_retrieval): hold_for_more_review
- **sdp_0041** → chain_kingdom_5 (missing_retrieval): hold_for_more_review
- **sdp_0024** → mix_14 (missing_support_edge): approve_support_edge
- **sdp_0033** → chain_death_5 (missing_retrieval): hold_for_more_review
- **sdp_0034** → chain_death_5 (missing_retrieval): hold_for_more_review
- **sdp_0035** → chain_death_5 (missing_retrieval): hold_for_more_review
