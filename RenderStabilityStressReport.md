# Render Stability Stress Report

**Phase:** 2F Part E  
**Run:** 2026-06-08T04:57:11.745Z

---

## Runtime metrics

| Metric | Value |
|--------|-------|
| Total turns | 125 |
| OpenAI calls | 125 |
| OpenAI call rate | 100% |
| Connection errors | 0 |
| Runtime exceptions | 0 |
| Regeneration hints | 35 |
| Peak RSS (MB) | unavailable |
| Average RSS (MB) | unavailable |
| Average latency (ms) | 6746 |
| Peak latency (ms) | 30629 |

---

## Approval distribution

| Decision | Count | % |
|----------|-------|---|
| approved | 89 | 71.2% |
| degraded | 36 | 28.8% |
| rejected | 0 | 0% |

---

## By group

| Group | Turns | Approved | Degraded | Avg latency ms |
|-------|-------|----------|----------|----------------|
| doctrine | 30 | 18 | 12 | 8372 |
| emotional | 30 | 26 | 4 | 4305 |
| mixed | 35 | 23 | 12 | 7151 |
| challenge | 30 | 22 | 8 | 7086 |

---

## Multi-turn chain stability

| Chain | Turns | Degraded | Class C |
|-------|-------|----------|--------|
| chain_death_5 | 5 | 2 | 7 |
| chain_sabbath_5 | 5 | 2 | 8 |
| chain_pork_5 | 5 | 2 | 2 |
| chain_kingdom_5 | 5 | 1 | 4 |
| chain_grief_logos_5 | 5 | 3 | 6 |

---

## Assessment

- **OpenAI stability:** PASS — zero connection errors and zero runtime exceptions across 125 turns.
- **Memory:** RSS snapshots returned null in this environment; memory delta per-turn was not reliably captured. No OOM or crash observed.
- **Degradation:** 36 turns (29%) received degraded answers due to Class C claims — approval gate functioned as designed.
