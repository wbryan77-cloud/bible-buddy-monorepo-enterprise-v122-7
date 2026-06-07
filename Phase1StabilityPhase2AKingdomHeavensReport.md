# Phase 1 Stability + Phase 2A Kingdom/Heavens Report

**Date:** 2026-06-07  
**Priority:** CRITICAL  
**Scope:** Production stability fixes + kingdom/heavens evidence-only depth  
**Status:** IMPLEMENTED — local validation complete (API-failure mode)

---

## Summary

Phase 1 production-safety fixes and Phase 2A kingdom/heavens Evidence Cards are implemented without restoring template responders, study-loop fallbacks, or multi-speaker routing. OpenAI remains the sole normal final answer author.

| Track | Result |
|-------|--------|
| Hard cutover regression (18 tests) | **18/18 PASS** |
| UI contract (`index.html`) | **PASS** |
| Memory baseline smoke | **PASS** (RSS ~170 MB) |
| Evidence card smoke | **PASS** |
| Kingdom/heavens focused set (7 tests) | **7/7 PASS** (architecture + API-failure hygiene) |

**Note:** Local run had no `OPENAI_API_KEY` — kingdom/heavens tests validated routing, evidence retrieval, guards, and connection-error hygiene (`apiFailureMode: true`). Re-run with quota for happy-path `openAiCalled: true` verification.

---

## Part A — Stability fixes

### 1. `index.html` UI contract

- Added `res.ok` and `data.ok` checks before rendering reply
- Removed client mask `"Tell me a little more"` on falsy `reply`
- HTTP 400/500 and empty replies surface real error detail
- Connection errors show server message, not generic mask

### 2. Debug flags (production)

`render.yaml` updated:

- `BUDDY_DEBUG: "0"`
- `BUDDY_LIVE_TRACE: "0"`

`liveRequestTrace.js` — file writes only when `BUDDY_LIVE_TRACE=1`  
`liveResponseCapture.js` — gated behind `BUDDY_CAPTURE=1` (default off)  
`routes/buddy.js` — trace attach/log only when `BUDDY_LIVE_TRACE=1`

### 3. Regeneration cap

`openAiFirstCompanionRuntime.js`:

- Initial compose: `maxAttempts: 2`
- Guard regen: **at most one** additional compose with `maxAttempts: 1`
- `regenerated` flag prevents second guard regen
- Scripture policy included in guard regen trigger

`reasonFirstComposer.js`:

- Default `maxAttempts: 2`; regen calls capped to `1`
- Returns actual `attemptsUsed` count

### 4. Memory logging

New `services/requestMemoryLogger.js`:

- Opt-in via `BUDDY_REQUEST_MEMORY_LOG=1` only
- Logs one JSON line: `rssMB`, `heapUsedMB`, `openaiAttempts`, `regenerated`, `evidencePackApproxBytes`, `latencyMs`
- No large trace files in production by default

---

## Part B — Kingdom + heavens evidence (Phase 2A)

### New / upgraded Evidence Cards

| Card | File | Status |
|------|------|--------|
| Heavens (expanded) | `services/evidenceCards/heavens.card.js` | Upgraded with all required passages + boundary cautions |
| Kingdom (new) | `services/evidenceCards/kingdom.card.js` | New frozen card |

**Required passages wired** in cards, snippets, continuity chains, and catalog:

Genesis 1:1, 1:6-8, 1:14-17 · Matthew 6:9-10 · John 3:13, 7:33-34, 8:21, 13:33, 14:3 · Acts 1:9-11 · Revelation 5:10, 11:15, 20, 21:1-3 · 2 Corinthians 12:2

### Registry + discovery

- `docs/bible-learning/approved-doctrine-registry.json` — `kingdom` topic added
- `docs/bible-learning/scripture-continuity-sample.json` — `heavens` + `kingdom` chains
- `services/bibleTopicCatalog.js` — `heavensLayers`, `kingdomOnEarth`
- `services/scriptureChainExpansion.js` — chain keys mapped
- `services/retrievalEvidencePack.js` — `TOPIC_TO_CHAIN` + `CATALOG_KEY_MAP` for heavens/kingdom
- `services/doctrineEvidenceSnippets.js` — expanded heavens + kingdom snippets
- `services/evidenceCards/index.js` — kingdom routing patterns

