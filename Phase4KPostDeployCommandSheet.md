# Phase 4K — Post-Deploy Command Sheet

Generated: 2026-06-12  
Deploy URL: `https://bible-buddy-monorepo-enterprise-v122-7.onrender.com`

Run after Render build completes. Do not run before push unless verifying current (old) production baseline.

---

## 1. Runtime health (immediate)

```bash
curl -s https://bible-buddy-monorepo-enterprise-v122-7.onrender.com/api/runtime-health | jq .
```

**Expect after deploy:** HTTP 200, fields including:

- `heapUsedMB`
- `rssMB`
- `activeSessions`
- `errors`
- `timeouts`
- `uptimeMs`
- `strictDoctrineOpenAiBlocked`
- `memoryPressureLevel`

**Baseline before deploy:** 404 Not Found.

---

## 2. Production parity verification

```bash
export DEPLOY_URL=https://bible-buddy-monorepo-enterprise-v122-7.onrender.com
node scripts/runPhase4GProductionParityVerification.js
```

---

## 3. Remote doctrine parity (optional — hits live API)

```bash
export DEPLOY_URL=https://bible-buddy-monorepo-enterprise-v122-7.onrender.com
node scripts/runPhase4HDoctrineParityRegression.js
```

---

## 4. General health (sanity)

```bash
curl -s https://bible-buddy-monorepo-enterprise-v122-7.onrender.com/health | jq .
```

---

## 5. Manual smoke script

Send via app or `POST /buddy/chat` with `testerId` = stable session id.

| # | Message |
|---|---------|
| 1 | What does Acts 10 mean? |
| 2 | Why are you saying primarily? |
| 3 | Acts 10 means food is clean. |
| 4 | Show me another verse ×10 |
| 5 | What happens when a person dies? |
| 6 | Show me another verse ×10 |
| 7 | Can you remember what we were talking about? |
| 8 | Before that? |
| 9 | What about Isaiah 66:17? |

**Pass signals:**

- Acts 10 cites Peter / Acts 10:28; not food-clean framing
- No `primarily` hedge on correction turn
- Witness continuations return distinct approved verses
- Death state: asleep / know nothing until resurrection
- Memory turns reference prior topic without internal labels
- Isaiah 66:17 in dietary context without Acts 10 conflation

---

## 6. Monitor schedule

Run health curl at each interval; log to a spreadsheet or file.

```bash
curl -s https://bible-buddy-monorepo-enterprise-v122-7.onrender.com/api/runtime-health | jq '{
  at: .at,
  rssMB: .rssMB,
  heapUsedMB: .heapUsedMB,
  activeSessions: .activeSessions,
  errors: .errors,
  timeouts: .timeouts,
  strictDoctrineOpenAiBlocked: .strictDoctrineOpenAiBlocked,
  memoryPressureLevel: .memoryPressureLevel,
  totalRequests: .totalRequests
}'
```

| When | Action |
|------|--------|
| Immediately after deploy | Confirm 200 on `/api/runtime-health` |
| +5 min | Record metrics; send 2–3 chat messages |
| +15 min | Record metrics; run parity script |
| +30 min | Record metrics; manual smoke subset |
| +60 min | Record metrics; compare RSS drift vs baseline |

**Alert if:**

- `rssMB` > 400 sustained
- `memoryPressureLevel` = `critical`
- `errors` or `timeouts` climbing without traffic spike
- `strictDoctrineOpenAiBlocked` = 0 while doctrine smoke shows OpenAI author

---

## 7. Render dashboard

- Service: `bible-buddy` (from `render.yaml`)
- Plan: `standard` (~512 MB RAM)
- Confirm deploy commit matches post-push SHA

---

## 8. Rollback reference

If deploy fails: revert commit on `main` and push, or manual rollback in Render to previous deploy. Document RSS/OOM in health history before rollback.
