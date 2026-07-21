# Phase 4J — Memory Forensics Report

Generated: 2026-06-12  
Scope: Read-only inspection. No corpus, doctrine packs, evidence cards, or witness chains modified.

## Files inspected

| File | Role |
|------|------|
| `services/buddyBrain.js` | Session cache, JSONL logs, memory store, `finalizeBuddyResponse` |
| `services/doctrineConversationState.js` | Per-user doctrine state (full-file RMW) |
| `services/doctrineCorrectionMemory.js` | Correction ledger (full-file RMW) |
| `services/doctrineWitnessInventory.js` | Witness state (full-file RMW per persist) |
| `services/liveResponseCapture.js` | Optional capture JSONL |
| `services/runtimeHealthMonitor.js` | Heap metrics, pressure handler |
| `services/safeJsonlWriter.js` | Rotation + slim logging |
| `services/stateTtlCleanup.js` | TTL for doctrine/session JSON maps |

Baseline comparison: **production = `origin/main` @ `1095f921`**. **Local working tree** includes Phase 4E–4H mitigations (mostly uncommitted).

---

## 1. Objects that can grow indefinitely

| Object | Location | Production behavior | Local (4H) behavior |
|--------|----------|---------------------|---------------------|
| `RECENT_SESSION_CACHE` | `buddyBrain.js` | `Map` with **no user cap**; 12 turns/user with merged `runtime` | Capped at 200 users, 30 turns, slim runtime slice |
| Full `structured` in session log | `appendSession` → `buddy-sessions.jsonl` | Entire `structured` + full `runtimeContext` serialized | `slimStructured` only; `safeJsonlWriter` strips bulk fields |
| `buddy-memory.json` | `readMemoryStore` / `writeMemoryStore` | Grows per user; full file parsed on every read | Same (no per-user cap in file) |
| `continuity-memory.json` | `continuityMemoryRuntime.js` | Grows per interaction via `saveContinuityMemory` | Same — **4.7 MB locally** |
| `companion-learning-profiles.json` | `companionLearningLayer` | Per-user growth | Same — **1.8 MB locally** |
| `runtime-relationship-memory.json` | relationship engines | Per-user growth | **1.0 MB locally** |
| Doctrine state files | `doctrineConversationState`, witness, correction | **Not on production** (files absent from `origin/main`) | Full-file RMW; TTL cleanup when deployed |
| `metrics.recentErrors` | `runtimeHealthMonitor.js` | **Not on production** | Bounded to 20 entries |
| In-flight `evidencePack` | `buildRetrievalEvidencePack` | Built on **every** chat turn | Same path; strict gate can short-circuit before OpenAI |

---

## 2. Maps that never clear (production)

| Map | Clears? | Notes |
|-----|---------|-------|
| `RECENT_SESSION_CACHE` | **No TTL, no max users on production** | Only grows until process restart |
| `cleanupTimer` / interval | N/A on production | `stateTtlCleanup` **missing** from `origin/main` |
| Doctrine `users` maps in JSON files | N/A on production | Doctrine state modules not deployed |

---

## 3. Session caches

| Cache | Key | Production | Local 4H |
|-------|-----|------------|----------|
| `RECENT_SESSION_CACHE` | `userId` | Up to 12 turns; full runtime merge from `structured` | 30 turns; slim runtime fields only |
| `getRecentSessions` tail read | `userId` | 512 KB tail of `buddy-sessions.jsonl` on cache miss | Same |
| `activeConversationManager` | `userId` | Flat JSON file `active-conversation-state.json` | TTL cleanup when deployed |

**Production `appendSession` evidence** (`origin/main:services/buddyBrain.js`):

```javascript
appendSession({
  ...
  structured,        // FULL object — scripture arrays, runtime, admin_flags, etc.
  safety,
  runtime: runtimeContext,  // FULL runtime context object
  quality,
});
```

**Local slim path** (`buddyBrain.js` ~797–827): passes `slimStructured` with five runtime fields only.

---

## 4. Witness inventories

| Component | Production | Local (uncommitted) |
|-----------|------------|---------------------|
| `doctrineWitnessInventory.js` | **Missing** | `loadStateFile()` + `persistUserWitnessState()` = **2× full-file read** per witness update |
| `doctrineConversationState.js` | **Missing** | `getDoctrineConversationState` → `loadAll()` on **every** read |
| Witness arrays in state | N/A | `usedWitnesses`, `usedApproved`, `usedSupporting` — trimmed by TTL at 24 refs |

Production doctrine witness behavior runs only inside `retrievalEvidencePack` / evidence cards (in-memory per request), not persisted witness state files.

---

## 5. Correction memory

| Component | Production | Local |
|-----------|------------|-------|
| `doctrineCorrectionMemory.js` | **Missing** | `loadMemory()` / `saveMemory()` full-file RMW |
| `BUILTIN_CORRECTIONS` | In-memory in composer paths only | Duplicated in correction memory module |
| User corrections | Not persisted on production | Append to `doctrine-correction-memory.json` |

---

## 6. Conversation history

