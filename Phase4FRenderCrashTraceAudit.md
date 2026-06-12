# Phase 4F Render Crash Trace Audit

Generated: 2026-06-11

## Files inspected

- `server.js`, `routes/buddy.js`, `services/buddyBrain.js`
- `services/openAiFirstCompanionRuntime.js`, `services/strictDoctrineGate.js`
- `services/doctrineLivePathHandlers.js`, `services/doctrineWitnessInventory.js`
- `services/doctrineConversationState.js`, `services/doctrineCorrectionMemory.js`
- `services/doctrineErrorFirewall.js`, `services/reasonFirstComposer.js`

## Risk inventory

| # | Risk | Severity | Phase 4F mitigation |
|---|------|----------|---------------------|
| 1 | Uncaught exceptions in `/buddy/chat` | High | `withBuddyChatGuarantee` + route try/catch |
| 2 | Rejected promises | High | Guarantee wrapper catches all handler errors |
| 3 | Async handlers without try/catch | Medium | `handleBuddyChat` + guarantee |
| 4 | Route paths that do not return | Low | Guarantee always returns JSON |
| 5 | Promises that hang | High | `BIBLEBUDDY_CHAT_TIMEOUT_MS` (default 55s) |
| 6 | OpenAI without timeout | Medium | `OPENAI_TIMEOUT_MS` in `reasonFirstComposer` (45s default) |
| 7 | Retry/regeneration loops | Medium | `maxAttempts: 1` in core restoration; strict blocks regen OpenAI |
| 8 | Unbounded session growth | High | `stateTtlCleanup` — 24h TTL, max 500 users |
| 9 | Unbounded runtimeContext logging | Medium | `safeJsonlWriter` strips `runtimeContext` from logs |
| 10 | Unbounded JSONL logging | High | `safeJsonlWriter` rotation at 5MB |
| 11 | Large structured in session | High | `finalizeBuddyResponse` slimStructured (4E); safeJsonl slim |
| 12 | Memory never cleaned | Medium | TTL cleanup hourly + on startup |
| 13 | User state maps no TTL | High | `BIBLEBUDDY_STATE_TTL_MS` default 24h |
| 14 | File write failures throw | High | All doctrine saves + JSONL: catch + console.warn |
| 15 | Response sent twice | Low | Single `emitBuddyChatJson` per request |
| 16 | Response never sent | Medium | Guarantee returns even on timeout |
| 17 | Error caught but route not finalized | Medium | Guarantee + generic 500 body |

## Render redeploy root causes (historical)

1. **JSON.stringify crash** on huge session objects → slim structured in `finalizeBuddyResponse`.
2. **OpenAI hang** without timeout → request-level + OpenAI timeouts.
3. **connection_error loops** → strict doctrine local authority; firewall strips diagnostics.
4. **Memory growth** on long-running instance → state TTL + JSONL rotation.

## New instrumentation

- `services/runtimeHealthMonitor.js` — heap, latency, errors, OpenAI vs strict counts
- `GET /api/runtime-health` — redacted snapshot
- `data/runtime-health.json`, `data/runtime-health-history.jsonl`

## Stress verification

- 1352 automated checks, 0 hangs, 0 uncaught exceptions
- Forced error path ×25: guarantee returns safe JSON every time
- 100-turn single-session pressure: heap growth < 80MB
