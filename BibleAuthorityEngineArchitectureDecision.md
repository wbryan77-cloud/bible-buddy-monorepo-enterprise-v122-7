# Bible Authority Engine Architecture Decision

**Date:** 2026-06-07  
**Phase:** 1D — Claim Ownership Decision  
**Status:** **DECIDED (diagnosis only — no implementation)**  
**Supersedes:** Implicit assumption that OpenAI would own `claims[]` per `CLAIM_EXTRACTION_INSTRUCTION`

---

## Decision record

| Field | Value |
|-------|-------|
| **ADR ID** | BAE-1D-001 |
| **Title** | BibleBuddy owns doctrine claim metadata |
| **Decision** | **Hybrid** — OpenAI authors `reply` + `scripture[]`; BibleBuddy extracts `claims[]` + `doctrineConclusion` |
| **Confidence** | **High** — backed by Phase 1C measurements (6/6 vs 0/6) |

---

## Context

The Bible Authority Engine pipeline:

```
Question → Evidence → OpenAI → reply → claims[] → doctrineConclusion → validator → approval
```

Phase 1B/1C proved infrastructure through compose. Phase 1C proved metadata failure: model ignores `claims[]` and `doctrineConclusion` while fully populating legacy `scripture[]`.

Current `c_inferred` fallback creates claims without scripture bindings → **100% class C** on live doctrine sample.

---

## Decision

### Primary ownership model

```
┌─────────────────────────────────────────────────────────────┐
│  OPENAI (stable contract — do not fight in Phase 1E)        │
│  • reply                                                    │
│  • scripture[] { reference, text, reason }                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  BIBLEBUDDY (Authority Engine — Phase 1E target)            │
│  • claimExtractor(reply, scripture[], evidencePack)         │
│  • claims[] { claimId, claim, supportingScriptures, ... }   │
│  • doctrineConclusion                                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  EXISTING (frozen this phase)                               │
│  • validateClaimToScripture                                 │
│  • approval gate / degradation                              │
└─────────────────────────────────────────────────────────────┘
```

### Deprecate

- **`c_inferred` monolith** as production claim strategy (keep only as emergency fallback until extractor ships)
- **Dependency on OpenAI `claims[]`** for Authority Engine v1

### Defer

- Prompt/schema unification for OpenAI `claims[]` — optional **Phase 1F experiment**, not blocker
- 95% doctrine traceability — **Phase 2** after extractor baseline (~80% ref attachment)

---

## Consequences

### Positive

- Aligns with **observed model behavior** (6/6 `scripture[]`)
- **Deterministic** claim generation for audits and fixtures
- **No extra Render API cost** for v1 extractor
- Validator + approval gate **unchanged** — receive better-shaped inputs
- Clear `derivedFrom` provenance (`scripture_witness`, `sentence_ref`, not `inferred_from_reply`)

### Negative / risks

- New extraction code to build and maintain (Phase 1E)
- `scripture[]` may include **unapproved refs** — extractor must filter
- **50–70%** traceability realistic v1 — not 95%
- Sentence-boundary errors on complex replies

### Neutral

- OpenAI compose prompt **unchanged** in Phase 1D
- No doctrine, evidence, or validator modifications

---

## Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| **OpenAI-owned claims only** | 0/6 compliance; competing schema; non-deterministic |
| **Reply-only `c_inferred`** | 0% traceability; 0% A/B; truncates; ignores `scripture[]` |
| **Second LLM extraction call** | Extra Render cost; similar reliability risk to Option 1 |
| **Skip claims entirely** | Breaks Authority Engine architecture |

---

## Evidence summary

| Source | Finding |
|--------|---------|
| `phase1c-claim-generation-compliance.json` | claims 0/6, scripture 6/6 |
| `claimNormalizer.js` | `c_inferred` — no refs, 280 char cap |
| `baeClaimValidatorFixtures.js` | Validator passes well-formed claims (class A) |
| `ClaimExtractionFeasibilityReport.md` | 95% infeasible reply-only; hybrid ~50–70% |

---

## Phase map

| Phase | Focus | Status |
|-------|-------|--------|
| 1A–1B | Validator + infrastructure | ✅ Complete |
| 1C | Metadata compliance audit | ✅ Complete — bottleneck identified |
| **1D** | **Ownership decision** | ✅ **This document** |
| 1E | Claim extractor implementation | 🔜 Next (not started) |
| 1F | Optional OpenAI `json_schema` experiment | Deferred |
| 2 | 95% traceability + authority scoring | Deferred |

---

## Approvals

| Role | Status |
|------|--------|
| Implementation | **Stopped** per Phase 1D instructions |
| Deploy / push | **Not authorized** |

---

## Related documents

- `ClaimOwnershipAnalysis.md`
- `ClaimInferenceAudit.md`
- `ClaimExtractionFeasibilityReport.md`
- `ClaimOwnershipRecommendation.md`
- `ClaimGenerationRootCause.md` (Phase 1C)
- `DoctrineMetadataReadinessScore.md` (Phase 1C — 17/100)

---

## Stop condition

Phase 1D complete. **No fixes implemented.** Await Phase 1E charter for claim extractor build.
