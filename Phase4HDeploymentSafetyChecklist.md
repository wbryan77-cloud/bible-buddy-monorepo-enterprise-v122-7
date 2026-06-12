# Phase 4H Deployment Safety Checklist

Generated: 2026-06-11

## Pre-deploy (local Phase 4H)

| Check | Status |
|-------|--------|
| Doctrine parity `runPhase4HDoctrineParityRegression.js` | ✅ 28/28 |
| Memory stress `runPhase4HMemoryStressTest.js` | ✅ PASS (1650 turns) |
| Phase 4F combined stability | ✅ (run before deploy) |
| `/api/runtime-health` local | ✅ 200 |
| `strictDoctrineGate` first in runtime | ✅ |
| `responseGuarantee` on `/buddy/chat` | ✅ |
| State TTL scheduled | ✅ |
| Safe JSONL writer active | ✅ |

## Git / secrets

| Check | Status |
|-------|--------|
| Phase 4E–4H changes **committed** | ⚠️ **Required before deploy** |
| `.env` not committed | Verify before push |
| `OPENAI_API_KEY` not logged | Safe writer redacts |

## Render env recommendations

```
NODE_ENV=production
BIBLEBUDDY_CHAT_TIMEOUT_MS=55000
BIBLEBUDDY_STATE_TTL_MS=86400000
BIBLEBUDDY_MAX_SESSION_TURNS=30
BIBLEBUDDY_MAX_JSONL_LINE_BYTES=12000
BIBLEBUDDY_HEALTH_HISTORY_MAX_LINES=1000
BIBLEBUDDY_MEMORY_WARN_MB=350
BIBLEBUDDY_MEMORY_CRITICAL_MB=450
```

Existing `render.yaml` flags: `BUDDY_TEMPLATE_PROSE=0`, `BUDDY_DISABLE_STUDY_FALLBACK=1`

## Deploy steps (manual — not automated)

1. Commit Phase 4E–4H runtime files (not corpus/evidence cards).
2. Push to branch Render autoDeploys.
3. Watch logs for `Runtime health routes loaded at /api`.
4. Run post-deploy plan (`Phase4HPostDeployParityPlan.md`).
