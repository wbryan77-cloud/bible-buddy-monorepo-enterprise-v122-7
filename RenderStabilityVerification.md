# Render Stability Verification

**Date:** 2026-06-07  
**Script:** `node scripts/renderStabilityVerification.js`  
**Artifact:** `docs/regression-trace/render-stability-verification.json`

---

## Summary

| Metric | Result | Threshold | Pass |
|--------|--------|-----------|:----:|
| Peak RSS (offline 12 turns) | 67 MB | < 500 MB | ✅ |
| Avg RSS | 65 MB | — | ✅ |
| Memory delta | +14 MB | < 200 MB | ✅ |
| Peak evidence pack | 16 KB | < 50 KB | ✅ |
| Restart loops | 0 | 0 | ✅ |
| OpenAI calls (offline) | 0 | — | — |
| Regen loops | 0 | ≤1 per turn | ✅ |

**Offline stability: PASS**

---

## Production config (render.yaml + BAE defaults)

| Setting | Production | Status |
|---------|------------|--------|
| `BUDDY_DEBUG` | `0` | ✅ Off |
| `BUDDY_LIVE_TRACE` | `0` | ✅ Off |
| `BAE_TRACE` | unset → **off** | ✅ Opt-in only |
| `BUDDY_REQUEST_MEMORY_LOG` | unset → off | ✅ |
| Max regen | 1 (`regenerated` flag) | ✅ |
| OpenAI attempt cap | ≤2 | ✅ |

---

## Phase 1B offline stress (12 doctrine retrievals + validator)

| Metric | Value |
|--------|-------|
| Start RSS | 68 MB |
| End RSS | 170 MB |
| Peak RSS | 170 MB |
| Delta (1B live script, no API) | +102 MB |

Without OpenAI, 12 `runBuddy` calls still load runtime modules — RSS rise is module load, not leak pattern.

---

## Failure mode analysis

| Suspected cause | Finding |
|-----------------|---------|
| Memory exhaustion | **Not observed** offline |
| OpenAI retry storms | Capped at 2 attempts |
| Regeneration loops | Single `regenerated` flag |
| Oversized evidence packs | Peak 16 KB |
| Trace logging | Default off |
| Debug logging | Off in render.yaml |

---

## Live Render verification (pending)

Deploy BAE build to staging with:

```
BUDDY_DEBUG=0
BUDDY_LIVE_TRACE=0
BAE_TRACE=0
```

Then run `baePhase1bValidation.js` against staging with API key.

**Push blocked until live stability + allPass confirmed.**
