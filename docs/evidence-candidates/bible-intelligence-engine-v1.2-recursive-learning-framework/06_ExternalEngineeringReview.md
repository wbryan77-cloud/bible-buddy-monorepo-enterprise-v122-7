# 06 — External Engineering Review

Compared BIE against 2025–2026 enterprise agent patterns (eval pipelines, OTel GenAI tracing, event-sourced agents, HITL governance, cost canaries). Sources consulted: enterprise agent reference architectures; event-sourced agent blueprints; MLflow/agent observability guides; OTel-centric lineage patterns. **No vendor stack copied.**

| Pattern | Adopt? | Why | Measured benefit | Operational cost | Risk |
|---|---|---|---|---|---|
| Offline → shadow → canary eval tiers | **Keep (internal)** | Matches BIE shadow-before-promotion | Prevents silent regression | Low (existing suites) | Low |
| Event-sourced learning ledger | **Keep / harden** | Already core of FEL | Replay + audit | Storage growth | Dual-write divergence |
| OTel GenAI full prompt capture | **Reject as default** | Privacy / retention conflict with BIE policy | Marginal vs safe refs | High privacy cost | Secret/PII leak |
| LangSmith / vendor eval platforms | **Reject for now** | Lock-in + data egress; prior v1.1A decision | Unproven vs internal loop | Vendor + privacy | Medium |
| OpenAI Evals platform | **Reject** | Platform deprecation timeline (narrowed in v1.1A) | None | Migration tax | High |
| Numeric uncalibrated confidence % | **Reject** | v1.1A correctly shadows ordinal bands | Avoid false certainty | — | Governance |
| Postgres vector / separate graph DB | **Defer** | No measured retrieval win yet; books still INDEXED_ONLY | Speculative | Ops complexity | Architecture duplication |
| HITL approval gates | **Keep** | Already Admin Decision Queue | Safety | Human latency | Correct |
| Cost as canary metric | **Adopt lightly** | Extend `costLedger` with real usage when available | Detect loops/drift | Low | Estimate error |
| Model routing platforms | **Reject now** | Would add parallel runtime path | Speculative | High | Violates one-runtime rule |

## Recommendation

Improve **recursive closure** of the internal loop before adopting any external platform. External tools are design references only until a measured gap remains after LEARN works.
