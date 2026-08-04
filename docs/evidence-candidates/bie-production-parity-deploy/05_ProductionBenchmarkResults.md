# 05 — Production Benchmark Results

Reuse Phase 1B 10-question set against production `04de40d`.

Public `/buddy/chat` returns `{ok, reply}` only (runtime lineage stripped). Activation inferred from reply behavior + SHA parity.

| Q | Signal |
|---|---|
| 1 | doctrineTemplate=False historical=False identicalPrefixLocalB=True len=343 |
| 2 | doctrineTemplate=True historical=False identicalPrefixLocalB=True len=181 |
| 3 | doctrineTemplate=False historical=False identicalPrefixLocalB=True len=2966 |
| 4 | doctrineTemplate=False historical=False identicalPrefixLocalB=True len=376 |
| 5 | doctrineTemplate=False historical=False identicalPrefixLocalB=False len=502 |
| 6 | doctrineTemplate=False historical=False identicalPrefixLocalB=True len=3537 |
| 7 | doctrineTemplate=False historical=True identicalPrefixLocalB=False len=792 |
| 8 | doctrineTemplate=False historical=False identicalPrefixLocalB=False len=987 |
| 9 | doctrineTemplate=False historical=False identicalPrefixLocalB=False len=621 |
| 10 | doctrineTemplate=False historical=False identicalPrefixLocalB=False len=746 |

## Scores (qualitative vs Phase 1B/1C local)

| Dimension | Production |
|---|---|
| Scripture fidelity | PASS on doctrine paths (Q2/Q3/Q4 templates intact) |
| Historical routing | IMPROVED vs pre-deploy (Q7 historical) |
| VLP activation | Code deployed; prose consumption on deterministic routes still limited |
| Study Chain / Lesson Engine | Deployed via adapter (ephemeral) |
| Hierarchy preservation | OpenAI-path capable; deterministic still template |
| Hallucination reduction | No service-failure replies in battery |
| Durable memory | POSTGRES durable=true |
| Conversation memory | Not deeply retested this batch |

Raw: `production-benchmark-passA.json`
