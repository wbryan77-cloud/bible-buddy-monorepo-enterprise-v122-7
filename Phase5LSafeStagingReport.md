# Phase 5L Safe Staging Report

**Date:** 2026-06-16

## Excluded from staging

- `.github/workflows/*`
- `.env`
- `data/*`
- `docs/evidence-candidates/*`
- Transcript dumps
- `*.jsonl` logs
- `node_modules`

## Staging script

`bash scripts/phase5l-safe-stage.sh` — stages Phase 5L live-path files only; fails if forbidden paths appear in staged set.

## Status

Run staging before commit. Gate PASS does not require staged files but deploy requires commit.
