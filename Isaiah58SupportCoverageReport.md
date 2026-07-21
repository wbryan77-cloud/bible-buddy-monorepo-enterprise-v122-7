# Isaiah 58 Support Coverage Report

**Phase:** 2H Part B  
**Date:** 2026-06-08

---

## Audit

| Location | Isaiah 58 coverage |
|----------|-------------------|
| sabbath.card supportingScriptures | Isaiah 58:13-14 ✓ |
| approvedSupportGraph `isa58_delight_in_sabbath` | Expanded claim patterns ✓ |
| claimSupportVerifier legacy affirmations | None (graph primary) |
| Phase 2G Class C (Isaiah 58 sub-cluster) | 14 claims |

---

## Root cause

Edge existed but **claim patterns required exact word forms** (`\bdelight\b` missed "delighting"). OpenAI paraphrase used application language ("refraining from personal business", "holy day of the Lord") not in patterns.

---

## Implementation

Expanded `isa58_delight_in_sabbath` patterns only — no new doctrine:

- `delighting`, `own business`, `personal business`, `refraining`, `holy day`, `honoring`, `lasting sign`, `covenant sign`

---

## Result

| Metric | Before 2H | After 2H |
|--------|-----------|----------|
| Isaiah 58 Class C (offline replay) | 14 | 0 |
| Live sabbath turn Isaiah 58 Class C | multiple | 0 (Isaiah claims pass; 3 other refs remain) |
