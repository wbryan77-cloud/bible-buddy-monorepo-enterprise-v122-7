# Phase 4G Deployment Decision

Generated: 2026-06-11 (re-verified 18:43 UTC)

## Decision: **NOT READY**

Production at `https://bible-buddy-monorepo-enterprise-v122-7.onrender.com` does **not** match local Phase 4F behavior. Promoting or declaring production parity would be incorrect.

## Evidence

| Check | Local Phase 4F | Render production |
|-------|----------------|-------------------|
| Smoke tests | **28/28 PASS** | **0/27 PASS** |
| Acts 10 exact contract | Yes | No (OpenAI hedge) |
| Strict doctrine OpenAI | 0 calls | Multiple calls |
| Service-unavailable loops | 0 | Yes (`core_connection_error`) |
| Memory recall | Works | Blank / failed |
| `/api/runtime-health` | 200 | 404 |
| Phase 4F stress (1352 checks) | PASS | Not run on Render |

## Risks if deploying current Render build to users

- Doctrine drift (Acts 10, death, dietary)
- OpenAI latency 6–12s on doctrine turns
- "AI service unavailable" loops after continuations
- Blank responses under load
- Manual Render redeploy historically required to recover

## Risks after deploying Phase 4F (before re-verification)

- Env vars not in `render.yaml` may default correctly via code but should be set explicitly on Render
- First cold start after deploy may spike latency
- Non-doctrine companion still depends on OpenAI when enabled

## Recommended next step

### Phase 4G.1 — Deploy + re-verify (no new architecture)

1. **Commit and push** Phase 4E–4F changes to the branch Render autoDeploys from.
2. Wait for Render deploy complete; confirm logs show `Runtime health routes loaded at /api`.
3. Set Render env (dashboard): `BIBLEBUDDY_CHAT_TIMEOUT_MS=55000`, `BIBLEBUDDY_STATE_TTL_MS=86400000` (optional but recommended).
4. Run:
   ```bash
   DEPLOY_URL=https://bible-buddy-monorepo-enterprise-v122-7.onrender.com node scripts/runPhase4GProductionParityVerification.js
   ```
5. Require **remote smoke 27/27** and **runtime-health 200** before **READY** or **READY WITH MONITORING**.

### If post-deploy parity passes

- Decision upgrades to **READY WITH MONITORING**
- Run 60-minute health poll on `/api/runtime-health`
- Execute manual browser smoke (`Phase4FRenderManualSmokePlan.md`)

## Acceptance criteria status (Phase 4G)

| Criterion | Status |
|-----------|--------|
| Render matches local behavior | **FAIL** |
| No manual redeploy required | **FAIL** (errors observed) |
| No doctrine drift | **FAIL** |
| No hanging requests | Partial (blanks/fast errors) |
| No memory denial | **FAIL** on Render |
| No AI unavailable loops | **FAIL** |
| Health metrics stable | **Cannot assess** (endpoint missing) |

## Summary

**Local Phase 4F is verified.** **Render production is not.** Parity verification succeeded as a diagnostic: it proved the gap is **deploy skew**, not a failed local implementation.
