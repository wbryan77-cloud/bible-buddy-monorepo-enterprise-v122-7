# Phase 5H Two-Witness Standard Report

**Date:** 2026-06-14  
**Standard:** Deuteronomy 19:15, Matthew 18:16, 2 Corinthians 13:1

## Implementation

`services/twoWitnessStandard.js` enforces witness counts by answer type:

| Lane | Minimum witnesses | Notes |
|------|-------------------|-------|
| New doctrine / moral guidance | 2 | Preferred 2–3 strong witnesses |
| Established topic continuation | 1 additional | Matter already established |
| Emotional support | 1 comfort verse | Natural tone preserved |
| Prayer | 0 required | Pray first; Scripture optional |
| Practical guidance | 0 required | Scripture witnesses when establishing principle |

`companionStyleGuard.applyCompanionStyleGuard()` calls `validateWitnessStandard()` on every orchestrator output.

## Regression Evidence

| Test | Witness expectation | Result |
|------|---------------------|--------|
| Can we eat pork? | 2+ (Leviticus, Deuteronomy) | PASS |
| Sex strings attached | 2+ (Corinthians, Thessalonians, Hebrews) | PASS |
| Why? (after pork) | Continuation — no full re-dump | PASS |
| Acts 10 | People-not-food clarification | PASS |
| Nervous / overwhelmed | 1 comfort verse | PASS |
| Prayer with me | Actual prayer, optional refs | PASS |

## Guardrails Active

- No padding with unrelated verses  
- Parables not used as primary doctrine proof (existing contract)  
- `trimDoctrineDumpOnAnotherVerse()` prevents full doctrine repeat on “another verse”  
- `compressRepeatedSentences()` reduces robotic duplication  

## Gaps

- Witness validation is advisory in style guard (logs `witnessStandard` metadata) — does not block publish if under-counted on emotional lanes by design.  
- Cross-book witness strength not ranked; count-based minimum only.

## Verdict

Two-witness standard **operational** for new doctrine/moral guidance with natural exceptions for companion lanes.
