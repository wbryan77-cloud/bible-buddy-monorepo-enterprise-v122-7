# Live Post-Implementation Stress Report

**Phase:** 2L Part A
**Date:** 2026-06-09T03:17:56.688Z

## Live suite status

**Live run:** not executed — OPENAI_API_KEY not configured — full 125-turn live suite not executed

**To run:** `export OPENAI_API_KEY=... && node scripts/phase2lLiveStressTest.js`

## Offline proxy (batch-related scenarios)

- Batch scenario turns in 2I: 16
- Baseline batch Class C: 8
- Post-2K sample Class C: 0
- Post graph matches (samples): 5/5

## Phase 2I baseline (reference)

- Degradation: 20%
- Class C: 38
- Graph participation: 91%

## Phase 2K projected

- Target degradation: ~18%
- Graph edges: 48
