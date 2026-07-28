# 81 — Memory Durability and Topology

## Production topology

Render web service; `/health.releaseCommit` tracks git tip. Multiple instances possible; **no sticky-session guarantee** documented in-repo.

## Storage reality

| Store | Mechanism | Survives restart (same disk) | Multi-instance safe |
|---|---|---|---|
| `data/relationship-memory.json` | Local file RMW | Yes if disk persists | **No** |
| `data/doctrine-conversation-state.json` | Local file | Same | **No** |
| `data/user-correction-memory.json` | Local file | Same | **No** |
| `data/explicit-remember-pins.json` | Local file | Same | **No** |

## Product implication

Same-conversation continuity on one instance works (proved by sequential probes).  
**Long-term / cross-instance durability is not guaranteed** by current authoritative stores.

Phase 7B does **not** add a database (batch prohibition). Limitation documented for Founder Experience Loop / future durable-memory owner work.

## Promise framing

Companion should speak as session-capable memory unless durable retention is explicitly confirmed by product policy + shared store.
