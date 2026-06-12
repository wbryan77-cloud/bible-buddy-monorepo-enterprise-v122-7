# Phase 4G Startup Parity Report

Generated: 2026-06-11

## LOCAL startup sequence (verified)

```
server.js
  → express + dotenv + DATA_DIR mkdir
  → static routes (/health, /api/health)
  → mountRoute('/buddy', routes/buddy)          ✅
  → mountRoute('/api', routes/runtimeHealth)    ✅ Phase 4F
  → scheduleStateTtlCleanup()                   ✅ Phase 4F
  → other optional routes (fail-soft)
  → app.listen → logStartupDiagnostics()
```

**Console order (local port 3847):**

1. Buddy routes loaded at `/buddy`
2. Runtime health routes loaded at `/api`
3. `Bible Buddy v122.14.0 listening…`
4. Runtime mode: `legacy → openAiFirstCompanionRuntime`
5. OpenAI ready: true

**Local endpoints after startup:**

| Endpoint | Status |
|----------|--------|
| `GET /health` | 200 |
| `GET /api/runtime-health` | 200, `ok: true` |

## RENDER startup (inferred from live probes)

| Check | Result |
|-------|--------|
| `GET /health` | 200, version `v122.14.0` |
| `GET /api/runtime-health` | **404 Not found** |
| `POST /buddy/chat` Acts 10 | 200, route `reason_first_openai` |

**Conclusion:** Render loads `server.js` and `/buddy` but **not** Phase 4F additions (`routes/runtimeHealth.js`, `stateTtlCleanup` scheduling visible only in newer `server.js`).

## Doctrine gate loading

| Component | LOCAL (workspace) | RENDER (live) |
|-----------|-------------------|---------------|
| `strictDoctrineGate` | Loaded via `openAiFirstCompanionRuntime` | **Not active** on Acts 10 (OpenAI authors answer) |
| `doctrineFinalAuthorityEngine` | `doctrine_final_authority` route | Not observed |
| `responseGuarantee` | Wraps `/buddy/chat` locally | Not deployed (connection_error text still returned) |
| OpenAI client | Ready at startup | Ready (`providers` configured) |

## Timeout configuration

| Setting | LOCAL | RENDER (deployed) |
|---------|-------|-------------------|
| `BIBLEBUDDY_CHAT_TIMEOUT_MS` | 55000 default in code | Old path; no guarantee wrapper |
| `OPENAI_TIMEOUT_MS` | 45000 in `reasonFirstComposer` | Same if same composer version |

## Startup parity verdict

**NOT PARITY** — same version string (`v122.14.0`) but **different code paths** on Render vs local Phase 4F tree.
