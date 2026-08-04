# 10 — Performance And Payload Report

| Metric | Observation |
|---|---|
| Deterministic sabbath compose | <5ms local (no OpenAI) |
| Stateful total wall | ~665s (dominated by OpenAI turns in sequences) |
| Strict doctrine turn latency | typically <50ms after pack attach |
| Payload | additive `doctrineDecision` on structured only; HTTP reply still string after finalize |
| Packet schema size | unchanged |

Pre/post latency for the D1 sabbath path is neutral-to-faster (avoids identical long template + still no OpenAI on strict).
