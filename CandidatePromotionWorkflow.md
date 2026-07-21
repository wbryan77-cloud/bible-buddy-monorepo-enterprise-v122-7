# Candidate Promotion Workflow

**Phase:** 2J-D
**Date:** 2026-06-08T22:53:37.920Z

## Authority flow

```
Discovery (2J-C)
  → Admin review (2J-B)
  → Admin decision (admin-approved/rejected/hold.json)
  → Regression validation (candidatePromotionEngine)
  → Promotion package (promotion-packages.json)
  → Human approval
  → Production update (Phase 2K+ — NOT in 2J-D)
```

## Promotion types

| Type | Target | Example |
|------|--------|---------|
| `approve_card_ref` | Evidence card `supportingScriptures` | Acts 13:42-44 → sabbath.card |
| `approve_support_edge` | Approved support graph | Hebrews 1:1-3 → messiahLogos edge |
| `approve_catalog_chain` | Approved catalog teaching order | death_state catalog extension |
| `hold` | No promotion — review queue | Dietary Acts context |
| `future_research` | Research queue | Off-card suffering chain |
| `reject` | Discard | Pastoral Psalm 34:18 noise |

## Regression gates (required before promotion)

1. **Support regression** — `classifyDoctrineClaim` against current graph
2. **Claim traceability** — matrix row traceable to evidence
3. **Approval gate** — no forbidden prose / tradition language
4. **Ownership** — promotion engine not wired to buddyBrain
5. **Memory** — graph build smoke < 50 MB delta

**promotionReadinessScore ≥ 80 required.** No promotion if regression fails.

## Current pipeline status

| Queue | Count |
|-------|-------|
| admin-approved (staged) | 7 |
| admin-rejected | 21 |
| admin-hold | 16 |
| promotion packages | 7 |
| regression passed | 7 |

## Safety invariants

- `reviewRequired: true` on all discovery candidates
- `autoApplied: false` on all packages
- `productionApplied: false` until explicit Phase 2K apply step
- `humanApprovalRequired: true` on all staged decisions
