# Phase 4H Deploy Skew Audit

Generated: 2026-06-11

## Git commits

| Ref | SHA | Notes |
|-----|-----|-------|
| Local `HEAD` | `417289c4c64c7ee62c87c8143fc596384a980eba` | Ahead of origin/main by 2 commits |
| `origin/main` | `1095f921e61075a7e7b3ad5c074ca835aececa20` | Remote tracking branch |
| Render (inferred) | **≈ origin/main or older** | Live behavior matches pre–Phase 4F |

## Phase 4E–4F files — local workspace

| File | Present |
|------|---------|
| `services/strictDoctrineGate.js` | ✅ |
| `services/responseGuarantee.js` | ✅ |
| `services/runtimeHealthMonitor.js` | ✅ |
| `routes/runtimeHealth.js` | ✅ |
| `services/safeJsonlWriter.js` | ✅ |
| `services/stateTtlCleanup.js` | ✅ |
| `services/doctrineTopicDetector.js` | ✅ |
| `services/doctrineFinalityContract.js` | ✅ |

**Git status:** Most Phase 4E–4F files are **untracked (`??`)** or modified — **not committed/pushed**. Render autoDeploy from `origin/main` cannot include them.

## server.js (local)

- `mountRoute('Buddy routes', '/buddy')` ✅
- `mountRoute('Runtime health routes', '/api', './routes/runtimeHealth')` ✅
- `scheduleStateTtlCleanup()` ✅

## routes/buddy.js (local)

- `withBuddyChatGuarantee()` wraps `runBuddy` ✅
- `applyDoctrineErrorFirewall` on outbound payload ✅

## strict doctrine path (local)

`runBuddy` → `openAiFirstCompanionRuntime` → `runStrictDoctrineGate()` **before** `composeReasonFirstReply` ✅

## Why `/api/runtime-health` is 404 on Render

1. `routes/runtimeHealth.js` is **not in deployed commit** (uncommitted local work).
2. `server.js` mount for runtime health is **not on Render build**.
3. Live probe: `GET /api/runtime-health` → `404 Not found` (confirmed 18:48 UTC).

## Render live behavior (confirms skew)

| Signal | Render | Local Phase 4F |
|--------|--------|----------------|
| `/api/runtime-health` | 404 | 200 |
| Acts 10 route | `reason_first_openai` | `doctrine_final_authority` |
| Smoke (Phase 4G) | 0/27 | 28/28 |

## Conclusion

**Deploy skew is confirmed.** Production is running an older artifact. Phase 4H memory fixes and parity code exist **only locally** until commit + push + Render deploy complete.
