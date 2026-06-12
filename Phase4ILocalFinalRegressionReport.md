# Phase 4I Local Final Regression Report

Generated: 2026-06-11

## Commands run

```bash
node scripts/runPhase4HDoctrineParityRegression.js
node scripts/runPhase4HMemoryStressTest.js
node scripts/runPhase4FCombinedStabilityRegression.js
```

## Results

| Suite | Result | Detail |
|-------|--------|--------|
| Phase 4H doctrine parity | **PASS** | 28/28 |
| Phase 4H memory stress | **PASS** | 1650 turns |
| Phase 4F combined stability | **PASS** | 1352/1352 |

## Memory stress metrics

| Metric | Value |
|--------|-------|
| Peak RSS | ~288 MB |
| Heap growth | ~62 MB |
| Blank responses | 0 |
| Strict OpenAI calls | 0 |
| Bad internal user text | 0 |
| Memory pressure | `normal` |

## Acceptance checks

| Criterion | Status |
|-----------|--------|
| Doctrine parity PASS | ✅ |
| Memory stress PASS | ✅ |
| Combined stability PASS | ✅ |
| 0 strict doctrine OpenAI | ✅ |
| 0 blank responses | ✅ |
| 0 raw internal errors to user | ✅ |
| RSS acceptable (&lt; 400 MB peak) | ✅ |

## Verdict

**Local final regression: PASS** — Ready for controlled deploy package commit.
