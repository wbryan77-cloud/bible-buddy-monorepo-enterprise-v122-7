# Render Memory + Doctrine Stress Report

**Date:** 2026-06-07  
**Scope:** Separate infrastructure instability from Bible-answer quality  
**Status:** AUDIT + SAFE MITIGATIONS IMPLEMENTED

---

## Problem statement

During doctrine stress testing, users see:

- `"I'm having trouble reaching the AI service right now"`
- Render "Web Service exceeded its memory limit"

These can be **different root causes** with the same user-facing symptom.

---

## Separation matrix

| Signal | Likely cause | Fix track |
|--------|--------------|-----------|
| HTTP 500 / module error | Deploy gap / crash | Deploy fix |
| Connection error string, `openaiCalled: false` | OpenAI 429/5xx **or** process OOM restart | Quota + memory |
| Wrong third-heaven doctrine, HTTP 200 | Evidence not binding | Bible-only authority (this PR) |
| Memory limit in Render dashboard | Heap spike / leak | Memory caps below |
| Works locally, fails on Render | Concurrency × payload size | Slim evidence + regen cap |

---

## Doctrine stress → memory interaction

Before this restoration, a single doctrine turn could trigger:

| Step | API calls | Memory impact |
|------|-----------|---------------|
| Initial compose | up to 4 (`maxAttempts`) | Large evidence JSON × attempts |
| Guard regen | up to 2 more | Duplicate payloads |
| Inner validation loop | additional retries | Held until GC |

**Worst case:** 6+ OpenAI calls with full evidence pack duplicated in system + user JSON.

### Mitigations implemented

| Mitigation | File | Effect |
|------------|------|--------|
| Initial `maxAttempts: 1` | `openAiFirstCompanionRuntime.js` | 1 API call first pass |
| Guard regen max 1, once | same | +1 API call max |
| Composer `attemptCap: 1` on core path | `reasonFirstComposer.js` | No inner retry loop |
| Slim evidence payload | `evidencePackSlimmer.js` | Caps memory snippets, discovery items |
| Compact JSON (no pretty-print) | `reasonFirstComposer.js` | ~40% smaller system prompt |
| `BUDDY_DEBUG=0`, `BUDDY_LIVE_TRACE=0` | `render.yaml` | No fat debug on wire |
| Capture gated | `liveResponseCapture.js` (`BUDDY_CAPTURE=1`) | No sync full-body writes |
| Trace gated | `liveRequestTrace.js` | No JSONL per request in prod |
| Opt-in memory log | `requestMemoryLogger.js` (`BUDDY_REQUEST_MEMORY_LOG=1`) | Observability without default overhead |

---

## Catalog loading audit

| Asset | Per-request load? | Status |
|-------|-------------------|--------|
| `deathResurrectionKingdomCatalog` | `require()` once at boot | **Safe** — not re-read per turn |
| `approvedCatalogEvidence` | Builds slice from in-memory catalog | **Safe** |
| `buddy-memory.json` full R/W | Every `finalizeBuddyResponse` | **Still open** — not changed this PR |
| `buddy-sessions.jsonl` append | Every turn | **Still open** |
| `readAllSessions` full file | Recall paths only | **Still open** |

**Not implemented (future):** lazy-require cold modules in `buddyBrain.js`, tail-read for recall engines.

---

## Render Standard 2 GB assessment

| Metric | Local doctrine battery (no API) | Assessment |
|--------|----------------------------------|------------|
| RSS delta per turn | ~1–2 MB without OpenAI | Low |
| RSS end of 12-test battery | ~170 MB (no key) | Under limit |
| With OpenAI + regen | Not measured locally (no key) | Re-test with key |

**Recommendation:** Stay on **Standard 2 GB** after this deploy + debug-off. Upgrade to Pro 4 GB only if Render metrics show RSS > 1.7 GB sustained with regen cap active.

---

## Production environment checklist

```bash
BUDDY_DEBUG=0
BUDDY_LIVE_TRACE=0
# BUDDY_CAPTURE=0 (default — do not set)
# BUDDY_REQUEST_MEMORY_LOG=1  # only when profiling
BUDDY_TEMPLATE_PROSE=0
BUDDY_DISABLE_STUDY_FALLBACK=1
NODE_ENV=production
```

---

## Doctrine stress test protocol (with API key)

Run after setting `OPENAI_API_KEY`:

```bash
node scripts/bibleOnlyAuthorityRegression.js
```

Watch for:

- `connectionErrors: 0` in summary  
- `openaiAttempts` ≤ 2 per test  
- `memory.deltaMB` < 10 across 12 tests  
- No `bible_only:unsupported_third_heaven_destination`

---

## Verdict

| Track | Status |
|-------|--------|
| Infrastructure mitigations | **Implemented** (regen cap, slim pack, debug off) |
| Doctrine authority | **Implemented** (binding evidence + validator) |
| Happy-path proof | **Pending** — requires `OPENAI_API_KEY` |
| Push to Render | **Blocked** until bible-only regression `allPass: true` |

**End of report.**
