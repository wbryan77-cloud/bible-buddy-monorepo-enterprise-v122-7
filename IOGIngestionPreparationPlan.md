# IOG Ingestion Preparation Plan

**Phase:** 2J-D Part F — Preparation only
**Date:** 2026-06-08T22:53:37.924Z

> Do NOT ingest. Do NOT scrape. Do NOT process transcripts in Phase 2J-D.

## Required inputs (future)

| Input | Format | Rights |
|-------|--------|--------|
| Official transcripts | JSONL with question, scripturesCited, source | Licensed |
| Authorized transcripts | JSONL + `copyrightStatus: licensed` | Creator attested |
| Public lesson notes | Manual admin upload | ToS review |
| Metadata-only captures | Title, videoId, cited refs — no body text | Metadata only |

## Review workflow

1. IOG source → `extractDiscoveryQuestions()` (same as 2J-C)
2. Genesis-to-Revelation expansion → `discoverGenesisToRevelation()`
3. Score → `coverageScore` + `supportScore`
4. Queue → `genesis-revelation-discovery-queue.jsonl`
5. Admin package → `genesis-revelation-review-package.json`

## Promotion workflow

1. Admin decision → `admin-approved.json`
2. `candidatePromotionEngine.buildPromotionPackages()`
3. Regression suite → `promotionReadinessScore`
4. Human sign-off on `promotion-packages.json`
5. Phase 2K apply step (separate, explicit)

## Approval workflow

- Allowed decisions: `approve_card_ref`, `approve_support_edge`, `approve_catalog_chain`, `hold`, `future_research`, `reject`
- Two-person review for score ≥95 promotions (recommended)
- Dietary/caution passages require extra reviewer

## Regression workflow

- Run `node scripts/runPhase2jDPromotionWorkflow.js` before any apply
- Re-run Phase 2I stress subset for affected topics post-apply (Phase 2K)
- Hard cutover regression must pass (18/18)

## Safety workflow

- IOG discoveries enter same queue as manual/stress discoveries
- `autoApplied: false` always
- No buddyBrain import of discovery or promotion modules
- No bulk ingestion without explicit Phase 3+ gate
