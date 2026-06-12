# Phase 4H Post-Deploy Parity Plan

Generated: 2026-06-11

## After deploy completes

### 1. Render logs

Confirm:

- `Runtime health routes loaded at /api`
- `Buddy routes loaded at /buddy`
- No startup crash on `stateTtlCleanup`

### 2. Health endpoint

```bash
curl -s https://bible-buddy-monorepo-enterprise-v122-7.onrender.com/api/runtime-health | jq .
```

Expect: `ok: true`, `memoryPressureLevel: normal`

### 3. Automated parity

```bash
DEPLOY_URL=https://bible-buddy-monorepo-enterprise-v122-7.onrender.com \
  node scripts/runPhase4GProductionParityVerification.js

DEPLOY_URL=https://bible-buddy-monorepo-enterprise-v122-7.onrender.com \
  node scripts/runPhase4HDoctrineParityRegression.js
```

Require: remote smoke **27/27** and **28/28** doctrine parity (with remote acts10 check).

### 4. Monitor `/api/runtime-health`

Poll at: startup, 5 min, 15 min, 30 min, 60 min

Watch: `rssMB`, `errors`, `timeouts`, `memoryPressureLevel` — should stay stable during smoke.

### 5. Manual browser smoke

From `Phase4FRenderManualSmokePlan.md`:

- Acts 10, correction, food challenge, verse ×10
- Death state, verse ×10
- Memory recall, before that
- No hedge phrases, no service-unavailable text

### 6. If memory pressure rises

**Do not patch doctrine.** Inspect:

- `rssMB` / `heapUsedMB` on `/api/runtime-health`
- State file sizes in `data/`
- `phase4h-memory-pressure.jsonl`
- Run TTL manually via restart or wait for scheduled cleanup

### 7. Success criteria

- No Render memory-limit restart during smoke session
- No manual redeploy required
- Strict doctrine: `doctrine_final_authority`, `openAiCalled: false`