| Source | Growth pattern | Risk |
|--------|----------------|------|
| `buddy-sessions.jsonl` | **One line per chat turn**, unbounded on production | **Primary disk + parse risk** |
| `RECENT_SESSION_CACHE` | Retained in heap per distinct `userId` | **Primary heap retention** |
| `buildConversationHistory` in evidence pack | 5 turns × 500/400 char slices per request | Transient allocation |
| `buildThreadLocalMemory` | 6 user + 3 assistant messages per request | Transient allocation |
| `live-request-trace.jsonl` | **Every request on production** (no `BUDDY_LIVE_TRACE` gate) | ~0.5–1 KB/line, unbounded |

Local observed: `buddy-sessions.jsonl` **4.1 MB** active + **1.0 GB** rotated backup (`buddy-sessions.jsonl.*.bak`) from `safeJsonlWriter` rotation during stress runs.

---

## 7. Runtime context storage

Each `finalizeBuddyResponse` on production triggers **multiple full JSON RMW cycles**:

| Writer | File (local size) |
|--------|-------------------|
| `saveConversationState` | `runtime-conversation-state.json` (740 KB) |
| `saveContinuityMemory` | `continuity-memory.json` (**4.7 MB**) |
| `savePrayerContinuity` | `runtime-prayer-continuity.json` |
| `saveStudyContext` | study continuity files |
| `recordCompanionLearning` | `companion-learning-profiles.json` (1.8 MB) |
| `persistRelationshipMemoryFromInteraction` | relationship memory files |
| `savePersonalityContinuity` | `runtime-personality-continuity.json` (904 KB) |
| `persistCompanionRelationshipState` | `runtime-relationship-memory.json` (1.0 MB) |
| `updateUserMemory` | `buddy-memory.json` (820 KB) — **full file read + write** |
| `recordCompanionEvent` | `companion-intelligence-events.jsonl` (1.4 MB) |

**Per request**, production can parse **>10 MB** of JSON from disk when continuity files are warm.

---

## 8. JSONL growth

| File | Production append | Rotation | Local size |
|------|-------------------|----------|------------|
| `buddy-sessions.jsonl` | `JSON.stringify(full entry)` async | **None** | 4.1 MB (+ 1 GB bak) |
| `buddy-quality-events.jsonl` | Full entry | **None** | 3.1 MB |
| `live-request-trace.jsonl` | **Every chat** on production | **None** | 2.1 KB (low local traffic) |
| `companion-intelligence-events.jsonl` | `appendFileSync` full entry | **None** | 1.4 MB |
| `companion-events.jsonl` | Various | **None** | 196 KB |
| `runtime-health-history.jsonl` | Local only | Trim at 1000 lines | 240 KB |
| Phase 4e diagnostic JSONL | Local only | 2 MB cap per file locally | 2 MB × 3 files |

Production has **no** `safeJsonlWriter.js` — no line truncation, no 5 MB rotation.

---

## 9. File growth (local `data/` snapshot)

| File | Size | Category |
|------|------|----------|
| `buddy-sessions.jsonl.*.bak` | **1.0 GB** | Session log (rotated) |
| `buddy-sessions.jsonl` | 4.1 MB | Session log |
| `continuity-memory.json` | 4.7 MB | Continuity RMW |
| `buddy-quality-events.jsonl` | 3.1 MB | Quality log |
| `companion-learning-profiles.json` | 1.8 MB | Learning state |
| `companion-intelligence-events.jsonl` | 1.4 MB | Events log |
| `life-timeline-memory.json` | 1.3 MB | Timeline state |
| `runtime-relationship-memory.json` | 1.0 MB | Relationship state |

Render uses ephemeral disk; unbounded JSONL still consumes RAM when read and contributes to OOM under load.

---

## 10. Circular references

| Area | Finding |
|------|---------|
| `structured.runtime` ↔ session cache | Session cache stores slimmed `runtime`; production stores merged `structured.runtime` + separate `runtimeContext` — **no true circular JSON**, but **duplicate runtime data** in log line and cache |
| `evidencePack` | References `recentSessions` built from cache; cache built from logs — **logical cycle** across request boundaries, not circular `JSON.stringify` |
| `getRecentSessionCacheSize` ↔ `runtimeHealthMonitor` | `require('./buddyBrain')` inside monitor — module cycle safe in Node |
| `JSON.stringify` on production session entry | Can throw or produce **huge strings** if `structured` contains deep `runtime` trees — historical Render crash vector (Phase 4F audit) |

No evidence of intentional circular object graphs; risk is **duplication and depth**, not reference cycles.

---

## Summary — real production memory growth sources (pre-4H deploy)

1. **Unbounded `buddy-sessions.jsonl`** with **full `structured` + `runtimeContext`** per turn.
2. **Unbounded `RECENT_SESSION_CACHE`** (no user cap, 12 fat turns each).
3. **Per-request `buildRetrievalEvidencePack`** + **OpenAI `composeReasonFirstReply`** heap spikes.
4. **Multi-file JSON RMW** on every `finalizeBuddyResponse`, especially `continuity-memory.json` scale.
5. **Always-on `live-request-trace.jsonl`** on production (no env gate).
6. **Unbounded** `buddy-quality-events.jsonl` and `companion-intelligence-events.jsonl`.

Local Phase 4H mitigates items 1–2 and partially 5–6 when deployed; items 3–4 remain structurally heavy until further consolidation.
