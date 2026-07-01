# Approved Support Graph Report

**Date:** 2026-06-08  
**Component:** `services/approvedSupportGraph.js`

---

## Purpose

Convert frozen approved evidence into a reusable **Support Graph** that feeds the Support Relationship Engine. The graph does not speak to users — it only classifies claim-to-scripture support.

---

## Input sources

| Source | Used for |
|--------|----------|
| Evidence Cards | `cardId`, `primaryScriptures`, `supportingScriptures` |
| `bindingRules` | heavens, kingdom cards |
| `cautionPassages` | dietaryLaw, kingdom, heavens |
| `bibleFirstConclusion` | dietaryLaw affirmations |
| Approved catalog chains | `threeHeavens`, `kingdomComesToEarth` → indirect edges |
| `commonMisreadings` | sunday/sabbath contradiction edge |

---

## Output shape (per edge)

```json
{
  "id": "acts10_28_people_not_food",
  "topic": "dietary_law",
  "cardId": "dietaryLaw",
  "claimPatterns": ["..."],
  "refPatterns": ["..."],
  "supportType": "directly_affirms",
  "scriptures": ["Acts 10:28"],
  "relationship": "direct",
  "confidence": "high",
  "source": "dietaryLaw.card cautionPassages",
  "approved": true
}
```

### Support types

| Type | Class | Meaning |
|------|-------|---------|
| `directly_affirms` | A | Citation explicitly supports claim |
| `indirectly_supports` | B | Catalog teaching-order chain |
| `cautions_against` | C | Related but limited |
| `limits_claim` | C/D | Claim stronger than verse allows |
| `contradicts` | D | Violates frozen evidence |
| `scripture_silent` | C | No proof available |

---

## Edge inventory (22 frozen edges)

### dietaryLaw (6)
- `lev11_swine_unclean`
- `acts10_28_people_not_food`
- `acts11_gentile_clarification`
- `acts10_14_never_eaten_unclean`
- `acts10_not_pork_clean` (contradicts)
- `lev11_not_pork_clean` (contradicts)

### heavens (5)
- `2cor12_2_names_third_heaven`
- `2cor12_2_not_destination` (limits → D)
- `john3_13_no_ascension`
- `john3_13_not_believer_ascension` (contradicts)
- `2cor5_8_not_immediate_heaven` (contradicts)
- `third_heaven_destination_denial` (contradicts)

### kingdom (6)
- `matt6_10_kingdom_on_earth`
- `matt6_10_not_kingdom_in_heaven` (contradicts)
- `john14_3_come_again`
- `john13_33_cannot_come`
- `john13_33_not_permanent_heaven` (contradicts)
- `rev21_comes_down`
- `rev5_10_reign_earth`

### Tradition guard (2)
- `sunday_replaced_sabbath` (contradicts)
- `heaven_at_death_settled` (contradicts)

---

## Wiring

```
retrievalEvidencePack
  → buildApprovedEvidenceGraph()
      → buildApprovedSupportGraph()
  → verifyCitationSupportsClaim()
      → matchSupportGraph()
  → supportRelationshipEngine
      → supportGraphMatch on output
```

---

## Filtering logic

Edges included for a turn when:

1. `edge.cardId` matches retrieved card, **or**
2. `edge.scriptures` overlap approved refs on retrieved cards (enables Rev 21 on heavens turn)

Catalog chain edges added dynamically from `approvedCatalogEvidence.chains`.

---

## Not in graph (Phase 2E targets)

- Sabbath observance affirmations (card exists, edges not yet encoded)
- Logos / messiahLogos affirmations
- Holy topic (no card)
