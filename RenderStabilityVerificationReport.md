# Render Stability Verification Report

**Date:** 2026-06-05  
**Priority:** CRITICAL  
**Incident:** Render reported *"Web Service exceeded its memory limit"* → automatic restart → temporary unavailability  
**Status:** Repo prepared — **live Render not updated in this session**

---

## Executive summary

Render Free tier (**512 MB RAM**) is insufficient for this Node.js companion stack under concurrent tester load. The repository `render.yaml` has been updated to **Standard plan (2 GB RAM)** and the required OpenAI-first env vars. **No deploy or push was performed** per verification instructions.

---

## Part B — Instance recommendation

### Recommendation: upgrade to **Standard (2 GB RAM)**

| Plan | RAM | Assessment |
|------|-----|------------|
| **Free** | 512 MB | ❌ **Exceeded** — caused OOM restart reported by Render |
| **Starter** | 512 MB | ❌ **Not recommended** — same RAM ceiling as Free |
| **Standard** | 2 GB | ✅ **Recommended** for 10–20 testers |

### Rationale

1. **Observed failure:** Render OOM kill on Free 512 MB.
2. **Local RSS during 6-message verification battery:** peaked at **~135 MB** for a single Node process before evidence packs and concurrent sessions multiply usage.
3. **Starter does not increase memory** — only removes spin-down; OOM risk remains.
4. **Standard 2 GB** provides headroom for:
   - Node heap + loaded services (buddy brain, evidence cards, Prisma)
   - Concurrent chat requests from 10–20 testers
   - Occasional memory spikes during retrieval / OpenAI round-trips

### `render.yaml` change (repo only)

```yaml
plan: standard   # was: free
```

Apply by syncing Blueprint or manually changing plan in Render dashboard, then redeploy.

---

## Part A — Render environment checklist

These values are declared in `render.yaml`. **Confirm on live Render dashboard** before treating production as verified.

| Key | Required value | In `render.yaml` |
|-----|----------------|------------------|
| `OPENAI_API_KEY` | Set (secret) | ✅ `sync: false` |
| `BUDDY_RUNTIME` | `legacy` | ✅ |
| `BUDDY_TEMPLATE_PROSE` | `0` | ✅ |
| `BUDDY_DISABLE_STUDY_FALLBACK` | `1` | ✅ |
| `BUDDY_OPENAI_FIRST` | unset or `1` | ✅ (unset — defaults on) |
| `NODE_ENV` | `production` | ✅ |
| `BUDDY_DEBUG` | `1` (optional) | ✅ |
| `BUDDY_LIVE_TRACE` | `1` (optional) | ✅ |

### Startup log on Render

After deploy, check **Logs** tab for:

```
=== BibleBuddy Runtime Startup ===
runtime mode: legacy → openAiFirstCompanionRuntime
template prose: disabled
study fallback: disabled
OpenAI ready: true
final answer author mode: openai
NODE_ENV: production
...
```

If `OpenAI ready: false`, set `OPENAI_API_KEY` in dashboard.  
If `template prose: ENABLED` or `study fallback: ENABLED`, correct env vars immediately.

---

## Memory monitoring

### What to watch on Render

- **Metrics → Memory** — sustained use above ~80% of 512 MB predicts OOM; Standard gives ~4× headroom.
- **Logs** — `[LIVE_TRACE_OK]` / `[LIVE_TRACE_VIOLATION]` per chat request; `rssMB` in trace JSONL.
- **Restart events** — any "exceeded memory limit" after upgrade warrants profiling heap (likely evidence pack caching or session state).

### Local reference (this verification run)

| Metric | Value |
|--------|-------|
| Startup RSS | 38 MB |
| Peak RSS (6-test battery) | 135 MB |
| Startup heap | 3 MB |
| Peak heap | 28 MB |

Production with Prisma, Redis URL configured, and multiple sessions will exceed local dev RSS — another reason Standard is appropriate.

---

## Root-cause alignment (emergency ownership trace)

| Finding | Mitigation in this verification |
|---------|--------------------------------|
| OpenAI 429 → `buildConnectionErrorReply` | ✅ Returns single transparent message; no template/study/witness fallbacks |
| Wrong runtime → witness / Sabbath loops | ✅ `BUDDY_RUNTIME=legacy` + template prose off + study fallback disabled |
| Study fallback on API failure | ✅ `studyFallbackUsed: false` on all failure-path tests |

Memory OOM is **infrastructure**, not routing — addressed by Standard plan upgrade.

---

## Deployment steps (manual — not executed)

1. Render dashboard → **bible-buddy** service → **Settings → Instance Type** → **Standard**.
2. **Environment** → verify all keys in checklist above.
3. **Manual Deploy** or push when approved (not done in this session).
4. Tail logs for startup diagnostics block.
5. Send one browser chat; confirm response includes `liveRequestTrace` (if `BUDDY_LIVE_TRACE=1`) or check `data/live-request-trace.jsonl` on persistent disk if configured.
6. Re-run `node scripts/liveRuntimeVerification.js` locally after OpenAI quota restored.

---

## Verdict

| Item | Status |
|------|--------|
| Standard 2 GB recommended | ✅ Documented |
| `render.yaml` plan + env prepared | ✅ In repo |
| Live Render instance upgraded | ⏳ Manual action required |
| Live Render env confirmed | ⏳ Manual action required |
| OOM recurrence risk on Free/Starter | ❌ High — upgrade required |

**Stop condition met:** Verification and recommendations complete. No Phase 2, no beta, no push beyond required Render env/instance guidance.
