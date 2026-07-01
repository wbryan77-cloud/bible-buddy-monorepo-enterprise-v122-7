# Continuity Scripture Audit

**Phase:** 3B Part B
**Date:** 2026-06-09T05:37:37.037Z

## Summary

| Metric | Count |
|--------|-------|
| Actual continuity discovered (expansion.continuityWitnesses unique) | 32 |
| G2R continuity chain nodes (unique) | 38 |
| Exported continuity (unique) | 0 |
| Corrected continuity (unique) | 31 |
| Missing from export | 31 |
| Candidates with continuity discovered | 60 |
| Merged into supporting (unique) | 32 |

## Corrected continuity scriptures

- Ecclesiastes 9:5
- John 11:11-14
- 1 Thessalonians 4:13-16
- Revelation 20:4-6
- Acts 1:9-11
- Revelation 5:10
- Revelation 11:15
- Revelation 20:1-6
- Revelation 21:1-3
- 2 Corinthians 12:2
- John 14:3
- Daniel 1:8
- Hebrews 4:9
- Isaiah 9:6
- Colossians 1:15-17
- Exodus 20:8-11
- Isaiah 58:13-14
- John 1:1-14
- Luke 4:16
- Acts 17:2
- Matthew 6:9-10
- Genesis 2:7
- Leviticus 11
- Isaiah 66:17
- Acts 10:28
- Acts 11:1-18
- Genesis 2:2-3
- Revelation 14:12
- Luke 22:14-20
- Acts 2:1-4
- Zechariah 14:16-19

## Cause of discrepancy

- continuityWitnesses discovered in expandFullScriptureWitnesses (204 total refs, 32 unique across candidates)
- g2rBefore.supportingScriptures also includes continuity chain nodes (discoverGenesisToRevelation.js line 185)
- supportingWitnesses expansion field absorbs g2r parallel + card supporting + continuity nodes
- classifyScriptureBuckets puts expansion.supportingWitnesses into supportingScriptures first
- continuityScriptures bucket filters out refs already in supportingScriptures — yields 0 for all candidates
- Export reports continuityScriptures: [] while continuity content appears under supportingScriptures

## Per-candidate detail (continuity discovered)

| ID | Topic | Discovered | Exported | Corrected | Merged to supporting |
|----|-------|------------|----------|-----------|----------------------|
| 3a_0004 | death_state | 4 | 0 | 4 | 4 |
| 3a_0005 | death_state | 3 | 0 | 3 | 3 |
| 3a_0009 | kingdom | 5 | 0 | 5 | 5 |
| 3a_0010 | heavens | 3 | 0 | 3 | 3 |
| 3a_0013 | dietary_law | 1 | 0 | 1 | 1 |
| 3a_0015 | sabbath | 1 | 0 | 1 | 1 |
| 3a_0016 | messiah_logos | 2 | 0 | 2 | 2 |
| 3a_0017 | dietary_law | 2 | 0 | 1 | 2 |
| 3a_0018 | heavens | 3 | 0 | 3 | 3 |
| 3a_0020 | sabbath | 3 | 0 | 3 | 3 |
| 3a_0021 | messiah_logos | 3 | 0 | 3 | 3 |
| 3a_0022 | kingdom | 5 | 0 | 5 | 5 |
| 3a_0023 | death_state | 2 | 0 | 2 | 2 |
| 3a_0024 | death_state | 3 | 0 | 3 | 3 |
| 3a_0026 | heavens | 3 | 0 | 3 | 3 |
| 3a_0027 | kingdom | 5 | 0 | 5 | 5 |
| 3a_0028 | kingdom | 5 | 0 | 5 | 5 |
| 3a_0029 | sabbath | 3 | 0 | 3 | 3 |
| 3a_0031 | sabbath | 4 | 0 | 4 | 4 |
| 3a_0032 | heavens | 3 | 0 | 3 | 3 |
| 3a_0033 | heavens | 3 | 0 | 3 | 3 |
| 3a_0034 | heavens | 3 | 0 | 3 | 3 |
| 3a_0035 | kingdom | 5 | 0 | 4 | 4 |
| 3a_0038 | heavens | 3 | 0 | 3 | 3 |
| 3a_0039 | death_state | 2 | 0 | 1 | 1 |
| 3a_0040 | death_state | 2 | 0 | 2 | 2 |
| 3a_0041 | kingdom | 6 | 0 | 5 | 4 |
| 3a_0042 | sabbath | 5 | 0 | 5 | 5 |
| 3a_0043 | death_state | 4 | 0 | 4 | 4 |
| 3a_0044 | death_state | 5 | 0 | 5 | 3 |
| 3a_0047 | death_state | 3 | 0 | 3 | 3 |
| 3a_0048 | kingdom | 5 | 0 | 5 | 5 |
| 3a_0049 | death_state | 4 | 0 | 4 | 4 |
| 3a_0051 | messiah_logos | 2 | 0 | 2 | 2 |
| 3a_0052 | death_state | 3 | 0 | 3 | 3 |
| 3a_0054 | death_state | 2 | 0 | 2 | 2 |
| 3a_0055 | kingdom | 5 | 0 | 5 | 5 |
| 3a_0057 | death_state | 4 | 0 | 4 | 4 |
| 3a_0058 | sabbath | 5 | 0 | 5 | 5 |
| 3a_0061 | death_state | 3 | 0 | 3 | 3 |
| 3a_0063 | death_state | 4 | 0 | 4 | 4 |
| 3a_0065 | death_state | 4 | 0 | 4 | 4 |
| 3a_0066 | death_state | 4 | 0 | 4 | 4 |
| 3a_0069 | death_state | 4 | 0 | 4 | 4 |
| 3a_0071 | death_state | 4 | 0 | 4 | 4 |
| 3a_0073 | heavens | 3 | 0 | 3 | 3 |
| 3a_0074 | sabbath | 4 | 0 | 4 | 4 |
| 3a_0075 | dietary_law | 5 | 0 | 5 | 5 |
| 3a_0078 | death_state | 4 | 0 | 4 | 4 |
| 3a_0080 | kingdom | 5 | 0 | 5 | 5 |
| 3a_0082 | death_state | 2 | 0 | 2 | 2 |
| 3a_0084 | death_state | 3 | 0 | 3 | 3 |
| 3a_0085 | death_state | 3 | 0 | 3 | 3 |
| 3a_0090 | heavens | 3 | 0 | 3 | 3 |
| 3a_0091 | death_state | 2 | 0 | 2 | 2 |
| 3a_0093 | death_state | 2 | 0 | 2 | 2 |
| 3a_0096 | sabbath | 2 | 0 | 2 | 2 |
| 3a_0097 | sabbath | 5 | 0 | 5 | 5 |
| 3a_0098 | death_state | 1 | 0 | 1 | 1 |
| 3a_0115 | feasts | 3 | 0 | 3 | 3 |
