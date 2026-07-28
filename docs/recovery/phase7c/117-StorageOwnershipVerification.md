# 117 — Storage Ownership Verification

## Authoritative writer (one)

| Component | Classification |
|---|---|
| `services/durableUserMemory.js` | **Authoritative Owner** |

## Dual-write callers (must not become owners)

| Component | Classification |
|---|---|
| `relationshipMemoryEngine.js` | Temporary/session mirror → calls `upsertMemory` |
| `runtimeRelationshipMemoryEngine.js` | Derived category store → mirrors into durable |
| `bibleCompanionOrchestrator.js` | Runtime consumer → `ensureHydrated` / `flushUser` |

## Read-only / derived

| Component | Classification |
|---|---|
| `relationshipContextSelector.js` | Read-only adapter |
| `relationshipSummaryEngine.js` | Derived summary |
| Local `data/relationship-memory.json` | Legacy/non-authoritative cache |
| `data/runtime-relationship-memory.json` | Derived mirror |
| `doctrine-conversation-state.json` | Temporary conversation state |

## Persistence layer

| Component | Classification |
|---|---|
| `storageAdapter.getStorageAdapter()` | Shared interface |
| `PostgresStorageAdapter` | Durable backend when URL set |
| `FileStorageAdapter` | Dev/single-instance fallback |

Machine-readable: `fixtures/ownership-trace.json`
