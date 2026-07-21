# Coverage Impact Matrix

**Phase:** 2G Part D

---

## Cluster impact ranking

| Cluster | Claims | Priority | User impact | Doctrine impact | Effort | Risk |
|---------|--------|----------|-------------|-----------------|--------|------|
| missing_affirmation | 23 | **P0** | high | medium | low | low |
| missing_retrieval_trigger | 22 | **P0** | medium | medium | medium | low |
| missing_chain | 17 | **P0** | medium | medium | medium | low |
| missing_support_edge | 14 | **P0** | high | medium | low | low |
| missing_card | 5 | **P1** | high | high | medium | medium |
| weak_claim_extraction | 1 | **P2** | low | low | high | medium |

---

## Priority definitions

- **P0** — High volume + high user impact; fix via support graph/affirmation from existing cards (no new doctrine)
- **P1** — Moderate volume or pastoral card gaps; may need retrieval patterns or catalog chains
- **P2** — Low volume, edge cases, or claim-extractor tuning

## Topic impact

| Topic | Class C | Primary cluster | Priority |
|-------|---------|-----------------|----------|
| sabbath | 34 | missing_support_edge | P0 |
| holiness | 9 | missing_retrieval_trigger | P1 |
| deathState | 9 | missing_retrieval_trigger | P1 |
| dietary_law | 5 | missing_affirmation | P1 |
| emotional | 5 | missing_card | P1 |
| kingdom | 4 | missing_affirmation | P2 |
| grief | 4 | missing_chain | P2 |
| heavens | 4 | missing_chain | P2 |
| resurrection_timeline | 4 | missing_chain | P2 |
| general | 2 | missing_retrieval_trigger | P2 |
| messiah_logos | 1 | missing_affirmation | P2 |
| emotional_pastoral | 1 | missing_card | P2 |
