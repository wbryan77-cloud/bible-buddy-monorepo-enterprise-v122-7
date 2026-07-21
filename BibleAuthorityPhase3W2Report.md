# Bible Authority Phase 3W.2 Report

**Date:** 2026-06-10T05:11:43.828Z

## Mission

Determine whether remaining weak metrics are genuine corpus weaknesses or scoring/attachment limitations. Validation only.

## Executive answers

1. **Chain attachment weakness — bookkeeping share:** 21.1% of unattached gaps show scripture overlap (bookkeeping/linkage, not missing evidence). Pack gaps: 4 missing linkage vs 15 insufficient evidence.
2. **Question coverage weakness — corpus scope:** True phase3f coverage (excluding internal audit prompts) is **74.8%** vs current scorecard formula **58.4%** (double-counting denominator).
3. **Traceability weakness — metadata share:** 92.9% of traceability gaps are metadata-only; 2 packs lack traceability entries (evidence-related).
4. **Adjusted corpus health score:** **80%** (metadata-adjusted readiness). Current readiness: 80%.
5. **Phase 4 implementation testing:** **Ready** with metadata-adjusted scoring.

## Part 1 — Chain attachment validation

| Metric | Value |
|--------|-------|
| Total chains | 6 |
| Attached chains | 6 |
| Unattached chains | 0 |
| Major packs without chain attachment | 19 |
| Pack gaps — missing linkage | 4 |
| Pack gaps — insufficient evidence | 15 |

## Part 2 — Question coverage validation

| Coverage | Pct | Note |
|----------|-----|------|
| A — current formula | 58.4% | Denominator double-counts traceability questions already present in question-coverage-index |
| B — exclude internal audit | 82.5% | phase3f: 74.8% |
| C — include audit prompts | 78.1% | phase3f: 69.8% |

## Part 3 — Traceability gap analysis

- Packs audited: **28**
- In traceability index: **26**
- Failures: **28** (26 metadata-only, 2 evidence-related)

## Part 4 — Pathway quality validation

| Quality | Count |
|---------|-------|
| Observed — supported (≥2 sources) | 229 |
| Observed — weak (single source) | 4503 |
| Candidate (reviewable) | 10 |
| Adjusted weak pathway rate | 95.2% |

## Part 5 — Health score recalibration

| Metric | Current | Adjusted | Metadata-adjusted |
|--------|---------|----------|-------------------|
| chain_attachment | 20.8% | 37.5% | 37.5% |
| question_coverage | 58.4% | 82.5% | 74.8% |
| traceability | 89.7% | 92.9% | 92.9% |
| enrichment | 100% | 100% | 100% |
| topic_connectivity | 100% | 100% | 100% |

**Adjusted readiness:** 80%
**Metadata-adjusted readiness:** 80%

## Artifacts

- `chain-attachment-validation.json`
- `question-coverage-validation.json`
- `traceability-gap-analysis.json`
- `pathway-quality-validation.json`
- `corpus-health-recalibration-report.json`

No doctrine generation. Validation only.
