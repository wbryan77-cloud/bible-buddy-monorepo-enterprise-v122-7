# Bible Authority Engine Phase 2A Report

**Date:** 2026-06-08  
**Phase:** 2A — Claim Extractor Implementation  
**Status:** **COMPLETE** — implemented, wired, validated

---

## Executive summary

Phase 2A replaces `c_inferred` with **Claim Extractor v1** and **doctrineConclusionBuilder**, moving doctrine **metadata** ownership to BibleBuddy without changing doctrine content, evidence cards, or validators.

| Goal | Result |
|------|--------|
| Replace `c_inferred` | ✅ **0/7** inferred (was 6/6) |
| Extract `claims[]` from reply + scripture[] | ✅ **49 claims** across 7 topics |
| Map refs to claims | ✅ **100%** mapped |
| BB-owned `doctrineConclusion` | ✅ **7/7** |
| Wire before validator | ✅ `reasonFirstComposer` + `openAiFirstCompanionRuntime` |
| No new doctrine/evidence/validators | ✅ |

---

## Architecture change

### Before

```
OpenAI → reply → c_inferred (no refs) → validator (100% C) → degraded
```

### After

```
OpenAI → reply + scripture[]
  → claimExtractor (witness + sentence refs)
  → doctrineConclusionBuilder
  → validator (A/B/C/D per claim) → approval
```

---

## Implementation inventory

| Component | Path |
|-----------|------|
| Claim Extractor v1 | `services/claimExtractor.js` |
| Doctrine Conclusion Builder | `services/doctrineConclusionBuilder.js` |
| Normalizer integration | `services/claimNormalizer.js` |
| Compose wiring | `services/reasonFirstComposer.js` |
| Runtime wiring | `services/openAiFirstCompanionRuntime.js` |
| Unit test | `scripts/phase2aClaimExtractorUnitTest.js` |
| Regression runner | `scripts/phase2aClaimExtractorRegression.js` |
| Regression JSON | `docs/regression-trace/phase2a-claim-extractor-regression.json` |

---

## Regression results (7 doctrine topics)

| Topic | Claims | Mapped | Validator | Approval |
|-------|--------|--------|-----------|----------|
| Logos | 7 | 7 | fail | degraded |
| Third heaven | 7 | 7 | fail | degraded |
| Acts 10 | 4 | 4 | fail | degraded |
| Pork | 4 | 4 | fail | degraded |
| Sabbath | 13 | 13 | fail | degraded |
| Death state | 6 | 6 | **pass** | **approved** |
| Kingdom | 8 | 8 | fail | degraded |

**Highlight:** Death state achieves **full validator pass** with **6 class A/B claims** — first clean authority trace on live compose path.

**Third heaven / kingdom / pork:** Multiple **class A** claims extracted (was 0% A/B under `c_inferred`).

---

## Validator fixtures

`baeClaimValidatorFixtures.js`: **9/9 pass** — no validator regression.

---

## What Phase 2A did NOT change

- Doctrine content in evidence cards
- `validateClaimToScripture` rules
- OpenAI compose prompts / schemas
- Approval gate logic
- IOG ingestion

---

## Known limitations (Phase 2B+)

1. **Reasoning still model-first** — `reply` prose authored by OpenAI; extractor maps metadata post-compose
2. **Witness duplication** — scripture witnesses + sentence claims overlap on same refs
3. **Logos / Sabbath** — thin affirmation rules → mostly class C despite mapped refs
4. **doctrineConclusion ranking** — may not select the most direct answer sentence

---

## Phase progression

| Phase | Focus | Status |
|-------|-------|--------|
| 1C | Metadata gap identified | ✅ |
| 1D | BB claim ownership decided | ✅ |
| 1E-A | Reasoning ownership audit | ✅ |
| **2A** | **Claim Extractor v1** | ✅ **This report** |
| 2B | Dedupe, conclusion tuning, affirmation gap measurement | Next |
| 3 | Pre-compose claims from evidence graph | Roadmap |

---

## Related reports

- `ClaimExtractorImplementationReport.md`
- `ClaimExtractionAccuracyReport.md`
- `DoctrineConclusionDerivationReport.md`

---

## Stop condition

Implementation and validation complete. No push, deploy, or doctrine changes per instructions.

**Re-run:**

```bash
export OPENAI_API_KEY=<valid-sk-key>
node scripts/phase2aClaimExtractorUnitTest.js
node scripts/phase2aClaimExtractorRegression.js
```
