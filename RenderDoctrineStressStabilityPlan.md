# Render Doctrine Stress Stability Plan

**Date:** 2026-06-07  
**Priority:** CRITICAL  
**Status:** PLAN ONLY — no new fixes; recommendations based on audit of `3053cae` + `417289c` and prior reports

---

## Purpose

Separate **infrastructure instability** from **doctrine quality failure** during heaven/kingdom/death stress testing. Both can show `"I'm having trouble reaching the AI service right now"` — diagnosis must diverge before upgrading Render or patching doctrine.

---

## Symptom divergence matrix

| Observation | Doctrine track | Infrastructure track |
|-------------|----------------|----------------------|
| HTTP 200, wrong third heaven | ✅ BAE / evidence binding | ❌ |
| HTTP 200, `openaiCalled: true`, tradition drift | ✅ Claim validator | ❌ |
| `openaiCalled: false`, connection error string | Maybe quota | ✅ OOM / 429 / crash |
| Render dashboard memory pegged | ❌ | ✅ |
| Failure only under concurrent testers | Unlikely doctrine | ✅ |
| Failure after deploy, module not found | ❌ | ✅ deploy gap |
| RSS grows over 24h without traffic | ❌ | ✅ leak suspicion |

---

## Current mitigations (already in local commits, not pushed)

| Mitigation | Commit | Effect |
|------------|--------|--------|
| `maxAttempts: 1` initial compose | `417289c` | 1 API call first pass |
| Guard regen max 1 | `417289c` | +1 API call ceiling |
| `evidencePackSlimmer` | `417289c` | Caps memory snippets, discovery |
| Compact JSON in composer | `417289c` | Smaller system prompt |
| `BUDDY_DEBUG=0`, `BUDDY_LIVE_TRACE=0` | `3053cae` | Less response bloat |
| Capture gated `BUDDY_CAPTURE=1` | `3053cae` | No default full-body sync write |
| `BUDDY_REQUEST_MEMORY_LOG=1` opt-in | `3053cae` | Profiling without default overhead |

---

## Doctrine stress → memory audit

### Per-turn resource budget (target after `417289c`)

| Resource | Before cutover | After `417289c` (expected) |
|----------|----------------|----------------------------|
| OpenAI calls / turn | 4–6 | **2 max** (1 compose + 1 regen) |
| Evidence JSON in prompt | Full pack × pretty-print × 2 | Slim slice × compact × 1 |
| Sync JSONL writes | trace + capture every chat | **0** in prod (flags off) |
| Catalog load | `require()` at boot | Same — **not per-request** |

### Still open risks (not fixed in plan scope)

| Risk | File | Severity |
|------|------|----------|
| Full `buddy-memory.json` R/W per turn | `buddyBrain.js` | Medium |
| `buddy-sessions.jsonl` append full structured | `buddyBrain.js` | Medium |
| `readAllSessions` full file on recall | `memoryRecallEngine.js` | Medium spike |
| `RECENT_SESSION_CACHE` unbounded Map | `buddyBrain.js` | Medium leak-like |
| Heavy `buddyBrain` require graph at boot | `buddyBrain.js` | Baseline RSS |
| Future BAE claim extractor | +tokens or +1 call | **TBD** — design for ≤2 calls total |

### Catalog duplication check

| Asset | Loaded per request? | Verdict |
|-------|---------------------|---------|
| `deathResurrectionKingdomCatalog` | No — `require` once | ✅ Safe |
| `approvedCatalogEvidence` build | Per turn, in-memory slice | ✅ Acceptable |
| Evidence in system + user JSON | Was duplicated | ⚠️ User payload still duplicates some fields — future trim |

---

## Doctrine stress test protocol

Run with real `OPENAI_API_KEY` after BAE validation script exists:

```bash
export OPENAI_API_KEY="..."
export BUDDY_DEBUG=0 BUDDY_LIVE_TRACE=0 BUDDY_TEMPLATE_PROSE=0
node scripts/bibleOnlyAuthorityRegression.js   # current
# future: node scripts/bibleAuthorityEngineValidation.js
```

### Per-test capture

| Field | Source |
|-------|--------|
| `memoryBefore` / `memoryAfter` | `requestMemoryLogger.snapshotMemory()` |
| `openaiAttempts` | `coreDebug.openaiAttempts` |
| `openaiCalled` | `coreDebug.openaiCalled` |
| `connection_error` | `finalAnswerAuthor === 'connection_error'` |
| `evidencePackApproxBytes` | `openAiFirstCompanionRuntime` log |

### Pass thresholds (infrastructure)

| Metric | Pass |
|--------|------|
| RSS delta per doctrine turn | < 15 MB |
| RSS end of 12-test battery | < 400 MB local; < 1.2 GB Render |
| `openaiAttempts` per turn | ≤ 2 |
| Connection errors | 0 |
| Render OOM during battery | 0 |

---

## Render Standard 2 GB — recommendation

### Decision tree

```
After deploy 417289c + debug off:
  Run 12-test doctrine battery on Render with BUDDY_REQUEST_MEMORY_LOG=1
  │
  ├─ Peak RSS < 1.2 GB, no OOM → STAY Standard 2 GB
  │
  ├─ Peak RSS 1.2–1.7 GB, occasional OOM → Code optimize first (memory R/W, cache eviction)
  │
  └─ Peak RSS > 1.7 GB sustained with ≤5 concurrent users → Upgrade Pro 4 GB + continue code slimming
```

### Current recommendation

**Stay on Standard 2 GB** until doctrine stress metrics are collected post-`417289c` deploy. Prior OOM was on **512 MB Free** tier. Code optimizations (regen cap, slim pack, debug off) address the likely spike cause before hardware upgrade.

**Do not upgrade to 4 GB** as first move — it masks duplication without fixing claim-validation doctrine gaps.

---

## Recommended next ops steps (no implementation here)

1. Deploy `3053cae` + `417289c` only after happy-path `allPass`
2. Confirm Render env: `BUDDY_DEBUG=0`, `BUDDY_LIVE_TRACE=0`, unset `BUDDY_CAPTURE`
3. Run 12-test battery; record `memory.endRssMB`
4. Enable `BUDDY_REQUEST_MEMORY_LOG=1` for 1 hour of beta — disable after
5. If OOM persists: tail-read sessions for recall, LRU on `RECENT_SESSION_CACHE`, debounce memory writes

---

## BAE impact on memory (forward-looking)

| BAE feature | Memory impact | Mitigation |
|-------------|---------------|------------|
| Structured `claims[]` in JSON | +small | Same response object |
| Claim extractor micro-call | +1 API payload | Keep off hot path; use structured compose |
| KJV corpus fingerprint | Load once at boot | ~few MB KJV verse index |
| Admin findings JSONL | Async append | Rotate daily |

**Target:** BAE must not exceed **2 OpenAI calls / turn** or **+20% evidence payload size**.

---

## Related documents

- `RenderMemoryDoctrineStressReport.md` — prior mitigations implemented
- `RenderMemoryStabilityAudit.md` — ranked risks
- `BibleAuthorityEngineRootCausePlan.md` — doctrine vs infra separation
- `BibleAuthorityEngineImplementationRecommendation.md` — validation gate before push

**End of Render doctrine stress stability plan.**
