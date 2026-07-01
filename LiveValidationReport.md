# Live Validation Report

**Phase:** 2Q Part A
**Date:** 2026-06-09T04:21:19.630Z

**Live suite executed:** No

**Reason:** OPENAI_API_KEY not configured

**Offline projection:** post-graph reclassification of Phase 2I baseline turns + batch test-claim validation.


**Batch test claims (current graph):**

- batch1: 5/5 Class A/B, 5 graph matches
- batch2: 4/6 Class A/B, 4 graph matches
- batch3: 3/3 Class A/B, 3 graph matches

**Scenario reclassification:** 5 Class C eliminated, 5 graph matches added

**Recommendation:** `export OPENAI_API_KEY=... && node scripts/phase2qLiveStressTest.js`

## Metrics

| Metric | 2I Baseline | Post Batch 3 | Delta |
|--------|-------------|--------------|-------|
| Class A | 360 | 364 | — |
| Class B | 72 | 73 | — |
| Class C | 38 | 33 | -5 |
| Class D | 3 | 3 | — |
| Support accuracy % | 91 | 92 | 1 |
| Graph participation % | 91 | 92 | 1 |
| Degradation % | 20 | 17 | 3 |
| Ownership violations | 0 | 0 | — |
| OpenAI errors | 0 | 0 | — |
| Peak RSS MB | 230 | 230 | — |
| Avg RSS MB | 204.2 | 204.2 | — |

**Scenarios:** 105 · **Turns:** 125
