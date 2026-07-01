# Validation Recovery Audit

**Generated:** 2026-06-03  
**Scope:** Audit only — no code, deploy, push, Sprint 3, fixes, or new experiments.

**Problem statement:** Beta validations did not complete successfully. RACL and reason-first migration show **OpenAI 0%**. Multiple **401 Incorrect API key** errors. Companion Intelligence Suite: **readiness NEEDS_REVIEW**, **stability = 5**.

**Evidence window:** All three primary artifacts share the same run batch:

| Artifact | Timestamp (UTC) |
|----------|-----------------|
| `docs/racl/validation-results.json` | 2026-06-03T18:47:18Z |
| `docs/reason-first-migration/validation-results.json` | 2026-06-03T18:47:27Z |
| `docs/companion-intelligence/validation-results.json` | 2026-06-03T18:47:42Z |
| `docs/sprint214/acceptance-results.json` | 2026-06-03T18:47:36Z |
| `docs/sprint214b/sabbath-history-depth-results.json` | 2026-06-03T18:47:38Z |
| `docs/sprint214c/natural-reasoning-results.json` | 2026-06-03T18:47:42Z |

This is **fresh failed-run data**, not stale pre-P1 JSON. The failure mode is **invalid/expired OpenAI credentials**, not missing reruns from an earlier date.

---

## Executive finding

| Question | Answer |
|----------|--------|
| Why is **stability = 5**? | **`stability` is not runtime crash stability.** It is `round((sprint214.passed / sprint214.total) * 100)` with **1/20 tests passed** → **5**. |
| Root cause of validation collapse? | **OpenAI 401** on reason-first compose path → bracketed unavailable replies on **34/35** HTTP tests and **40/40** reason-first benchmark turns. |
| Did RACL/memory/routing fail? | **Retrieval largely ran** (e.g. RACL memory hits 20/20); **compose never succeeded**. |
| Is beta baseline broken? | **Not evidenced** — compose was never invoked successfully in this run. |

---

## Why stability is exactly 5

### Formula (source of truth)

From `scripts/companionIntelligenceValidationSuite.js`:

```javascript
stability: sprint214.passed === sprint214.total ? 97 : Math.round((sprint214.passed / sprint214.total) * 100),
```

### Inputs (failed run)

| Input | Value |
|-------|-------|
| `sprint214.passed` | **1** |
| `sprint214.total` | **20** |
| Calculation | `round(1/20 * 100)` = `round(5)` = **5** |

### Interpretation

- **Stability does not measure** API uptime, error rate, or doctrine/regression stability in this suite.
- It is a **misleading label** for **Sprint 2.14 companion acceptance pass rate only**.
- The **minimum intelligence category** is 5 (`minCategoryScore: 5`), which **forces** `readiness: NEEDS_REVIEW` and drags `overallScore` to **71**.

---

## The one “passed” test (benchmark artifact)

| Test | Passed? | Reply actual | Why it passed |
|------|---------|--------------|---------------|
| **TEST 3 — Job opportunity** | **true** | Full 401 unavailable string | Checks: `reply.length > 40`, `!hasInternalLabels`, `status === 200` |

The 401 error message is **longer than 40 characters** and contains no internal runtime labels, so it **false-passes** while every content check on other tests fails.

**Classification:** **Benchmark logic** (weak gate), not successful companion behavior.

---

## Failure frequency table

Counts are **failure attributions** across all validation units in the 2026-06-03T18:47 batch. One unit = one HTTP test or one benchmark turn.

| Failure source | Count | Impact | Notes |
|----------------|------:|--------|-------|
| **OpenAI auth (401 / composer unavailable)** | **74** | **Critical** | 34 failed HTTP tests (S214+S214b+S214c) + 20 RACL turns + 20 migration reason-first turns |
| **Benchmark logic (false pass on error text)** | **1** | Low | TEST 3 S214 `length > 40` |
| **Heuristic score inflation despite failures** | **3 suites** | Medium | Category scores 75–97 while tests failed; obscures auth failure in summary |
| **Misleading `openaiAvailable: true`** | **2 scripts** | Medium | Client exists + env var set; **calls still 401** |
| Runtime selection (wrong path) | **0** | — | `reason_first` was intended for beta; path reached correctly |
| Stale validation data | **0** | — | Timestamps prove same fresh failed batch |
| Routing (legacy responders) | **0** on RF path | — | RF path never reached responders; stuck at composer |
| Memory / RACL retrieval | **0** | — | RACL: **20/20** in-thread memory hits in evidence |
| Doctrine validation | **0** | — | No successful compose → validator not meaningfully exercised |
| Correction ledger | **0** | — | Pack built; compose failed before use |
| Composer behavior (quality) | **0** | — | No OpenAI output to judge |

**Consolidated headline:** **~98%** of measured failures trace to **401 authentication**, not architecture regression.

---

## Per-script evidence

### 1. `raclValidation.js` — OpenAI 0%

