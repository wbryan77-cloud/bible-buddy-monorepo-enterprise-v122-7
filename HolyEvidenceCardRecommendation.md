# Holy Evidence Card Recommendation

**Status:** ADMIN REVIEW REQUIRED  
**Date:** 2026-06-08  
**Do not implement without admin approval**

---

## Finding

Option **B** confirmed: no approved Evidence Card retrieves for "What does holy mean?"  
Holiness references exist in runtime continuity engines but are **not** wired to `evidenceCards/index.js` retrieval.

---

## Scriptures already approved elsewhere

| Scripture | Existing approved source |
|-----------|-------------------------|
| Leviticus 11:44-45 | `runtimeScriptureHolinessContinuityEngine.holiness_foundation_continuity` |
| Leviticus 19:2 | same |
| Leviticus 20:26 | implied holiness chain (not on frozen card) |
| 1 Peter 1:15-16 | `runtimeScriptureHolinessContinuityEngine`, `runtimeDietaryLawContinuityEngine` |
| Psalm 24:3-4 | holiness_foundation_continuity |
| Isaiah 35:8 | holiness_foundation_continuity |
| Exodus 19:5-6 | covenant_holiness_continuity |
| Hebrews 12:14 | covenant_holiness_continuity |

---

## Proposed card structure (recommendation only)

```javascript
{
  topic: 'holiness',
  cardId: 'holiness',
  approved: true,
  status: 'pending_admin_review', // NOT approved_frozen until review
  questionTypes: ['definition', 'meaning_word_study', 'how_to_live'],
  primaryScriptures: ['Leviticus 19:2', '1 Peter 1:15-16'],
  supportingScriptures: ['Leviticus 11:44-45', 'Psalm 24:3-4', 'Exodus 19:5-6', 'Hebrews 12:14'],
  bindingRules: [], // transcribe from admin-approved registry only
  cautionPassages: [],
  bibleFirstConclusion: 'Derive from admin review of holiness_foundation_continuity references — do not auto-copy runtime engine prose.',
}
```

---

## Proposed retrieval trigger

Add to `MESSAGE_PATTERNS` in `evidenceCards/index.js`:

```javascript
{ cardId: 'holiness', re: /\b(holy|holiness)\b.{0,20}\b(mean|definition)\b|\bwhat does holy mean\b/i }
```

---

## Proposed support edges (after card approval)

| Edge ID | Scriptures | Source |
|---------|------------|--------|
| `lev19_be_holy` | Leviticus 19:2 | holiness card primary |
| `1pet115_be_holy` | 1 Peter 1:15-16 | holiness card primary |
| `lev1144_holy_as_god` | Leviticus 11:44-45 | supporting + continuity engine |

---

## Why not auto-created in Phase 2E

- No frozen `holiness.card.js` exists in `approved_frozen` registry
- Runtime holiness engines are **not** approved Evidence Cards
- Creating card without admin review would add doctrine asset outside frozen process

---

## ADMIN REVIEW REQUIRED

Before implementation:

1. Admin approves scripture list from existing approved references only
2. Admin approves `bibleFirstConclusion` wording
3. Admin adds to `approved-doctrine-registry.json`
4. Regression on holy topic with claim extraction verified
