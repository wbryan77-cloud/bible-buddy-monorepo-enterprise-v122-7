# Bible Authority Phase 1B Report

**Date:** 2026-06-07  
**Priority:** CRITICAL  
**Status:** Phase 1B complete — **push BLOCKED** (no live API key)  
**Focus:** Authority engine traceability — not individual doctrine patches

---

## Root objective

Fix the **authority-order failure**: OpenAI must not teach doctrine that cannot be traced to approved Scripture evidence.

```
Question → retrieval → approved evidence → OpenAI + claims[]
  → claim support verification → doctrine approval gate → final answer
```

---

## Part A — Live happy-path validation

| Script | Result |
|--------|--------|
| `baeClaimValidatorFixtures.js` | **9/9 allPass** ✅ |
| `baePhase1aRegression.js` | Not re-run separately (superseded by 1B) |
| `baePhase1bValidation.js` | **0/12 live** — `OPENAI_API_KEY` missing |

### Offline fixture coverage (citation ≠ support included)

| ID | Scenario | Class | Decision |
|----|----------|-------|----------|
| f_third_heaven_bad | Destination drift + 2 Cor 12:2 | D | Rejected |
| f_kingdom_heaven_bad | Kingdom in heaven + Matt 6 | D | Rejected |
| f_acts10_bad | Pork clean via Acts 10 | D | Rejected |
| f_third_heaven_good | Paul names third heaven | A | Approved |
| f_no_ascended_bad | Believers ascended + John 3:13 | D | Rejected |
| f_cannot_come_bad | Permanent heaven + John 13:33 | D | Rejected |
| f_citation_without_support | Eternal home + 2 Cor 12:2 | D | Rejected |
| f_pork_citation_leviticus | Pork clean + Lev 11 | D | Rejected |
| f_matt610_citation_kingdom_heaven | Kingdom in heaven + Matt 6 | D | Rejected |

**Push gate:** `bae-phase1b-results.json` → `summary.allPass: true`

```bash
export OPENAI_API_KEY=sk-...
node scripts/baeClaimValidatorFixtures.js
node scripts/baePhase1bValidation.js
```

---

## Part B — Claim traceability matrix

**New modules:**

| Module | Role |
|--------|------|
| `services/claimSupportVerifier.js` | Citation-vs-support relationship |
| `services/claimTraceabilityMatrix.js` | Per-turn matrix builder |
| `services/doctrineAnswerTrace.js` | Extended with full matrix |

Each claim now includes: `claimId`, `claim`, `supportingScriptures`, `supportClass`, `supportRelationship`, `derivedFrom`, `validatorDecision`.

See [`ClaimTraceabilityMatrix.md`](ClaimTraceabilityMatrix.md).

---

## Part C — Citation ≠ support eliminated (system fix)

**Before:** Claim citing Matthew 6:10 could pass because book name appeared.

**After:** `verifyCitationSupportsClaim()` judges whether the **claim text** is authorized by the **cited ref** using rules derived from frozen `bindingRules` / `cautionPassages`.

Unverified citation → Class **C** `citation_without_verified_support` (not auto-B).

---

## Part D — Evidence gap audit

| Rank | Gap | Status |
|------|-----|--------|
| 1 | holy (no card) | Documented — denial path |
| 2 | logos (no chain) | Documented — card sufficient for now |
| 3–5 | binding metadata thin | Validator compensates |

See [`EvidenceGapRanking.md`](EvidenceGapRanking.md).

**No large-scale evidence ingestion performed.**

---

## Part E — Render stability

| Check | Pass |
|-------|:----:|
| Memory stable offline | ✅ |
| No restart loops | ✅ |
| Max 1 regen | ✅ |
| Debug off | ✅ |
| Trace off by default | ✅ |

See [`RenderStabilityVerification.md`](RenderStabilityVerification.md).

---

## Part F — IOG pilot (discovery only)

| Item | Status |
|------|--------|
| Full library ingest | ❌ Not started |
| Mass scrape | ❌ Prohibited |
| Pilot discovery template | ✅ `data/iog-pilot-discovery.json` |
| Max lessons | 3 slots (empty) |
| Max questions | 10 cap defined |
| Cross-check engine | ✅ `teachingCandidateCrossCheck.js` |
| Manual ingest CLI | ✅ `scripts/ingestTeachingCandidatePilot.js` |

All content remains **Evidence Candidate** — NOT doctrine, NOT authority.

---

## Part G — Readiness

**Score: 76 / 100** — see [`BibleAuthorityReadinessScoreV2.md`](BibleAuthorityReadinessScoreV2.md)

| Target | Score | Status |
|--------|-------|--------|
| Push | 85+ | ❌ 76 |
| Large expansion | 95+ | ❌ |

---

## Files added/modified (Phase 1B)

```
services/claimSupportVerifier.js          NEW
services/claimTraceabilityMatrix.js       NEW
services/claimToScriptureValidator.js     MODIFIED — citation support
services/doctrineAnswerTrace.js           MODIFIED — matrix in trace
scripts/baePhase1bValidation.js           NEW
scripts/renderStabilityVerification.js    NEW
scripts/baeClaimValidatorFixtures.js      MODIFIED — 9 fixtures
data/iog-pilot-discovery.json             NEW — discovery only
docs/regression-trace/bae-phase1b-results.json
docs/regression-trace/render-stability-verification.json
```

---

## Explicit non-actions

- ❌ No push
- ❌ No deploy
- ❌ No new doctrine
- ❌ No new responders / templates
- ❌ No large-scale IOG ingestion
- ❌ No doctrine content changes

**Stop condition met:** validation + reports complete. Live pass pending API key.
