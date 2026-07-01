# Bible Authority Phase 3U Report

**Date:** 2026-06-10T00:32:00.000Z

## Objectives

1. Normalize caption-derived scripture references
2. Semantic doctrine-pack matching (auto-link >= 0.85)
3. Spanish transcript processing
4. PDF confidence re-scoring
5. Coverage rebuild + gap closure

## Results

| Metric | Before (3T) | After (3U) | Delta |
|--------|-------------|------------|-------|
| Covered | 324 | **365** | +41 |
| Partial | 216 | **219** | +3 |
| Missing | 53 | **9** | -44 |

### Normalization

- Incomplete candidates (Pass A): **4,581**
- Context-expanded refs (Pass B): **390**

### Semantic linkage

- Auto-linked (confidence >= 0.85): **116** YouTube Q&A sessions

### Spanish

- Lessons processed: **4** unique · **2** with scriptures from captions

### PDF confidence

- Auto-approved (score >= 80): **33** extractions

### Facebook

- Scripture recoveries from public metadata: **0** (paste queue still required)

### Human review

- Extraction packets requiring review: **176 → 22** (**88% reduction**)
- Gap-closure semantic linkages flagged for review separately

### Targets

| Target | Status |
|--------|--------|
| Missing < 15 | ✅ (9 remaining) |
| Covered > 340 | ✅ (365) |
| Partial >= 219 | ✅ (219) |
| Human review -50% | ✅ (88%) |

### Remaining 9 missing

Mostly non-recoverable without manual input: IOG Twitter/social placeholders, duplicate Spanish title entries, and pages where URL fetch returned no scripture text.

## Artifacts

**JSON (`docs/evidence-candidates/`):**

- `normalized-reference-candidates.json` — Pass A incomplete refs
- `normalized-scripture-references.json` — Pass B context-expanded refs
- `doctrine-pack-seed-map.json` — semantic seed phrases
- `doctrine-pack-semantic-linkage.json` — per-packet linkage scores
- `spanish-transcript-index.json` / `spanish-recovery-results.json`
- `pdf-confidence-precheck.json` / `pdf-confidence-review.json`
- `facebook-recovery-index.json` / `facebook-question-normalization.json` / `facebook-scripture-recovery.json`
- `phase3u-gain-report.json`
- `cursor-recovered-source-organization-v3.json`

**Trace:** `docs/regression-trace/phase3u-normalization-linkage-results.json`

## Safety

No production, doctrine generation, evidence card, graph, or prompt changes.
