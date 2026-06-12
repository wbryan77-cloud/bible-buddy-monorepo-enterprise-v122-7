# Phase 4H Runtime Health Report

Generated: 2026-06-11

## Endpoint

`GET /api/runtime-health` (local ✅ | Render ❌ until deploy)

## Snapshot fields (Phase 4H)

| Field | Description |
|-------|-------------|
| `heapUsedMB` | V8 heap used |
| `rssMB` | Process RSS |
| `heapLimitMB` | V8 heap limit |
| `memoryPressureLevel` | `normal` / `warn` / `critical` |
| `pid` | Process ID |
| `uptimeMs` | Since server start |
| `activeSessions` | `RECENT_SESSION_CACHE` size |
| `activeDoctrineStates` | Users in doctrine-conversation-state |
| `openAiCalls` | Total OpenAI calls recorded |
| `strictDoctrineCalls` | Strict doctrine turns |
| `strictDoctrineOpenAiBlocked` | Strict turns without OpenAI |
| `continuations` | Witness continuation routes |
| `errors` / `timeouts` | Cumulative counters |
| `recentErrors` | Last 20 compact errors |
| `recentTimeouts` | Last 20 timeout events |
| `averageLatencyMs` / `maxLatencyMs` | Request latency |
| `openAiConfigured` / `openAiDisabled` | Env flags |

## Persistence

- `data/runtime-health.json` — current snapshot
- `data/runtime-health-history.jsonl` — trimmed to 1000 lines

## Critical memory behavior

Does **not** crash. On critical pressure:

- Runs TTL cleanup
- Trims session cache
- Trims health history
- Logs compact JSONL event only

## Local sample (after stress test)

- RSS: ~248 MB
- `memoryPressureLevel`: `normal`
- `strictDoctrineOpenAiBlocked` > 0 during doctrine tests
