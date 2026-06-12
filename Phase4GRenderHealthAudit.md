# Phase 4G Render Health Audit

Generated: 2026-06-11 (re-verified 18:43 UTC)  
Target: `https://bible-buddy-monorepo-enterprise-v122-7.onrender.com`

## Method

- `GET /health` — available on Render
- `GET /api/runtime-health` — **Phase 4F endpoint; not on current Render build**

Long-interval sampling (5 / 15 / 30 / 60 min) for `runtime-health` **cannot run until Phase 4F is deployed**. Below: immediate samples + local baseline.

## Render `/health` samples

| Interval | Time (UTC) | HTTP | Version | OpenAI provider |
|----------|------------|------|---------|-----------------|
| Startup | 18:31:30 | 200 | v122.14.0 | configured |
| +0s (repeat) | 18:31:30 | 200 | v122.14.0 | configured |

## Render `/api/runtime-health`

| Interval | HTTP | Body |
|----------|------|------|
| Startup | **404** | `Not found` path `/api/runtime-health` |
| 5 min (script label) | **404** | same |

**Metrics unavailable on production:** heapUsed, rss, latency, timeouts, fallbacks, errors, activeSessions, strictDoctrineOpenAiBlocked.

## LOCAL `/api/runtime-health` (Phase 4F code)

| Metric | Value at startup |
|--------|------------------|
| heapUsedMB | 17.3 |
| rssMB | 81.8 |
| errors | 0 |
| timeouts | 0 |
| fallbackCount | 0 |
| openAiCalls | 0 |
| strictDoctrineCalls | 0 |
| totalRequests | 0 |

## Inference from live smoke (Render chat latency)

During remote smoke (27 requests over ~2 min):

| Observation | Value |
|-------------|-------|
| Acts 10 initial latency | **12,161 ms** |
| Correction latency | 2,812 ms |
| Connection-error turns | 3–10+ (`core_connection_error`) |
| Blank replies | death continuation ×10, dietary, memory |
| OpenAI route | `reason_first_openai` on doctrine turns |

**Stability signal:** After several OpenAI calls, service returned empty replies and `trouble reaching the AI service` — consistent with historical Render instability **before** Phase 4F repairs.

## Health audit verdict

| Criterion | Render (current) | Local Phase 4F |
|-----------|------------------|----------------|
| Health endpoint | Stable 200 | Stable 200 |
| Runtime health API | Missing | Present |
| Metrics stable under load | **Degraded** (errors, blanks) | **Stable** (1352/1352 stress) |
| Manual redeploy required | **Likely** (error loop pattern) | No |

## Post-deploy monitoring plan

After deploying Phase 4F, re-run:

```bash
DEPLOY_URL=https://bible-buddy-monorepo-enterprise-v122-7.onrender.com node scripts/runPhase4GProductionParityVerification.js
```

Poll `GET /api/runtime-health` at 5 / 15 / 30 / 60 min and confirm `errors` and `timeouts` do not climb during smoke session.