| Metric | Expected (beta) | Actual |
|--------|-----------------|--------|
| `openaiPct` | ≥ 70% | **0%** |
| `openaiCount` | ~20/20 | **0/20** |
| `avgHumanListening` | ~6.3+ | **0** (unavailable replies score 0) |
| `inThreadMemoryHitTurns` | High | **20/20** (retrieval OK) |
| `openaiAvailable` flag | true if key works | **true** (misleading — key present but invalid) |

**Sample turn (all 20 analogous):**

| Field | Value |
|-------|-------|
| Expected | `masterRoute: reason_first_openai`, substantive reply |
| Actual | `masterRoute: reason_first_openai_unavailable` |
| Reply | `[Reason-first composer unavailable: 401 Incorrect API key provided: sk-....` |

**Source:** OpenAI availability / auth — **not** RACL, routing, or rubric.

---

### 2. `reasonFirstMigration.js` — reason-first OpenAI 0%

| Arm | OpenAI % | Listening | Behavior |
|-----|----------|-----------|----------|
| **legacy** | 0% | ~5.6 | **Legacy responders/templates ran** (e.g. `job_discernment`, `sabbath_history`) |
| **reason_first** | **0%** | **0** | **All 20 turns: 401 unavailable** |

**Expected:** Reason-first arm ≥70% OpenAI with composed prose.  
**Actual:** Every reason-first turn identical 401 bracket; legacy arm unaffected because it does not require OpenAI.

**Source:** OpenAI auth on **reason-first only** — confirms runtime switch worked, compose did not.

---

### 3. `companionIntelligenceValidationSuite.js` — NEEDS_REVIEW

| Field | Value |
|-------|-------|
| `totals.passed` | **1/35** |
| `readiness` | **NEEDS_REVIEW** |
| `overallScore` | **71** |
| `minCategoryScore` | **5** (= stability) |
| `stability` | **5** |

**Suite breakdown:**

| Suite | Passed | Total | Score (heuristic) |
|-------|--------|-------|-------------------|
| Sprint 2.14 Companion | 1 | 20 | 75 |
| Sprint 2.14B Sabbath history | 0 | 5 | 78 |
| Sprint 2.14C Natural reasoning | 0 | 10 | 87 |

**Note:** Sub-suite **scores can stay high** when heuristics key off error-string substrings (e.g. S214C `directness: 97` because 401 text does not match failure regexes). **Do not treat 75–87 as proof of quality** when pass rate is 1/35.

---

## Failed tests — detail tables

### Sprint 2.14 Companion (19 failures + 1 false pass)

| Test | Failures | Expected | Actual | Primary source |
|------|----------|----------|--------|----------------|
| TEST 1 — Lost friend | empathy, scripture | Grief empathy + scripture | 401 unavailable | OpenAI auth |
| TEST 2 — Knee pain | health | Health companion cues | 401 unavailable | OpenAI auth |
| TEST 3 — Job opportunity | *(none)* | Job discernment response | 401 unavailable (passed on length) | **Benchmark logic** |
| TEST 4 — Sabbath definition | scripture, reflection | Genesis/Exodus Sabbath teaching | 401 unavailable | OpenAI auth |
| TEST 5 — Sabbath history | scriptureFirst, history, distinction, historyIntercept | History intercept + chain | 401 unavailable; `intercept: null` | OpenAI auth |
| TEST 6 — Prayer | prayer | Prayer path | 401 unavailable | OpenAI auth |
| TEST 7 — Memory recall | recall | Prior topic recall | 401 unavailable | OpenAI auth |
| TEST 8 — Kingdom | kingdom | Kingdom content | 401 unavailable | OpenAI auth |
| TEST 9 — Continue study | continue | Continue study flow | 401 unavailable | OpenAI auth |
| TEST 10 — Follow-up | correction, differentFromPrior | Correction handling | 401 unavailable | OpenAI auth |
| TEST 11 — Sabbath journey | progression, continueWorks | Study progression | 401 unavailable | OpenAI auth |
| TEST 12 — Kingdom journey | continue | Continue journey | 401 unavailable | OpenAI auth |
| TEST 13 — Feast journey | feast | Feast content | 401 unavailable | OpenAI auth |
| TEST 14 — Resume topic | resume | Resume prior topic | 401 unavailable | OpenAI auth |
| TEST 15 — Completion | recommendation | Next study recommendation | 401 unavailable | OpenAI auth |
| TEST 16 — Recurring knee | acknowledgesOngoing, leadsWithCurrent | Follow-up knee memory | 401 unavailable | OpenAI auth |
| TEST 17 — Grief follow-up | usesMemory | Grief memory continuity | 401 unavailable | OpenAI auth |
| TEST 18 — Continue journey | journey, significance | Journey explanation | 401 unavailable | OpenAI auth |
| TEST 19 — Focus this week | usesHistory | History-aware focus | 401 unavailable | OpenAI auth |
| TEST 20 — Working on lately | actualThemes | Personalized themes | 401 unavailable | OpenAI auth |

### Sprint 2.14B (5/5 failed)

All tests: **401 unavailable**; failures include `scriptureNoChange`, `constantine`, `directAnswer`, `chain`, `apology`, etc. **Expected:** Sabbath history depth via OpenAI/reason-first. **Actual:** No intercept, no history prose.

