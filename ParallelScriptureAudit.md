# Parallel Scripture Audit

**Phase:** 3B Part A
**Date:** 2026-06-09T05:37:37.037Z
**Phase 3A source:** 2026-06-09T05:17:41.417Z

## Summary

| Metric | Count |
|--------|-------|
| Actual parallel discovered (unique G2R + concordance) | 43 |
| Exported parallel (unique) | 3 |
| Corrected parallel (unique, audit reclasification) | 1 |
| Missing from export | 1 |
| Candidates with discovered parallel | 62 |
| Continuity refs merged into supporting | 32 |

## Exported parallel scriptures

- Revelation 11:15
- 1 Thessalonians 4:13-16
- 1 Thessalonians 4:13-18

## Corrected parallel scriptures (not exported)

- Isaiah 66:17

## Cause of discrepancy

- expandFullScriptureWitnesses merges g2rBefore.parallelScriptures into supportingWitnesses (corpusExpansionDiscovery.js)
- classifyScriptureBuckets assigns parallel from concordanceWitnesses + parallelRefs AFTER supporting bucket
- parallelRefs duplicates supportingWitnesses + continuityWitnesses + concordanceWitnesses
- Only concordance refs not already in supportingWitnesses survive as exported parallel (3 unique refs)
- G2R parallel scriptures (continuity chain nodes not cited) are absorbed into supporting bucket

## Per-candidate detail (parallel non-zero or discovered)

| ID | Topic | Discovered G2R | Concordance | Exported | Corrected | Merged to supporting |
|----|-------|----------------|-------------|----------|-----------|----------------------|
| 3a_0004 | death_state | 4 | 0 | 0 | 0 | 4 |
| 3a_0005 | death_state | 3 | 0 | 0 | 0 | 3 |
| 3a_0009 | kingdom | 5 | 0 | 0 | 0 | 5 |
| 3a_0010 | heavens | 3 | 2 | 0 | 0 | 3 |
| 3a_0011 | sabbath | 0 | 1 | 0 | 0 | 0 |
| 3a_0013 | dietary_law | 1 | 0 | 0 | 0 | 1 |
| 3a_0015 | sabbath | 1 | 1 | 0 | 0 | 1 |
| 3a_0016 | messiah_logos | 2 | 1 | 0 | 0 | 2 |
| 3a_0017 | dietary_law | 2 | 1 | 0 | 1 | 2 |
| 3a_0018 | heavens | 3 | 2 | 0 | 0 | 3 |
| 3a_0020 | sabbath | 3 | 3 | 0 | 0 | 3 |
| 3a_0021 | messiah_logos | 3 | 2 | 0 | 0 | 3 |
| 3a_0022 | kingdom | 5 | 0 | 0 | 0 | 5 |
| 3a_0023 | death_state | 2 | 0 | 0 | 0 | 2 |
| 3a_0024 | death_state | 3 | 0 | 0 | 0 | 3 |
| 3a_0026 | heavens | 3 | 2 | 0 | 0 | 3 |
| 3a_0027 | kingdom | 5 | 0 | 0 | 0 | 5 |
| 3a_0028 | kingdom | 5 | 0 | 0 | 0 | 5 |
| 3a_0029 | sabbath | 3 | 3 | 0 | 0 | 3 |
| 3a_0031 | sabbath | 4 | 2 | 0 | 0 | 4 |
| 3a_0032 | heavens | 3 | 2 | 0 | 0 | 3 |
| 3a_0033 | heavens | 3 | 2 | 0 | 0 | 3 |
| 3a_0034 | heavens | 3 | 2 | 0 | 0 | 3 |
| 3a_0035 | kingdom | 4 | 0 | 0 | 0 | 4 |
| 3a_0038 | heavens | 3 | 2 | 0 | 0 | 3 |
| 3a_0039 | death_state | 2 | 0 | 0 | 0 | 1 |
| 3a_0040 | death_state | 2 | 0 | 0 | 0 | 2 |
| 3a_0041 | kingdom | 6 | 0 | 1 | 0 | 4 |
| 3a_0042 | sabbath | 5 | 3 | 0 | 0 | 5 |
| 3a_0043 | death_state | 4 | 0 | 0 | 0 | 4 |
| 3a_0044 | death_state | 5 | 0 | 2 | 0 | 3 |
| 3a_0047 | death_state | 3 | 0 | 0 | 0 | 3 |
| 3a_0048 | kingdom | 5 | 0 | 0 | 0 | 5 |
| 3a_0049 | death_state | 4 | 0 | 0 | 0 | 4 |
| 3a_0051 | messiah_logos | 2 | 3 | 0 | 0 | 2 |
| 3a_0052 | death_state | 3 | 0 | 0 | 0 | 3 |
| 3a_0054 | death_state | 2 | 0 | 0 | 0 | 2 |
| 3a_0055 | kingdom | 5 | 0 | 0 | 0 | 5 |
| 3a_0057 | death_state | 4 | 0 | 0 | 0 | 4 |
| 3a_0058 | sabbath | 5 | 3 | 0 | 0 | 5 |
| 3a_0061 | death_state | 3 | 0 | 0 | 0 | 3 |
| 3a_0063 | death_state | 4 | 0 | 0 | 0 | 4 |
| 3a_0065 | death_state | 4 | 0 | 0 | 0 | 4 |
| 3a_0066 | death_state | 4 | 0 | 0 | 0 | 4 |
| 3a_0069 | death_state | 4 | 0 | 0 | 0 | 4 |
| 3a_0071 | death_state | 4 | 0 | 0 | 0 | 4 |
| 3a_0073 | heavens | 3 | 2 | 0 | 0 | 3 |
| 3a_0074 | sabbath | 4 | 3 | 0 | 0 | 4 |
| 3a_0075 | dietary_law | 5 | 5 | 0 | 0 | 5 |
| 3a_0078 | death_state | 4 | 0 | 0 | 0 | 4 |
| 3a_0080 | kingdom | 5 | 0 | 0 | 0 | 5 |
| 3a_0082 | death_state | 2 | 0 | 0 | 0 | 2 |
| 3a_0084 | death_state | 3 | 0 | 0 | 0 | 3 |
| 3a_0085 | death_state | 3 | 0 | 0 | 0 | 3 |
| 3a_0090 | heavens | 3 | 2 | 0 | 0 | 3 |
| 3a_0091 | death_state | 2 | 0 | 0 | 0 | 2 |
| 3a_0093 | death_state | 2 | 0 | 0 | 0 | 2 |
| 3a_0096 | sabbath | 2 | 1 | 0 | 0 | 2 |
| 3a_0097 | sabbath | 5 | 3 | 0 | 0 | 5 |
| 3a_0098 | death_state | 1 | 0 | 0 | 0 | 1 |
| 3a_0115 | feasts | 3 | 0 | 0 | 0 | 3 |
| 3a_0120 | sabbath | 0 | 1 | 0 | 0 | 0 |
