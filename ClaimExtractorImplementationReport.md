# Claim Extractor Implementation Report

**Date:** 2026-06-08  
**Phase:** 2A — Claim Extractor v1  
**Status:** Implemented and wired

---

## Objective

Replace `c_inferred` with BibleBuddy-owned **Claim Extractor v1** between OpenAI compose and validator.

---

## Files created

| File | Purpose |
|------|---------|
| `services/claimExtractor.js` | Sentence segmentation, witness mapping, ref association |
| `services/doctrineConclusionBuilder.js` | BB-owned `doctrineConclusion` derivation |
| `scripts/phase2aClaimExtractorUnitTest.js` | Offline smoke test |
| `scripts/phase2aClaimExtractorRegression.js` | 7-topic live regression |

---

## Files modified

| File | Change |
|------|--------|
| `services/claimNormalizer.js` | Delegates to `extractClaims()` when OpenAI `claims[]` empty; **removed `c_inferred`** |
| `services/reasonFirstComposer.js` | Passes `scripture[]` + `evidencePack`; uses `buildDoctrineConclusion` |
| `services/openAiFirstCompanionRuntime.js` | Guard path passes `scripture[]` + `evidencePack` to normalizer |

---

## Pipeline position

```
OpenAI compose
  → normalizeStructured (reply, scripture[])
  → normalizeClaims → extractClaims (if no raw claims)
  → buildDoctrineConclusion (if no OpenAI conclusion)
  → validateClaimToScripture
  → approval gate
```

---

## Claim Extractor v1 algorithm

1. **Segment** `reply` into sentences (min 12 chars)
2. **Pass 1 — scripture witnesses:** each `scripture[]` entry → claim from `reason` or matching sentence; `supportingScriptures` from `reference`
3. **Pass 2 — sentence refs:** sentences with inline refs not already used → claims with mapped refs
4. **Ref catalog:** approved evidence graph refs + retrieval refs + witness refs
5. **Dedupe** overlapping claim text / refs
6. **Confidence:** `high` (approved ref), `medium` (mapped non-approved), `low` (no refs — not emitted in v1 paths)

### Output shape

```javascript
{
  claimId,           // c_witness_N | c_sent_N
  claim,
  type: 'doctrine',
  supportingScriptures,
  sourceSentence,
  confidence,
  derivedFrom        // scripture_witness | sentence_ref
}
```

---

## doctrineConclusionBuilder

- Ranks claims by confidence → ref count → brevity
- Returns highest-ranked claim text (trimmed to first sentence if >220 chars)
- No OpenAI involvement

---

## Circular dependency fix

`claimExtractor.js` defines local `normalizeRef` and `SAFE_DENIAL_RE` to avoid cycle with `claimNormalizer.js`.

---

## Regression summary (2026-06-08)

| Metric | Before (Phase 1C) | After (Phase 2A) |
|--------|-------------------|------------------|
| `c_inferred` usage | 6/6 (100%) | **0/7 (0%)** |
| Claims with refs | 0/6 | **49/49 (100%)** |
| `doctrineConclusion` | Inferred from reply slice | **BB-built 7/7** |
| Avg claims per turn | 1 | **7.0** |

**Artifact:** `docs/regression-trace/phase2a-claim-extractor-regression.json`