### Sprint 2.14C (10/10 failed)

All tests: **401 unavailable**; failures include `directAnswer`, `historical`, `scripture`, `griefTone`, `prayerPath`, etc.

---

## What did *not* fail (important negatives)

| Layer | Evidence it worked | Evidence compose failed |
|-------|-------------------|-------------------------|
| **Runtime selection** | `runtime: reason_first` in migration; `reason_first_openai_unavailable` route | N/A |
| **RACL / memory** | 20/20 `inThreadMemoryHitTurns`; evidence packs populated | Replies are error strings |
| **Legacy routing** | Migration legacy arm produced real routes (`sabbath_history`, `job_discernment`) | Only when `BUDDY_RUNTIME=legacy` |
| **Doctrine / correction / composer quality** | Not reachable | No successful OpenAI completion |

---

## Misleading signals in this run

| Signal | Looks like | Actually means |
|--------|------------|----------------|
| `openaiAvailable: true` | Key OK | **Module + env var present**; API returns **401** |
| S214C `score: 87` | Strong reasoning | **Heuristic** from pass counts / regex on error blobs |
| `Natural Conversation: 96` | Good tone | Error text lacks canned markers → inflated |
| TEST 3 **passed** | Job test OK | **Error message length > 40** |
| RACL memory 20/20 | Full stack OK | **Retrieval only**; composer dead |

---

## Projected Companion Intelligence score (if auth fixed + stale bad runs discarded)

### Basis for projection

Last **known-good** companion suite run (documented in repo history, **overwritten** in `validation-results.json` by the 2026-06-03 failed batch):

| Metric | Good run (2026-06-02 reference) | Failed run (2026-06-03) |
|--------|--------------------------------|-------------------------|
| Tests passed | **35/35** | 1/35 |
| **stability** | **97** | **5** |
| Sprint 214 acceptance score | **97** | 75 |
| **readiness** | **READY** | NEEDS_REVIEW |
| Suite totals | 3/3 suites passed gate | 0/3 |

Good-run category scores (from `BetaCommitReadinessReport.md` / prior archive): Memory 96, Warmth 100, Listening 97, Companion Presence 96, etc.

### Projected values after valid `OPENAI_API_KEY` + `BUDDY_RUNTIME=reason_first`

| Metric | Projected | Confidence |
|--------|-----------|------------|
| **stability** | **97** (20/20 S214 pass → formula shortcut) | High — purely pass-rate math |
| **tests passed** | **35/35** (if behavior matches June 2) | Medium — assumes no new regressions from P1 turn-intent removal |
| **readiness** | **READY** (if `allCategoriesPass` + 214c ≥ 95) | Medium |
| **overallScore** (intelligence average) | **~94–97** | Medium — derived from ~10 categories in mid-90s |
| **minCategoryScore** | **~95+** (not 5) | Medium |
| Sprint 214 **acceptanceScore** | **~95–97** | Medium |

### What will *not* auto-fix with auth alone

| Item | Why |
|------|-----|
| RACL listening gate ≥7 | Historical baseline **~6.3** even with valid key |
| Sabbath T7 ≥8 | Often fails in valid runs (~5.8) |
| Heuristic vs human listening | Automated rubric ≠ human beta checklist |

**Conclusion:** Fixing auth restores the suite from **catastrophic (71 / stability 5)** to **approximately the last known-good automated profile (~96 overall, stability 97, READY)**. It does **not** by itself prove listening ≥7 or beta human sign-off.

---

## Recovery procedure (operational, not implementation)

1. Set a **valid** `OPENAI_API_KEY` (rotate if `sk-....` was truncated/invalid in `.env`).
2. Confirm: `curl`/minimal OpenAI call succeeds before long suites.
3. Export `BUDDY_RUNTIME=reason_first` for beta validations only.
4. Re-run in order:
   ```bash
   BUDDY_RUNTIME=reason_first node scripts/raclValidation.js
   node scripts/reasonFirstMigration.js
   BUDDY_RUNTIME=reason_first node scripts/companionIntelligenceValidationSuite.js
   ```
5. **Discard** 2026-06-03T18:47 artifacts for go/no-go; replace with new timestamps.
6. Treat **stability** as **S214 pass rate**, not infra SLO — consider renaming in a future cleanup (out of scope here).

---

## Answers to audit questions

| Question | Answer |
|----------|--------|
| Is RESPONSE STRUCTURE / beta baseline disproven? | **No** — compose never ran. |
| Is stability=5 a product bug? | **No** — **1/20** acceptance tests passed (one false pass). |
| Primary suppression mechanism in *this* run? | **401 OpenAI authentication** (100% of reason-first compose). |
| Stale data? | **No** — fresh synchronized failure batch. |
| Projected intelligence score after fix? | **~94–97 overall**, **stability 97**, **readiness READY** (vs current **71 / 5 / NEEDS_REVIEW**). |

---

## Stop conditions

- No code changes  
- No deploy / push / Sprint 3  
- No new experiments  

**Next human action:** Fix API key, re-run §Recovery procedure, update `BetaCommitReadinessReport.md` with new JSON timestamps.
