# Sabbath Coverage Report

**Date:** 2026-06-08  
**Phase:** 2E Part A

---

## Audit — existing approved evidence

| Asset | Content |
|-------|---------|
| **Card** | `sabbath.card.js` — `approved_frozen` |
| **primaryScriptures** | Genesis 2:2-3, Exodus 20:8-11 |
| **supportingScriptures** | Isaiah 58:13-14, Luke 4:16, Acts 17:2, Hebrews 4:9 |
| **bindingRules** | none on card |
| **cautionPassages** | none |
| **bibleFirstConclusion** | Seventh day Sabbath established at creation and commanded; history secondary |
| **Catalog** | `bibleTopicCatalog.sabbath.scriptureChain` exists but **not** wired to `approvedCatalogEvidence` |

---

## Why claims were Class C (Phase 2D)

| Cause | Detail |
|-------|--------|
| No support graph edges | Card scriptures present; verifier had no affirmation rules |
| No bindingRules on card | binding_rule fallback never triggered |
| No catalog chain | sabbath not in `TOPIC_TO_CATALOG_KEY` |
| Acts 13:42-44 | In `bibleTopicCatalog` only — not on frozen card (not encoded) |

---

## Support edges added (Phase 2E)

| Edge ID | Scriptures | Source |
|---------|------------|--------|
| `gen2_sabbath_rest_established` | Genesis 2:2-3 | primaryScriptures + bibleFirstConclusion |
| `ex20_remember_sabbath` | Exodus 20:8-11 | primaryScriptures |
| `isa58_delight_in_sabbath` | Isaiah 58:13-14 | supportingScriptures |
| `luke4_jesus_sabbath_custom` | Luke 4:16 | supportingScriptures |
| `acts17_sabbath_teaching` | Acts 17:2 | supportingScriptures |
| `heb4_sabbath_rest_remains` | Hebrews 4:9 | supportingScriptures |

No new scriptures. No new doctrine. Patterns transcribed from frozen card fields only.

---

## Metrics

| Metric | Before 2E | After 2E |
|--------|-----------|----------|
| Sabbath Class C claims | 9 | **0** |
| Sabbath support accuracy | 0% | **100%** |
| Sabbath approval | degraded | **approved** |
| Support accuracy delta (topic) | — | **+100pp** |

---

## Live regression sample matches

| Claim | Edge |
|-------|------|
| God rested on seventh day, blessed it | `gen2_sabbath_rest_established` |
| Remember Sabbath, keep holy, cease work | `ex20_remember_sabbath` |
| Delight in Sabbath, turn from pleasure | `isa58_delight_in_sabbath` |
| Jesus' habit of Sabbath worship | `luke4_jesus_sabbath_custom` |
| Early believers gathering on Sabbath | `acts17_sabbath_teaching` |
| Sabbath rest remaining for God's people | `heb4_sabbath_rest_remains` |