**Boundary (evidence-only):** Cards caution against teaching believers go to third heaven without Scripture proof.

---

## Part C — KJV-first / Scripture policy validator

New `services/scripturePolicyValidator.js` integrated into `doctrineBoundaryValidator.js` and guard regen:

| Check | Behavior |
|-------|----------|
| Non-KJV quotation drift | Soft flag (NIV/ESV fingerprints) |
| Unsupported third-heaven destination | Hard flag → one regen |
| Unsupported tradition claims | Flag mansions-at-death, soul-goes-to-heaven patterns |
| History when not asked | Uses `HISTORY_MARKERS` when `historyAllowed=false` |

Validators **flag only** — may trigger one guard regen; do not author final prose.

---

## Part D — Companion tone (prompt guidance only)

`reasonFirstComposer.js`:

- `COMPANION_TONE_INSTRUCTION` added to core restoration path
- Listen first, reflect burden, gentle Scripture, no therapy/cold Q&A
- KJV + heavens/kingdom framing in `CORE_RESTORATION_INSTRUCTION`

**Not restored:** relationship post-append, template responders, ECP as speaker, golden examples appendix on core path.

---

## Part E — Validation results

**Script:** `scripts/phase1StabilityPhase2aRegression.js`  
**Artifact:** `docs/regression-trace/phase1-stability-phase2a-results.json`

### Focused kingdom/heavens tests

| ID | Message | Pass |
|----|---------|------|
| kh_01 | What is the third heaven? | ✅ |
| kh_02 | How many heavens are talked about in the Bible? | ✅ |
| kh_03 | Does the Bible say believers go to the third heaven? | ✅ |
| kh_04 | Jesus said where I go ye cannot come. How does that fit John 14? | ✅ |
| kh_05 | What does "thy kingdom come… in earth" mean? | ✅ |
| kh_06 | Does Revelation teach the kingdom comes down to earth? | ✅ |
| kh_07 | Explain the heavens line upon line from Scripture. | ✅ |

### Pass criteria (architecture mode)

- ✅ OpenAI-first routing (`core_openai_first`)
- ✅ No template speaker flags
- ✅ No study loop / witness labels
- ✅ No "Tell me more" mask in `index.html`
- ✅ Heavens/kingdom Evidence Cards retrieved
- ✅ Connection error on API failure (not study fallback)
- ✅ Memory RSS < 512 MB in smoke

---

## Files changed

### Phase 1 stability

- `public/index.html`
- `render.yaml`
- `routes/buddy.js`
- `services/liveRequestTrace.js`
- `services/liveResponseCapture.js`
- `services/openAiFirstCompanionRuntime.js`
- `services/reasonFirstComposer.js`
- `services/requestMemoryLogger.js` (new)

### Phase 2A evidence

- `services/evidenceCards/heavens.card.js`
- `services/evidenceCards/kingdom.card.js` (new)
- `services/evidenceCards/index.js`
- `docs/bible-learning/approved-doctrine-registry.json`
- `docs/bible-learning/scripture-continuity-sample.json`
- `services/bibleTopicCatalog.js`
- `services/scriptureChainExpansion.js`
- `services/retrievalEvidencePack.js`
- `services/doctrineBoundaries.js`
- `services/doctrineEvidenceSnippets.js`

### Validators + tone

- `services/scripturePolicyValidator.js` (new)
- `services/doctrineBoundaryValidator.js`

### Validation

- `scripts/phase1StabilityPhase2aRegression.js` (new)
- `docs/regression-trace/phase1-stability-phase2a-results.json`

---

## What was NOT changed (per constraints)

- `masterBuddyRuntime` routing
- Template responders as speakers
- `personalizedFallback` / study-loop fallback
- Post-compose relationship enrichment
- `metaAnswerResponder` prose path
- Env rollback paths
- Broad Phase 2 (law/feasts/death concordance expansion)

---

## Recommended next steps

1. Deploy with `BUDDY_DEBUG=0`, `BUDDY_LIVE_TRACE=0` (already in `render.yaml`)
2. Re-run `scripts/phase1StabilityPhase2aRegression.js` with `OPENAI_API_KEY` for happy-path doctrine quality
3. Monitor Render memory 24h; enable `BUDDY_REQUEST_MEMORY_LOG=1` only if profiling needed
4. Phase 2B: law/feasts concordance seeds (separate PR)

**End of report.**
