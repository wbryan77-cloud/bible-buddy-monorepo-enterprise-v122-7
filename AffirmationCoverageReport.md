# Affirmation Coverage Report

**Date:** 2026-06-08  
**Phase:** 2D

---

## Affirmations added in Phase 2D

| ID | Topic | Scriptures | Source | From card | From catalog |
|----|-------|------------|--------|-----------|--------------|
| `acts10_28_people_not_food` | dietary_law | Acts 10:28 | cautionPassages | ✅ dietaryLaw | — |
| `acts11_gentile_clarification` | dietary_law | Acts 11:1-18 | bibleFirstConclusion | ✅ dietaryLaw | — |
| `acts10_14_never_eaten_unclean` | dietary_law | Acts 10:14 | supportingScriptures | ✅ dietaryLaw | — |
| `john14_3_come_again` | kingdom | John 14:3 | cautionPassages | ✅ kingdom | — |
| `rev21_comes_down` | kingdom | Rev 21:1-3 | bindingRules | ✅ kingdom | ✅ kingdomComesToEarth |
| `rev5_10_reign_earth` | kingdom | Rev 5:10 | bindingRules | ✅ kingdom | ✅ kingdomComesToEarth |
| `matt6_10_kingdom_on_earth` | kingdom | Matt 6:9-10 | bindingRules | ✅ kingdom | ✅ kingdomComesToEarth |
| `john13_33_cannot_come` | kingdom | John 13:33 | bindingRules | ✅ kingdom | ✅ threeHeavens |
| `2cor12_2_names_third_heaven` | heavens | 2 Cor 12:2 | bindingRules | ✅ heavens | ✅ threeHeavens |
| `john3_13_no_ascension` | heavens | John 3:13 | bindingRules | ✅ heavens | ✅ threeHeavens |

### Denial / limit edges (tradition guard)

| ID | Source |
|----|--------|
| `acts10_not_pork_clean` | dietaryLaw cautionPassages |
| `lev11_not_pork_clean` | dietaryLaw bibleFirstConclusion |
| `2cor12_2_not_destination` | heavens bindingRules |
| `matt6_10_not_kingdom_in_heaven` | kingdom bindingRules |
| `john13_33_not_permanent_heaven` | kingdom bindingRules |
| `third_heaven_destination_denial` | heavens bindingRules |
| `2cor5_8_not_immediate_heaven` | heavens cautionScriptures |
| `heaven_at_death_settled` | heavens cautionScriptures |
| `sunday_replaced_sabbath` | sabbath commonMisreadings |
| `john3_13_not_believer_ascension` | heavens bindingRules |

---

## Coverage by topic (live regression)

| Topic | Before 2D | After 2D | Affirmations used |
|-------|-----------|----------|-------------------|
| third_heaven | 70% | **100%** | matt6_10, rev21, 2cor12, john3_13 |
| kingdom | 75% | **100%** | matt6_10, john14_3, john13_33, rev21, rev5_10 |
| acts_10 | 50% | **100%** | acts10_28, lev11 |
| pork | 60% | **100%** | acts10_28, acts11, lev11 |
| death_state | 100% | **100%** | binding_rule + chain |
| resurrection | 100% | **100%** | chain |
| sabbath | 0% | **0%** | none encoded |
| logos | 0% | **0%** | none encoded |
| holy | 0% | N/A (0 claims) | no card |

---

## Source attribution summary

| Source type | Edge count |
|-------------|------------|
| From approved cards (`bindingRules`, `cautionPassages`, `bibleFirstConclusion`) | 22 |
| From approved catalogs (chain edges, dynamic) | varies per turn |
| New doctrine | **0** |
| IOG / external | **0** |

---

## Remaining affirmation gaps

| Topic | Claims still C | Needed |
|-------|----------------|--------|
| Sabbath | 9–10 | Encode from `sabbath.card` primaryScriptures + catalog (Phase 2E) |
| Logos | 6 | Encode from `messiahLogos.card` primaryScriptures (Phase 2E) |
| Holy | 2 | New card + affirmations (admin review) |
