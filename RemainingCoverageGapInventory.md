# Remaining Coverage Gap Inventory

**Date:** 2026-06-08  
**Source:** Phase 2E live regression (`phase2b-support-relationship-regression.json`)

---

## Summary

| Metric | Phase 2D | Phase 2E |
|--------|----------|----------|
| Class C claims | 15 | **0** |
| Class D claims | 0 | **0** |
| Support accuracy | 70% | **100%** |
| Topics degraded | 2 | **0** |

**No Class C claims remain on extracted doctrine claims.**

---

## Per-topic status

| Topic | Claims | A | B | C | D | Approval |
|-------|--------|---|---|---|---|----------|
| third_heaven | 11 | ✓ | ✓ | 0 | 0 | approved |
| kingdom | 8 | ✓ | ✓ | 0 | 0 | approved |
| acts_10 | 6 | ✓ | — | 0 | 0 | approved |
| pork | 5 | ✓ | — | 0 | 0 | approved |
| sabbath | 9 | ✓ | — | 0 | 0 | approved |
| death_state | 6 | ✓ | ✓ | 0 | 0 | approved |
| resurrection | 5 | ✓ | ✓ | 0 | 0 | approved |
| logos | 6 | ✓ | — | 0 | 0 | approved |
| holy | 0 | — | — | 0 | 0 | approved* |

*Holy: vacuous pass — no claims extracted; retrieval gap documented separately.

---

## Remaining gaps (non-Class-C)

### Gap 1 — Holy evidence retrieval

| Field | Value |
|-------|-------|
| Topic | holy |
| Claim | *(none extracted this run)* |
| Scriptures | — |
| supportReason | — |
| Missing support edge | holiness card edges not created |
| Missing affirmation | all (no card) |
| Missing card | **yes — `holiness.card.js`** |
| Missing chain | yes — not in `approvedCatalogEvidence` |
| Fix | Admin-reviewed card — see `HolyEvidenceCardRecommendation.md` |

### Gap 2 — Sabbath catalog chain (optional P3)

| Field | Value |
|-------|-------|
| Topic | sabbath |
| Status | All claims class A via direct affirmations |
| Missing chain | `bibleTopicCatalog.sabbath.scriptureChain` not wired to `approvedCatalogEvidence` |
| Impact | None on current regression (direct edges sufficient) |
| Fix | Phase 3 catalog wiring if class B chain paths desired |

---

## Class C inventory (empty)

No rows — all prior Class C claims resolved:

| Former topic | Former count | Resolution |
|--------------|--------------|------------|
| sabbath | 9–10 | 6 support graph edges from sabbath.card |
| logos | 6 | 6 support graph edges from messiahLogos.card |
| holy | 2 (Phase 2B) | 0 claims extracted Phase 2E; card gap remains |
