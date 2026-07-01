# Scripture Research & Review Console Report

**Phase:** 2J-P Part A
**Date:** 2026-06-09T01:55:40.377Z

## Unified pipeline

1. Question
2. Discovery
3. Scripture Chain
4. Genesis→Revelation Expansion
5. Witness Analysis
6. Support Score
7. Issue Detection
8. AI Explanation
9. Human Decision

## Console entry points

- `candidateId` — single candidate review
- `question` — lookup by question text
- `topic` — all candidates for topic
- `customResearchRequest` — admin research command

**Candidates in console:** 120

## Sample unified review object

```
Support Score: 97

Strength:
Genesis→Revelation span present. 2 continuity witnesses identified. High support score.

Issue:
Isaiah 9:6, Colossians 1:15-17 — Approved continuity chain has scriptures not present in candidate chain.

Classification:
RETRIEVAL GAP

Confidence:
72%

Recommendation:
Candidate is strong — review for approval.
```

**Candidate:** exp_0005
**Recommended action (advisory):** approve
**Issues:** 1

## Research commands executed

- **Find more witnesses for Sabbath** → `find_witnesses` (structured)
- **Expand this Genesis→Revelation chain** → `unparsed` (needs_manual_mapping)
- **Show me all supporting scriptures** → `show_supporting` (structured)
- **Merge Sabbath and Kingdom topics** → `merge_topics` (structured)
- **Find contradictions** → `unparsed` (needs_manual_mapping)
- **Find caution passages** → `find_caution` (structured)
- **Build strongest chain** → `build_strongest_chain` (structured)
- **Show candidates above 90** → `filter_by_score` (structured)

**Re-run:** `node scripts/runScriptureResearchReviewConsole.js`
