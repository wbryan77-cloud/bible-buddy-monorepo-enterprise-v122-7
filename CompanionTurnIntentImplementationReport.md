# Companion Turn-Intent Implementation Report

Generated: 2026-06-03T03:40:04.350Z

Reason-first RACL + `companionTurnIntent` posture rebalance. Production default unchanged.

## Aggregate metrics

| Metric | Baseline (RACL) | Turn-intent | Δ |
| --- | --- | --- | --- |
| Listening | 6.3 | 6.2 | -0.1 |
| Composite rubric | — | 6.5 | — |
| Posture fit | — | 8 | — |
| Warmth | — | 6 | — |
| Follow-up | — | 7.4 | — |
| Usefulness | — | 6.6 | — |
| Naturalness | — | 6.9 | — |
| Deliver-mode % | ~84.7 | 77.7 | — |
| Posture hard fails | — | 5/20 | — |

## Gate

**FAIL**

- FAIL: Listening >= 7.2 — 6.2/10
- FAIL: Listening target >= 7.5 — 6.2/10
- FAIL: Warmth >= 6.7 — 6/10
- PASS: Follow-up >= 7 — 7.4/10
- FAIL: Sabbath T7 >= 8 — 5.8/10
- PASS: OpenAI >= 70% — 100%
- PASS: Template <= 20% — 0%

## Part E — Decision

### 1. Did posture selection improve companion feel?
**No clear gain.** Listening delta -0.1. Review per-thread regressions.

### 2. Which turns improved? / 3. Which got worse?
See per-thread tables in JSON and below.

### 4. Still feel like an answer engine?
**Mostly yes** — deliver-mode still high or asking still low.

### 5. Merge into reason-first RACL?
**Revise** — gate not met; tune posture rules or composer before merge.

## Human-feel checks (6 threads)

| Thread | Listening | Posture fit | Felt heard | Thread spec | Usefulness | Naturalness |
| --- | --- | --- | --- | --- | --- | --- |
| Job discernment | 6 | 9 | 5 | 4.7 | 6.3 | 7 |
| Alzheimer's caregiver | 6.7 | 9 | 6 | 6 | 6.3 | 7 |
| Feeling distant from God | 6.1 | 8.7 | 5.7 | 4 | 6 | 6.3 |
| Sabbath wording correction | 5.9 | 6.1 | 6.4 | 6.6 | 6.9 | 7 |
| Grief | 6.9 | 9 | 6 | 7 | 6.5 | 6.5 |
| Knee pain | 6.4 | 9 | 5 | 6 | 7 | 7 |

## Per-turn delta vs baseline

### Job opportunity

| Turn | Base listen | New listen | Δ | Posture |
| --- | --- | --- | --- | --- |
| 1 | 5.8 | 5.8 | 0 | REFLECT_THEN_HELP |
| 2 | 6.5 | 6.3 | -0.2 | REFLECT_THEN_HELP |
| 3 | 6 | 6 | 0 | REFLECT_THEN_HELP |

### Alzheimer's caregiver

| Turn | Base listen | New listen | Δ | Posture |
| --- | --- | --- | --- | --- |
| 1 | 6.5 | 6.5 | 0 | REFLECT_THEN_HELP |
| 2 | 6.8 | 6.8 | 0 | REFLECT_THEN_HELP |
| 3 | 7.8 | 6.8 | -1 | REFLECT_THEN_HELP |

### Feeling distant from God

| Turn | Base listen | New listen | Δ | Posture |
| --- | --- | --- | --- | --- |
| 1 | 6 | 5.8 | -0.2 | WALK_WITH_ME |
| 2 | 4.8 | 5.3 | 0.5 | WALK_WITH_ME |
| 3 | 7.5 | 7.3 | -0.2 | REFLECT_THEN_HELP |

### Sabbath wording thread

| Turn | Base listen | New listen | Δ | Posture |
| --- | --- | --- | --- | --- |
| 1 | 5.8 | 5.8 | 0 | DIRECT_ANSWER |
| 2 | 6.6 | 6.2 | -0.4 | CORRECTION_RECOVERY |
| 3 | 7.8 | 7.3 | -0.5 | CORRECTION_RECOVERY |
| 4 | 5.4 | 5.4 | 0 | CORRECTION_RECOVERY |
| 5 | 5.8 | 5.4 | -0.4 | CORRECTION_RECOVERY |
| 6 | 5.8 | 5.4 | -0.4 | CORRECTION_RECOVERY |
| 7 | 5.8 | 5.8 | 0 | CORRECTION_RECOVERY |

### Grief thread

| Turn | Base listen | New listen | Δ | Posture |
| --- | --- | --- | --- | --- |
| 1 | 5.8 | 6.3 | 0.5 | REFLECT_THEN_HELP |
| 2 | 6.8 | 7.5 | 0.7 | WALK_WITH_ME |

### Health thread

| Turn | Base listen | New listen | Δ | Posture |
| --- | --- | --- | --- | --- |
| 1 | 6.3 | 6.3 | 0 | REFLECT_THEN_HELP |
| 2 | 6.3 | 6.5 | 0.2 | REFLECT_THEN_HELP |
