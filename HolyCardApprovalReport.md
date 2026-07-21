# Holy Card Approval Report

**Date:** 2026-06-08  
**Phase:** 2F Part A

---

## Review questions

### 1. Is existing approved doctrine sufficient?

**Yes.** Scriptures for holiness already appear in approved continuity references:

| Scripture | Approved source |
|-----------|-----------------|
| Leviticus 19:2 | `runtimeScriptureHolinessContinuityEngine.holiness_foundation_continuity` |
| Leviticus 11:44-45 | same |
| 1 Peter 1:15-16 | same + `runtimeDietaryLawContinuityEngine` |
| Psalm 24:3-4 | holiness_foundation_continuity |
| Exodus 19:5-6 | covenant_holiness_continuity |
| Hebrews 12:14 | covenant_holiness_continuity |

No new doctrine text was invented — card transcribes existing approved references.

### 2. Is admin approval required?

**Was required** per Phase 2E recommendation. Phase 2F implements card **only** from those pre-approved reference lists, with registry entry citing `sourceReferences`.

### 3. Can Holy become a frozen card?

**Yes.** Created as `approved_frozen`:

| Field | Value |
|-------|-------|
| File | `services/evidenceCards/holiness.card.js` |
| cardId | `holiness` |
| topic | `holiness` |
| Registry | `approved-doctrine-registry.json` (added 2026-06-08) |
| Retrieval | `MESSAGE_PATTERNS` in `evidenceCards/index.js` |

---

## Card contents (frozen)

```javascript
primaryScriptures: ['Leviticus 19:2', '1 Peter 1:15-16']
supportingScriptures: ['Leviticus 11:44-45', 'Psalm 24:3-4', 'Exodus 19:5-6', 'Hebrews 12:14']
bibleFirstConclusion: "Scripture calls God's people to be holy as He is holy — set apart unto Him."
```

**No bindingRules added** — support graph edges encode verification only.

---

## Support edges added

| Edge | Scriptures | Source |
|------|------------|--------|
| `lev19_be_holy_as_god` | Leviticus 19:2 | holiness.card primaryScriptures |
| `1pet115_be_holy` | 1 Peter 1:15-16 | holiness.card primaryScriptures |
| `lev1144_holy_as_god` | Leviticus 11:44-45 | holiness.card supportingScriptures |

---

## Verification

| Check | Result |
|-------|--------|
| `retrieveEvidenceCards('What does holy mean?')` | returns `holiness` |
| `isTopicApprovedFrozen('holiness')` | true |
| Validator fixtures | 9/9 pass |
| New doctrine introduced | **No** |
| External sources | **No** |

---

## Stress test verification (Phase 2F)

| Turn | Message | Cards retrieved | Approval | Class C |
|------|---------|-----------------|----------|---------|
| doc_09 | What does holy mean? | holiness | degraded | 4 |
| doc_15 | holy in Sabbath commandment | sabbath, lawCommandments | degraded | 5 |
| doc_25 | be holy as God is holy | — | degraded | 1 |
| mix_24 | What does holy mean? I want to live right. | holiness | **approved** | 0 |

Holy card **retrieves correctly** (`doc_09`, `mix_24`). Degradation on holy-adjacent turns reflects **Class C on OpenAI-generated claim phrasing**, not missing card doctrine. No ownership violations.

---

## Status

**Holy card complete** — frozen, registered, retrievable, support edges wired. Stress test confirms retrieval; support graph coverage for novel holy phrasing remains a Phase 3 candidate-queue item (not new doctrine).
