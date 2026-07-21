# Corpus Completion Audit

**Phase:** 2J-I Parts B–C
**Date:** 2026-06-08T23:48:50.732Z

## Blind spot breakdown

| Classification | Count | Recoverable? |
|----------------|-------|--------------|
| bad_extraction | 8 | yes — inference fix |
| duplicate_topic | 2 | yes — dedup routing |
| missing_scripture_chain | 2 | yes — chain/graph expansion |
| new_topic | 6 | yes — new evidence card |
| needs_transcript | 0 | partial — licensing |
| future_research | 27 | no — companion layer |

## Coverage impact estimates

| Scenario | Discovery gain | Notes |
|----------|----------------|-------|
| Fix extraction gaps | +8 questions | Keyword/pattern alignment |
| Dedup routing | +2 questions | Rephrasing → existing chains |
| Complete scripture chains | +2 questions | Continuity + graph edges |
| Add new topic cards | +6 questions | Admin-approved cards only |
| Licensed transcripts | +0 questions | IOG/archive extraction |

## Future topic candidates (top 10)

| Topic | Frequency | Coverage impact | Graph gain | Authority gain |
|-------|-----------|-----------------|------------|----------------|
| pastoral_care | 15 | +9.4% | +4 edges | +8 |
| emotional_pastoral | 5 | +3.1% | +3 edges | +7 |
| kingdom | 1 | +0.6% | +0 edges | +2 |
| heavens | 1 | +0.6% | +0 edges | +2 |
| unpardonable_sin | 1 | +0.6% | +1 edges | +3 |
| seal_of_god | 1 | +0.6% | +1 edges | +3 |
| michael_archangel | 1 | +0.6% | +1 edges | +3 |
| faith_works | 1 | +0.6% | +1 edges | +3 |
| fear_of_god | 1 | +0.6% | +1 edges | +3 |
| great_tribulation | 1 | +0.6% | +1 edges | +3 |

## Discovery ceiling

| Metric | Value |
|--------|-------|
| Current coverage (2J-H) | 71.7% |
| Ceiling after fixable gaps | 83% |
| Absolute ceiling (excl. future research) | 83% |
| Recoverable from confidence-0 pool | 18 |
| Future research excluded | 27 |
| Remaining blind spots | 27 |
