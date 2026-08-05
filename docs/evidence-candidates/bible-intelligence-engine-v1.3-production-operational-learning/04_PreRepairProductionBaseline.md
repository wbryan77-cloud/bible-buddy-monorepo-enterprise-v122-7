# 04 — Pre-Repair Production Baseline

Release: `45f44c4` · Isolated user `v13-baseline-*`

| Metric | Value |
|---|---|
| Critical probe cases | 15 |
| Weak heuristic pass rate | 93.3% (14/15) |
| Semantic high-severity misses | resurrection_chronology (FIRST_RESURRECTION + count quality), satan_release yes/no loop |

Authoritative for repair selection: **semanticAssessment** in `pre-repair-results.json`, not weak heuristics alone.
