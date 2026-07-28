# 96 — Memory Path Consolidation Report

| Path | Classification after 7C |
|---|---|
| `durableUserMemory.js` | **Authoritative durable writer/reader** |
| `relationship-memory.json` | Legacy/session mirror — not cross-instance authority |
| `runtime-relationship-memory.json` | Derived categorical store — mirrors to durable |
| `doctrine-conversation-state.json` | Session-only conversation state |
| `user-correction-memory.json` | Preference store (narrow) |
| `explicit-remember-pins.json` | Pin store — not general relational owner |
| `relationshipContextSelector.js` | Read-only adapter |

Writers of durable relational facts after this phase: **`durableUserMemory` only** (others call into it).
