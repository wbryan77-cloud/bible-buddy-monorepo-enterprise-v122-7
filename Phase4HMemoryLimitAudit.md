# Phase 4H Memory Limit Audit

Generated: 2026-06-11

## Render incident

Web service exceeded memory limit → auto-restart. Correlates with unbounded session/logging growth and full-object persistence (pre–Phase 4H).

## Files inspected

`buddyBrain.js`, `openAiFirstCompanionRuntime.js`, `activeConversationManager.js`, `doctrineConversationState.js`, `doctrineCorrectionMemory.js`, `doctrineWitnessInventory.js`, `runtimeHealthMonitor.js`, `phase4eRuntimeDiagnostics.js`, `safeJsonlWriter.js`, `liveResponseCapture.js`, `requestMemoryLogger.js`

## Findings (before Phase 4H fixes)

| # | Risk | Location | Severity |
|---|------|----------|----------|
| 1 | Full `structured` in session JSONL | `appendSession` | **Fixed** — `slimStructured` only in log |
| 2 | Full `runtimeContext` in session | `appendSession` | **Fixed** — intent/emotion only |
| 3 | `RECENT_SESSION_CACHE` unbounded users | `buddyBrain.js` | **Fixed** — max 200 users + trim |
| 4 | Cache held full replies | `RECENT_SESSION_CACHE` | **Fixed** — reply capped 400 chars |
| 5 | `buddy-sessions.jsonl` tail read 512KB | `getRecentSessions` | OK — tail-only read |
| 6 | `buddy-memory.json` full read/write per turn | `updateUserMemory` | Mitigated — summaries capped at `MAX_SESSION_TURNS` |
| 7 | `live-response-capture.jsonl` full `responseBody` | `liveResponseCapture.js` | **Fixed** — shape + preview only |
| 8 | Doctrine state files grow per user | `doctrineConversationState.json` | **Fixed** — TTL + max users 500 |
| 9 | `active-conversation-state.json` no TTL | `activeConversationManager.js` | **Fixed** — TTL in `stateTtlCleanup` |
| 10 | `phase4d1` raw `appendFileSync` | `phase4d1RuntimeDiagnostics.js` | Partial — phase4e uses safe writer |
| 11 | Health history JSONL unbounded | `runtime-health-history.jsonl` | **Fixed** — trim to 1000 lines |
| 12 | No memory pressure response | runtime | **Fixed** — `handleMemoryPressure()` |

## Hard limits enforced (Phase 4H)

- Never persist full `structured` / `runtimeContext` in session logs
- Never persist full OpenAI raw response in capture logs
- Session cache: slim runtime fields only
- JSONL: max line 12000 bytes (configurable)
- State TTL: 24h default
- Corrections: max 20/topic
- Witnesses used: max 24/topic
- Session turns: max 30 (cache + memory summaries)

## Stress validation

`runPhase4HMemoryStressTest.js` — **1650 turns PASS**

- Peak RSS: ~277 MB (under 512 MB Render standard)
- 0 blank responses, 0 strict OpenAI calls, 0 bad user text
- Heap growth ~31 MB over run (bounded)
