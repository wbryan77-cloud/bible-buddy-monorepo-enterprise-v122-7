# Phase 1B Measurement Script Repair Report

**Date:** 2026-06-07  
**Scope:** `scripts/baePhase1bLiveMeasurement.js` only  
**Production code touched:** **No**

---

## Observed failure

```
node scripts/baePhase1bLiveMeasurement.js
✅ OpenAI client ready
TypeError: Cannot read properties of undefined (reading 'map')
    at measureTopic (scripts/baePhase1bLiveMeasurement.js:183:34)
```

---

## Failing variable

**`live.claims`** (accessed as `live.claims.map(...)` in `measureTopic` and `runCaseStudy`).

---

## Expected shape

`classifyLiveFailures()` should always return an object that includes:

```javascript
{
  codes: { D, E, F, G },
  notes: string[],
  primary: string | null,
  claims: Array<{ claimId, claim, supportingScriptures?, type? }>,
  postVal, runtimeVal, bibleOnly, ...
}
```

`measureTopic` and `runCaseStudy` assume `claims` is an **array** (possibly empty) before calling `.map()`.

---

## Actual shape

On the **pre-failure A** early-return path (`topic.id === 'holy'` with no evidence cards), `classifyLiveFailures` returned:

```javascript
{ codes, notes, primary: null }
```

`claims` was **`undefined`**, so `live.claims.map(...)` threw.

Secondary risk: if `reply` from `runBuddy` were null/undefined, `extractClaims(reply)` would also throw before any return (fixed defensively).

---

## Root cause

1. **Primary:** Incomplete return object from `classifyLiveFailures` when `preFailureA === true` — omitted `claims` and other fields used downstream.
2. **Secondary:** No defensive normalization before `.map()` at call sites; a partial `live` object or missing `reply.claims` could surface the same crash on other paths.

---

## Exact repair (measurement script only)

| Change | Location | Purpose |
|--------|----------|---------|
| `extractClaims(reply = {})` | helper | Guard null/non-object `reply` |
| `normalizeClaimsList(live, reply)` | helper | `(live.claims ?? extractClaims(reply))` before `.map()` |
| `emptyLiveResult(reply, overrides)` | helper | Canonical safe default shape for all `live` consumers |
| Pre-failure A return | `classifyLiveFailures` | Return `emptyLiveResult(...)` with `claims: extractClaims(reply)` and `primary: 'A'` |
| `safeReply = reply \|\| {}` | `classifyLiveFailures` | Avoid throws on null `reply` |
| try/catch around `classifyLiveFailures` | `measureTopic`, `runCaseStudy` | On classifier error, use `emptyLiveResult` with `primary: 'H'` |
| `claimsList.map(...)` | `measureTopic`, `runCaseStudy` | Replace direct `live.claims.map(...)` |
| `(graph.refs \|\| []).length` | `measureTopic` | Defensive graph access |
| `live?.codes`, `live?.notes` | `measureTopic` | Safe optional access on result fields |
| `(reply \|\| {}).reply` | `measureTopic` | Safe final answer string |

**Not changed:** doctrine, evidence, validators, retrieval, OpenAI runtime, approval gates.

---

## Post-repair execution

```bash
node scripts/baePhase1bLiveMeasurement.js
```

**Result:** Script completed without crash. Exit code `1` is intentional when D+E+F+G > 0 (measurement found failures).

**Artifacts produced:**

| File | Status |
|------|--------|
| `docs/regression-trace/LiveAuthorityFailureDistribution.json` | Written (`liveRan: true`) |
| `docs/regression-trace/third-heaven-case-study.json` | Written (5 turns) |
| `AuthorityScorecard.md` | Written |
| `BibleAuthorityPhase1BMeasurementReport.md` | Written |

**Live distribution (this run):**

```json
{ "D": 0, "E": 8, "F": 0, "G": 0, "A": 1 }
```

**Note on E=8:** In this environment, `runBuddy` returned connection-error fallbacks (`finalAnswerAuthor: "connection_error"`, `openaiCalled: false`) rather than composed doctrine replies. The measurement script correctly classified those as **E** (no `claims[]` in output). Re-run locally with a working OpenAI connection for authoritative D/E/F/G signal on real compose output.

---

## Production code touched

**No.** Only `scripts/baePhase1bLiveMeasurement.js` was modified.
