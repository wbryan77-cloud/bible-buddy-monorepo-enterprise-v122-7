# Phase 5E — BNC Concept Coverage Report

**Date:** 2026-06-14  
**Generated file:** `docs/bible-learning/bible-natural-concordance.generated.json`  
**Entry count:** 28  
**Builder:** `node services/bibleNaturalConcordanceBuilder.js`

## Required Concept Coverage

All 22 required concept IDs are present in the generated BNC:

| Concept ID | Aliases/phrases | Scripture refs | Strict topic | Status |
|------------|-----------------|----------------|--------------|--------|
| dietary_pork_unclean | 8 | 6 | dietary_law | ✅ |
| dietary_clean_unclean | 7 | 3 | dietary_law | ✅ |
| acts_10_people_not_food | 3 | 3 | acts_10 | ✅ |
| fornication_sexual_sin | 8 | 5 | — | ✅ |
| sexual_boundaries_dating | 8 | 3 | — | ✅ |
| marriage_bed | 5 | 3 | — | ✅ |
| onan_seed_context | 7 | 3 | — | ✅ |
| kingdom_on_earth | 8 | 6 | kingdom | ✅ |
| new_jerusalem_comes_down | 2 | 2 | new_jerusalem | ✅ |
| heaven_layers | 4 | 3 | heavens | ✅ |
| third_heaven | 5 | 1 | heavens | ✅ |
| death_state_sleep | 2 | 2 | death_state | ✅ |
| sabbath_seventh_day | 5 | 2 | sabbath | ✅ |
| sabbath_how_to_keep | 7 | 2 | sabbath | ✅ |
| ten_commandments | 4 | 3 | law_commandments | ✅ |
| abomination_desolation | 12 | 5 | — | ✅ |
| millennial_kingdom | 7 | 1 | kingdom | ✅ |
| prayer_with_user | 5 | 2 | — | ✅ |
| overwhelmed_comfort | 6 | 2 | — | ✅ |
| dating_anxiety | 5 | 2 | — | ✅ |
| repentance | 6 | 2 | — | ✅ |
| faith_obedience | 6 | 2 | — | ✅ |

## Typo Coverage (runtime TYPO_MAP + BNC)

| Typo | Maps to |
|------|---------|
| desalation | desolation |
| millium | millennium |
| sed | sex |
| loss her | lose her |
| scriture | scripture |
| saturday / Sat | sabbath seventh day context |

## Forbidden Confusion Guards

Example `abomination_desolation`:
- Forbidden: dietary_law, pork, clean_unclean_food
- Regression confirms no pork/shellfish in abomination answers

Example `kingdom_on_earth`:
- Continuation "more scriptures on that" stays kingdom — does not drift to third_heaven

## Additional BNC Entries (beyond required 22)

6 supplemental entries from asset scan (related concepts, cross-links) — all `needsHumanReview` where doctrinally sensitive.

## Learning Candidates

**File:** `docs/bible-learning/concept-growth-candidates.json`  
**Status:** `pending_review` only — never auto-promoted to approved registry.

Triggered by: "remember that", "put it in your database", "when others ask", correction phrases.

## Memory Bounds

- `topicHistory`: max 8 entries per user
- Growth candidates: bounded append with review status
- BNC generated file: regenerated from scan, not runtime-grown

## Coverage Gaps (low risk)

- Some concepts have fewer than 5 aliases in generated file (rely on graph runtime phrases)
- `third_heaven` and `millennial_kingdom` have fewer scripture refs in BNC (graph carries primary witnesses)
- Original-language chains not in BNC scope (Phase 4 territory)

## Safe for Controlled Deploy

**Yes** — coverage meets acceptance criteria; generated files are non-authoritative.
