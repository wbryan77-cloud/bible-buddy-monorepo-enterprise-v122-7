# Phase 4I Post-Deploy Verification Plan

Generated: 2026-06-11  
Target: `https://bible-buddy-monorepo-enterprise-v122-7.onrender.com`

## 1. Confirm deploy in Render dashboard

- Build succeeded
- Logs show: `Runtime health routes loaded at /api`
- Logs show: `Buddy routes loaded at /buddy`

## 2. Health endpoint

```bash
curl -s https://bible-buddy-monorepo-enterprise-v122-7.onrender.com/api/runtime-health | jq .
```

Expect: `"ok": true`, `memoryPressureLevel: "normal"`

## 3. Automated parity

```bash
export DEPLOY_URL=https://bible-buddy-monorepo-enterprise-v122-7.onrender.com

node scripts/runPhase4GProductionParityVerification.js
node scripts/runPhase4HDoctrineParityRegression.js
```

Require:

- Remote smoke ≥ 27/27 (4G)
- Doctrine parity 28/28 including remote Acts 10 check

## 4. Monitor `/api/runtime-health`

| Interval | Action |
|----------|--------|
| 0 min (post-deploy) | Record `rssMB`, `errors`, `timeouts` |
| 5 min | Same |
| 15 min | Same |
| 30 min | Same |
| 60 min | Same |

Stable = `errors`/`timeouts` not climbing during smoke; `rssMB` &lt; ~400 on standard plan.

## 5. Manual browser smoke

1. What does Acts 10 mean?
2. Why are you saying primarily?
3. Acts 10 means food is clean.
4. Show me another verse ×10
5. What happens when a person dies?
6. Show me another verse ×10
7. Can you remember what we were talking about?
8. Before that?
9. What about Isaiah 66:17?
10. No “AI service unavailable”; no hedge phrases

## 6. Failure response

If `/api/runtime-health` still 404 → deploy did not include commit; verify Render branch/commit SHA.

If doctrine still OpenAI-first → verify `strictDoctrineGate.js` on server.

If memory restart → inspect health JSON + `data/phase4h-memory-pressure.jsonl`; do not patch doctrine first.

## 7. Production parity gate

**PASS** only when remote automated tests match local (28/28 + 27/27) and 60-min health stable.
