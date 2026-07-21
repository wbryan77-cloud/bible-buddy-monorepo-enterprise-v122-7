# Phase 2G Recommendation

**Phase:** 2G Part G  
**Date:** 2026-06-08

---

## Answers

### 1. Are the 82 claims concentrated or distributed?

**Concentrated by topic, distributed by mechanism.** Top validator reason: *citation lacks verified affirmation* (37 claims, 45.1%). Second: *no evidence pack retrieved* (27, 32.9%). Top 3 root-cause clusters = 62 claims (75.6%). Topic leaders: sabbath (34), holiness (9), deathState (9), dietary_law (5).

### 2. What are the top 10 missing support areas?

| # | Area | Claims | Fix type |
|---|------|--------|----------|
| 1 | sabbath cluster | 19 | affirmation_rule + catalog_chain_edge |
| 2 | isaiah58 sabbath edge | 14 | support_graph_edge |
| 3 | general cluster | 13 | affirmation_rule + catalog_chain_edge + retrieval_pattern |
| 4 | death resurrection cluster | 11 | retrieval_pattern + catalog_chain_edge |
| 5 | holy cluster | 9 | affirmation_rule + retrieval_pattern |
| 6 | pastoral no evidence card | 5 | pastoral_card_or_bypass |
| 7 | kingdom cluster | 4 | affirmation_rule + retrieval_pattern |
| 8 | dietary cluster | 3 | affirmation_rule |
| 9 | caution without teaching chain | 3 | catalog_chain_edge |
| 10 | unmapped doctrine claim | 1 | claim_extractor_tuning |

### 3. What single fix removes the most Class C claims?

**Sabbath topic** (33 claims: 19 affirmation/chain + 14 Isaiah 58 edge) — add Isaiah 58:13-14 support graph edge, Sabbath affirmation rules, and Acts 17:2 catalog chain from `sabbath.card` scriptures. No new doctrine.

### 4. What readiness score is achievable without new doctrine?

| Milestone | Readiness |
|-----------|----------|
| Current (2F) | 82.4 |
| After P0 fixes | 93.2 |
| After P0 + P1 | 95.8 |
| After full coverage | 97.9 |

**95.8+** achievable with support graph expansion from existing cards only.

### 5. Is Phase 3 still blocked?

**Yes — conditionally.** Readiness 82.4 < 95. Architecture is stable (0 ownership violations). Block is **coverage-only**, not architectural.

### 6. What exact implementation phase should follow?

**Phase 2H — Support Graph Coverage Completion**

1. Add affirmation rules + support edges for P0 clusters (57 claims) from existing card scriptures
2. Add catalog chain edges for 1 Thessalonians / resurrection threads (P1)
3. Evaluate pastoral comfort card or pastoral bypass policy (P1 — 5 claims)
4. Re-run Phase 2F stress subset to verify Class C → 0 on doctrine topics
5. **Then** begin Phase 3 Scripture Discovery / candidate queue growth

---

## Constraints honored

- Analysis only — no fixes, no doctrine, no cards, no edges, no discovery
