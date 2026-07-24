# Gate 2B — Production Memory Validation

**Decision:** **MEMORY_PASS**  
**Date:** 2026-07-24

## Deployment

| Field | Value |
|---|---|
| Commit SHA | `3e8d45c4aa4dec8164dd2c4eead1e3c853aed2b6` (`3e8d45c`) |
| Subject | `fix(memory): durable explicit-remember pins before clarification and truncation` |
| Branch | `main` |
| Deploy mechanism | Render `autoDeploy: true` on push |
| Pre-deploy health commit | `864cea0` |
| Post-deploy health commit | `3e8d45c` |
| Deploy observed at | `2026-07-24T04:22:10.974Z` (`/health` first showed `3e8d45c`) |
| Pre-cert health | `2026-07-24T04:22:36.892Z` — `releaseCommit: 3e8d45c`, `releaseBranch: main` |
| Render deployment ID | Not exposed via public API without Render credentials; identity verified via `RENDER_GIT_COMMIT` → `/health.health.releaseCommit` |

Files deployed (memory-only):

- `services/explicitRememberPin.js` (new)
- `services/openAiFirstCompanionRuntime.js`
- `services/retrievalEvidencePack.js`
- `services/reasonFirstComposer.js`
- `services/buddyBrain.js` (session window only)
- `scripts/runMemoryCertification.js` (new)

## Production certification

Artifact: `01-MemoryCertification-production-postdeploy.txt`  
Target: `https://bible-buddy-monorepo-enterprise-v122-7.onrender.com`  
Result: **18/18 PASS**

Includes: prior user/assistant, go deeper, continue, correction, topic return, explicit 2/5/10/25/50/100, marker@25, honesty, implicit name, isolation, pin write.

## Residual risks

- Ephemeral Render disk may drop pin/session JSON across instance recycle
- M5 still answers Zechariah text when asked about “yesterday” discussion (soft honesty)
- Multi-instance pin store not shared
