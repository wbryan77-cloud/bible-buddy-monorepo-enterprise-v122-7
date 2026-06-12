# Phase 4H State Boundaries Report

Generated: 2026-06-11

## Environment defaults

| Variable | Default | Purpose |
|----------|---------|---------|
| `BIBLEBUDDY_STATE_TTL_MS` | `86400000` (24h) | Expire doctrine/session state |
| `BIBLEBUDDY_MAX_SESSION_TURNS` | `30` | Cache + memory summaries |
| `BIBLEBUDDY_MAX_CORRECTIONS_PER_TOPIC` | `20` | Correction preferences |
| `BIBLEBUDDY_MAX_WITNESSES` | `24` | Used witness lists |
| `BIBLEBUDDY_MAX_STATE_USERS` | `500` | Max users in state files |
| `BIBLEBUDDY_MAX_SESSION_CACHE_USERS` | `200` | In-memory session cache |
| `BIBLEBUDDY_MAX_JSONL_LINE_BYTES` | `12000` | JSONL line cap |
| `BIBLEBUDDY_HEALTH_HISTORY_MAX_LINES` | `1000` | Health history trim |
| `BIBLEBUDDY_MEMORY_WARN_MB` | `350` | RSS warn threshold |
| `BIBLEBUDDY_MEMORY_CRITICAL_MB` | `450` | RSS critical → cleanup |

## TTL cleanup (`stateTtlCleanup.js`)

Runs on startup + hourly. Files:

- `doctrine-conversation-state.json`
- `doctrine-correction-memory.json`
- `doctrine-witness-state.json`
- `active-conversation-state.json`

## Session log slimming (`buddyBrain.js`)

`appendSession` stores:

- `structured`: masterRoute, openAiCalled, doctrineTopic only
- `runtime`: intent, emotion only
- `reply`: max 400 chars in cache; message max 300

## Memory pressure (`runtimeHealthMonitor.js`)

On warn/critical RSS:

1. `runStateTtlCleanup()`
2. `trimRecentSessionCache()`
3. Trim health history JSONL
4. Log compact event to `phase4h-memory-pressure.jsonl`

Every 50 requests: proactive `trimRecentSessionCache()`.

## What is never persisted

- Full `structured` response objects
- Full `runtimeContext`
- Full OpenAI completion payloads
- Full `responseBody` in live capture (unless `BUDDY_CAPTURE=1`, then preview only)
