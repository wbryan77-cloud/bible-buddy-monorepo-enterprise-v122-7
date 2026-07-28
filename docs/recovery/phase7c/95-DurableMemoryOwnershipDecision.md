# 95 — Durable Memory Ownership Decision

## Authoritative owner

**`services/durableUserMemory.js`**

Persistence backend (existing infrastructure, no new DB product):

| Condition | Backend | Cross-instance durable? |
|---|---|---|
| `DATABASE_URL` set | Existing `PostgresStorageAdapter` → table `bible_buddy_documents` | **Yes** |
| Otherwise | `FileStorageAdapter` → `data/durable-user-memory.json` | No (dev/single-instance fallback) |

Document key: `data/durable-user-memory.json` (same path convention as `postgresAdapter.js`).

## Why this owner

- `runtimeRelationshipMemoryEngine` / `relationshipMemoryEngine` were **semantic** owners but file-local.
- `services/persistence/postgresAdapter.js` already defines the shared document store.
- Phase 7C wires relational records through one API (`upsertMemory` / `ensureHydrated` / `flushUser`) onto that store.

## Consumers (not owners)

| Component | Role |
|---|---|
| `relationshipMemoryEngine` | Session mirror + signal capture; dual-writes durable |
| `runtimeRelationshipMemoryEngine` | Category capture; mirrors into durable |
| `relationshipContextSelector` | Read-only adapter |
| Local `relationship-memory.json` | Non-authoritative cache/mirror |

## Gate Layer 1

Architecture implemented. Production cross-instance authority requires `DATABASE_URL` + schema apply (see `98`).
