# Phase 4K — Final Local Regression Report

Generated: 2026-06-12

## Tests executed

```bash
node scripts/runPhase4HDoctrineParityRegression.js
node scripts/runPhase4HMemoryStressTest.js
node scripts/runPhase4FCombinedStabilityRegression.js
```

## Results

### 1. Doctrine parity — **PASS**

| Metric | Value |
|--------|-------|
| Score | **28/28** |
| Report | `Phase4HDoctrineParityRegressionReport.md` |
| Strict OpenAI on doctrine | Case `10_openai_disabled` PASS |

### 2. Memory stress — **PASS**

| Metric | Value | Threshold / req |
|--------|-------|-----------------|
| Turns | 1650 | — |
| `pass` | `true` | required |
| Blank responses | **0** | required |
| Strict OpenAI calls | **0** | required |
| Bad internal text | **0** | required |
| Peak RSS MB | **344.6** | under ~450 MB local critical |
| Health RSS MB | **286.5** | normal pressure |
| Memory pressure | **normal** | required |
| `noCrash` | `true` | required |
| Errors (stress counter) | **0** | required |
| Avg latency ms | 137 | — |
| Max latency ms | 1879 | — |

Report: `Phase4HMemoryStressTestReport.md`

Expected `forced_timeout_test` / `forced_test_error` log lines are **intentional** guarantee regression injections — not production failures.

### 3. Combined stability — **PASS**

| Metric | Value |
|--------|-------|
| Score | **1352/1352** |
| Duration | 48.6s |
| Uncaught exceptions | 0 |

Note: OpenAI client warned missing key during portion of 4F run (sandbox/env); strict doctrine paths still passed.

## Required checklist

| Requirement | Status |
|-------------|--------|
| Doctrine parity PASS | ✅ |
| Memory stress PASS | ✅ |
| Combined stability PASS | ✅ |
| 0 strict doctrine OpenAI calls | ✅ |
| 0 service unavailable loops | ✅ |
| RSS under expected local threshold | ✅ (344.6 MB peak < 450 MB critical) |
| No blank responses | ✅ |
| No raw internal errors in user replies | ✅ (`badText: 0`) |

## Verdict

**PASS** — All final local regressions green. Ready for commit gate (subject to forbidden-file and secret scan — both passed).
