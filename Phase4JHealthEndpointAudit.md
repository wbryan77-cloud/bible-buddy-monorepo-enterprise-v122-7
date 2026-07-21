# Phase 4J — Health Endpoint Audit

Generated: 2026-06-12

## Components verified

| Component | Path | Status |
|-----------|------|--------|
| Monitor | `services/runtimeHealthMonitor.js` | Present locally; **absent from `origin/main`** |
| Route | `routes/runtimeHealth.js` | Present locally (`??` untracked); **absent from `origin/main`** |
| Server mount | `server.js` line ~96 | Local: `mountRoute('Runtime health routes', '/api', './routes/runtimeHealth')` + `scheduleStateTtlCleanup` |
| Production server | `origin/main:server.js` | **No** runtime-health mount |

---

## Required fields checklist

| Field | Required | Local `GET /api/runtime-health` | Production |
|-------|----------|-----------------------------------|------------|
| `heapUsed` | Yes (as MB) | ✅ `heapUsedMB`: 19.3 | ❌ 404 |
| `rss` | Yes (as MB) | ✅ `rssMB`: 85.8 | ❌ 404 |
| `activeSessions` | Yes | ✅ `activeSessions`: 0 | ❌ 404 |
| `errors` | Yes | ✅ `errors`: 0 | ❌ 404 |
| `timeouts` | Yes | ✅ `timeouts`: 0 | ❌ 404 |
| `uptime` | Yes (as ms) | ✅ `uptimeMs`: 1786 | ❌ 404 |

**Note:** Local API returns `heapUsedMB` / `rssMB` / `uptimeMs` rather than literal keys `heapUsed` / `rss` / `uptime`. Semantically equivalent; consumers should map:

```javascript
heapUsed: snap.heapUsedMB,
rss: snap.rssMB,
uptime: snap.uptimeMs,
```

---

## Local verification (2026-06-12)

```text
GET http://127.0.0.1:3851/api/runtime-health → 200

{
  "ok": true,
  "heapUsedMB": 19.3,
  "rssMB": 85.8,
  "uptimeMs": 1786,
  "errors": 0,
  "timeouts": 0,
  "activeSessions": 0,
  "memoryPressureLevel": "normal",
  "heapLimitMB": ...,
  "activeDoctrineStates": 0,
  "openAiCalls": 0,
  "strictDoctrineCalls": 0,
  ...
}
```

Startup log: `Runtime health routes loaded at /api`

---

## Production verification (2026-06-12)

```text
GET https://bible-buddy-monorepo-enterprise-v122-7.onrender.com/api/runtime-health → 404
Body: {"ok":false,"error":"Not found","path":"/api/runtime-health"}

GET https://bible-buddy-monorepo-enterprise-v122-7.onrender.com/health → 200
Body: {"health":{"ok":true,"version":"v122.14.0 ..."}, "providers": {...}}
```

Production **general health** (`/health`) is alive; **runtime memory health** is **not wired**.

---

## `runtimeHealthMonitor.js` capabilities (local only)

| Feature | Implementation |
|---------|----------------|
| Memory sampling | `sampleMemory()` — heap + RSS + `v8.getHeapStatistics()` |
| Pressure levels | `normal` / `warn` (350 MB RSS) / `critical` (450 MB RSS) |
| Doctrine state count | `countDoctrineStates()` — reads full `doctrine-conversation-state.json` |
| Session count | `getRecentSessionCacheSize()` from `buddyBrain` |
| Request outcomes | `recordRequestOutcome()` — latency, errors, timeouts, OpenAI vs strict |
| Proactive trim | Every 50 requests: `trimRecentSessionCache()` |
| Pressure handler | TTL cleanup, cache trim, health history trim |
| Persistence | `data/runtime-health.json`, `data/runtime-health-history.jsonl` |

**Gap:** `recordRequestOutcome` is only useful when wired from `routes/buddy.js` / guarantee wrapper — verify on deploy that buddy route calls it (local `responseGuarantee` / buddy route should invoke monitor).

---

## Production readiness verdict

| Gate | Result |
|------|--------|
| Health route exists in deployed code | **FAIL** — 404 on Render |
| Required metrics exposed | **FAIL** on production; **PASS** locally |
| Memory pressure automation | **FAIL** on production (monitor not deployed) |
| TTL cleanup on startup | **FAIL** on production (`stateTtlCleanup` not deployed) |
| Post-deploy observability | **BLOCKED** until Phase 4I package pushed |

**Readiness:** Local stack is **ready**; production is **not ready** for memory forensics or proactive trim — deploy skew is the blocker, not monitor design.
