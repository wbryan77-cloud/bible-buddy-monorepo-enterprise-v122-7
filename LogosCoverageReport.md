# Logos Coverage Report

**Date:** 2026-06-08  
**Phase:** 2E Part B

---

## Audit — existing approved evidence

| Asset | Content |
|-------|---------|
| **Card** | `messiahLogos.card.js` — `approved_frozen` |
| **primaryScriptures** | John 1:1-14, Isaiah 9:6, Micah 5:2, Colossians 1:15-17, Hebrews 1:1-3 |
| **supportingScriptures** | Genesis 1:1, Psalm 110:1, Isaiah 53:1-12, Revelation 1:8, Revelation 19:11-16 |
| **bindingRules** | none on card |
| **cautionPassages** | none |
| **bibleFirstConclusion** | Jesus revealed as Word/Logos and Messiah from OT promise through NT witness |
| **Catalog** | none in `approvedCatalogEvidence` |

---

## Why claims were Class C (Phase 2D)

| Cause | Detail |
|-------|--------|
| No support graph edges | Card retrieved; scriptures on-card |
| No affirmations in verifier | Only 22 Phase 2D edges — none for messiahLogos |
| No catalog chain | messiahLogos not in `TOPIC_TO_CATALOG_KEY` |

---

## Support edges added (Phase 2E)

| Edge ID | Scriptures | Source |
|---------|------------|--------|
| `john1_logos_word_deity` | John 1:1-14 | primaryScriptures + bibleFirstConclusion |
| `john1_logos_made_flesh` | John 1:1-14 | primaryScriptures |
| `john1_logos_means_word` | John 1:1-14 | primaryScriptures |
| `gen1_create_by_word` | Genesis 1:1 | supportingScriptures |
| `rev19_word_of_god_name` | Revelation 19:11-16 | supportingScriptures |
| `logos_messiah_ot_witness` | John 1:1-14 | bibleFirstConclusion |

No new scriptures. No new doctrine conclusions.

---

## Metrics

| Metric | Before 2E | After 2E |
|--------|-----------|----------|
| Logos Class C claims | 6 | **0** |
| Logos support accuracy | 0% | **100%** |
| Logos approval | degraded | **approved** |
| Support accuracy delta (topic) | — | **+100pp** |

---

## Live regression sample matches

| Claim | Edge |
|-------|------|
| Logos as Word who was with God and was God | `john1_logos_word_deity` |
| Logos became flesh / incarnate Word | `john1_logos_made_flesh` |
| "Logos" means "Word" | `john1_logos_means_word` |
| God's creative power by word (Genesis 1) | `gen1_create_by_word` |
| Word of God by name (Revelation 19) | `rev19_word_of_god_name` |
| Word became flesh, Messiah from OT | `logos_messiah_ot_witness` |
