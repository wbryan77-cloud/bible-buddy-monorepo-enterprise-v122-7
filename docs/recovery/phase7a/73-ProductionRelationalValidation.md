# 73 — Production Relational Validation

**Status:** Pending deploy of Phase 7A commit.

## Plan

1. Deploy commit; confirm `/health.releaseCommit` matches.
2. Re-run Cases 1–6 on production with unique userId.
3. Run `scripts/runPhase7ARelationalRegression.js` locally against same code tip.
4. Spot-check GK, historical, Scripture control prompts.
5. Capture `logs/01-production-probes.jsonl`.

## Results

_Filled after deploy._
