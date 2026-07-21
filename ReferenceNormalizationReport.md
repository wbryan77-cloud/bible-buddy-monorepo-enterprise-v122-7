# Reference Normalization Report

**Date:** 2026-06-08  
**Phase:** 2D Part A  
**Artifact:** `docs/regression-trace/phase2d-reference-normalization-audit.json`

---

## Implementation

| Component | Path |
|-----------|------|
| Reference normalizer | `services/scriptureReferenceNormalizer.js` |
| Validator integration | `services/claimToScriptureValidator.js` → `refInApprovedList()` |

---

## Range pairs tested

| Cited | Approved | Result |
|-------|----------|--------|
| Matthew 6:10 | Matthew 6:9-10 | ✅ pass |
| Acts 10:28 | Acts 10 | ✅ pass |
| Acts 10:28 | Acts 10:28 | ✅ pass |
| John 14:3 | John 14:3 | ✅ pass |
| John 14:3 | John 14 | ✅ pass |
| Revelation 21:1-3 | Revelation 21 | ✅ pass |
| Genesis 1:6-8 | Genesis 1 | ✅ pass |
| Matthew 6:10 | John 3:13 | ✅ correctly false |

**8/8 ref pairs pass.**

---

## Class C impact (reference layer only)

| Metric | Before 2D | After ref normalization |
|--------|-----------|-------------------------|
| Class C claims (Phase 2C baseline) | 27 | — |
| Claims fixed by ref normalization alone | — | **3** (Matt 6:10 ×2, enables graph match) |
| Doctrine change | — | **None** |

Claims that moved from `unsupported_citation` to graph-verifiable:

1. third_heaven `c_witness_5` — Matthew 6:10 → class A (`matt6_10_kingdom_on_earth`)
2. third_heaven `c_sent_10` — Matthew 6:10 → class A
3. kingdom `c_sent_6` — Matthew 6:10 → class A

---

## Zero doctrine change confirmation

- No Evidence Card fields modified
- No bindingRules text added to cards
- No new scriptures introduced
- Only `refInApproved` matching logic changed to verse-range overlap

---

## Technical note

Circular dependency broken: `scriptureReferenceNormalizer` uses local `normalizeRef()` instead of importing `claimNormalizer` (which imports `claimExtractor` → `approvedEvidenceGraph`).
