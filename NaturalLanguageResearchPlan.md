# Natural Language Research Plan

**Phase:** 2J-M+ Part E
**Date:** 2026-06-09T01:10:05.798Z
**Status:** Architecture prepared — no production updates

## Supported request patterns

- "Find more scriptures supporting {topic}." → `parallel_explorer`
- "Show Genesis to Revelation witnesses for {topic}." → `g2r_expansion`
- "Combine {topicA} and {topicB}." → `topic_merge`
- "Find contradictions for {topic}." → `contradiction_search`
- "Build a chain for {topic}." → `chain_builder`

## Sample structured jobs

| Utterance | Job type | Params | Status |
|-----------|----------|--------|--------|
| Find more scriptures supporting Sabbath. | parallel_explorer | {"topic":"sabbath"} | structured |
| Show Genesis to Revelation witnesses for death. | g2r_expansion | {"topic":"death_state"} | structured |
| Combine faith and works. | topic_merge | {"topicA":"faith_works","topicB":"faith_works"} | structured |
| Find contradictions to this claim about dietary law. | contradiction_search | {"topic":"dietary_law"} | structured |
| Expand kingdom from Genesis to Revelation. | g2r_expansion | {"topic":"kingdom"} | structured |
| Build a chain for messiah logos. | chain_builder | {"topic":"messiah_logos"} | structured |

## Job schema

```json
{
  "jobType": "parallel_explorer | g2r_expansion | topic_merge | chain_builder | contradiction_search",
  "params": {
    "topic": "string",
    "topicA": "string",
    "topicB": "string",
    "candidateId": "string",
    "scriptures": []
  },
  "reviewRequired": true,
  "autoApplied": false,
  "productionApplied": false
}
```
