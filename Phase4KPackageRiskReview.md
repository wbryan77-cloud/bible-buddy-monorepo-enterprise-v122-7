# Phase 4K — Package Risk Review

Generated: 2026-06-12

## 1. Could strict doctrine stop non-doctrine companion chat?

| | |
|--|--|
| **Risk level** | **Low** |
| **Mitigation** | `strictDoctrineGate` runs only when `doctrineTopicDetector` / evidence pack marks strict topic or continuation on active doctrine thread. Grief, prayer, health, memory recall, crisis paths remain in `openAiFirstCompanionRuntime` before gate. |
| **Test evidence** | Phase 4F 1352/1352 includes non-doctrine companion scenarios; 4H cases `6_memory`, `7_before` PASS. |

## 2. Could memory caps erase useful companion memory too aggressively?

| | |
|--|--|
| **Risk level** | **Medium** (TTL) / **Low** (cache caps) |
| **Mitigation** | `stateTtlCleanup`: 24h default TTL, max 500 users in state files; trims witness/correction arrays not whole companion profile in `buddy-memory.json`. Session cache: 200 users × 30 turns — recent chat context only, not long-term memory files. |
| **Test evidence** | 4H memory stress 1650 turns, 0 blanks; continuity paths exercised. TTL not run mid-stress at destructive scale in single test — monitor `activeSessions` post-deploy. |

## 3. Could JSONL caps break reports?

| | |
|--|--|
| **Risk level** | **Low** |
| **Mitigation** | `safeJsonlWriter` rotates at 5 MB to `.bak` (does not delete). Line cap ~12 KB; strips `structured`, `runtimeContext`, `responseBody` from **logs only** — not API responses. |
| **Test evidence** | Phase 4J local: rotation produced 1 GB `.bak` — reports can read rotated files. 4F/4H regressions do not depend on full historical JSONL. |

## 4. Could `/api/runtime-health` expose sensitive data?

| | |
|--|--|
| **Risk level** | **Low** |
| **Mitigation** | Returns aggregate metrics: heap/rss, counts, latency stats, booleans (`openAiConfigured`). `recentErrors` truncated to 120 chars, no message content. No `OPENAI_API_KEY` value. No user message text. |
| **Test evidence** | Local curl snapshot reviewed in Phase 4J; no PII fields in `getRuntimeHealthSnapshot()`. |

## 5. Could `responseGuarantee` hide real errors from logs?

| | |
|--|--|
| **Risk level** | **Low–medium** |
| **Mitigation** | `console.warn('[responseGuarantee] chat error:', ...)` on failures; `runtimeHealthMonitor.recordRequestOutcome` increments `errors` and `recentErrors`. User sees safe JSON, not raw stack. |
| **Test evidence** | 4F forced error path ×25 logs `forced_test_error`; 4H timeout tests log `forced_timeout_test`. Errors visible in server logs and health endpoint. |

## 6. Could production still OOM on 512 MB plan?

| | |
|--|--|
| **Risk level** | **Medium** (residual) |
| **Mitigation** | Package addresses #1 OOM sources: slim session logs, JSONL rotation, cache caps, strict gate (fewer OpenAI retainers), TTL cleanup, pressure trim at 350/450 MB RSS. |
| **Test evidence** | Local stress peak RSS **344.6 MB** with mitigations. Production without continuity-file RMW fix (#3 from Phase 4J) may still approach limit under 100+ concurrent users. Monitor `rssMB` hourly post-deploy; structural continuity storage is follow-up. |

## Summary

| Risk | Level | Blocking deploy? |
|------|-------|----------------|
| Strict gate blocks companion | Low | No |
| Memory TTL too aggressive | Medium | No — monitor |
| JSONL rotation breaks reports | Low | No |
| Health endpoint leaks secrets | Low | No |
| Guarantee hides errors | Low–medium | No |
| Residual OOM on 512 MB | Medium | No — deploy + monitor |
