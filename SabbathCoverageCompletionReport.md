# Sabbath Coverage Completion Report

**Phase:** 2H Part A  
**Date:** 2026-06-08

---

## Scope

Sabbath Class C from Phase 2G stress test: **34** claims.  
Post-2H offline replay: **27 resolved**, **7 open**.

Live regression (`How do we keep the Sabbath holy?`): **0 Class C** (was multiple Isaiah 58 + Acts 17 failures).

---

## Implemented (existing sabbath.card evidence only)

| Edge / change | Source | Claims addressed |
|---------------|--------|------------------|
| Broadened `isa58_delight_in_sabbath` patterns (delighting, own business, holy day, sign) | sabbath.card supportingScriptures | Isaiah 58 phrasing |
| Broadened `acts17_sabbath_teaching` (christians, observed, gathered) | sabbath.card supportingScriptures | Acts 17:2 |
| Broadened `gen2`, `ex20`, `heb4`, `luke4` inflection patterns | sabbath.card primary/supporting | Creation/commandment phrasing |
| `matchSupportGraph` honors `indirectly_supports` | engine fix | chain-class edges |

---

## Per-claim status (Sabbath)

| ID | Scripture | Claim (excerpt) | Status | Gap if open |
|----|-----------|-----------------|--------|-------------|
| CC-001 | Isaiah 58:13-14 | Encourages delighting in the Sabbath and refraining fro… | **RESOLVED** | — |
| CC-002 | Acts 17:2 | Early Christians continued meeting on the Sabbath for t… | **RESOLVED** | — |
| CC-003 | Isaiah 58:13-14 | Isaiah encourages delighting in the Sabbath by calling … | **RESOLVED** | — |
| CC-007 | Isaiah 58:13-14 | Encourages delighting in the Sabbath as the holy day of… | **RESOLVED** | — |
| CC-008 | Isaiah 58:13-14 | Explains holiness as delighting in the Lord and honorin… | **RESOLVED** | — |
| CC-021 | Isaiah 58:13-14 | Calls for delighting in and honoring the Sabbath by tur… | **RESOLVED** | — |
| CC-022 | Genesis 2:2-3; Exodus 20:8-11 | Scripture commands remembering the Sabbath day and keep… | **RESOLVED** | — |
| CC-023 | Isaiah 58:13-14 | Isaiah 58:13-14 encourages delighting in the Sabbath by… | **RESOLVED** | — |
| CC-029 | Exodus 20:8-11 | This is the fourth commandment, explicitly commanding r… | **RESOLVED** | — |
| CC-030 | Isaiah 58:13-14 | These verses describe delighting in the Sabbath and hon… | **RESOLVED** | — |
| CC-031 | Acts 17:2 | The early Christians met on the Sabbath day for teachin… | **RESOLVED** | — |
| CC-038 | Matthew 12:11-12 | Jesus also taught that doing good and helping others, l… | **OPEN** | ref not on sabbath.card |
| CC-042 | Genesis 2:2-3 | Shows the Sabbath was established at creation.… | **RESOLVED** | — |
| CC-043 | Exodus 20:8-11 | Commands the Sabbath as part of the Ten Commandments.… | **RESOLVED** | — |
| CC-044 | Isaiah 58:13-14 | Describes the Sabbath as a delight and lasting sign.… | **RESOLVED** | — |
| CC-045 | Acts 17:2 | Early Christians met on the Sabbath.… | **RESOLVED** | — |
| CC-046 | Isaiah 58:13-14; Hebrews 4:9 | It is described as a lasting sign and rest for God's pe… | **RESOLVED** | — |
| CC-047 | Genesis 2:2-3; Exodus 20:8-11; Isaiah 58:13-14 | The biblical Sabbath is the seventh day, established at… | **RESOLVED** | — |
| CC-048 | — | The Bible does not explicitly command changing the Sabb… | **OPEN** | phrasing |
| CC-049 | Genesis 2:2-3 | Shows the seventh day Sabbath was established at creati… | **RESOLVED** | — |
| CC-050 | Exodus 20:8-11 | The fourth commandment prescribes keeping the seventh d… | **RESOLVED** | — |
| CC-051 | Isaiah 58:13-14 | Describes delighting in the Sabbath as a blessing from … | **RESOLVED** | — |
| CC-052 | Genesis 2:2-3; Exodus 20:8-11 | In fact, the seventh day as Sabbath was established at … | **RESOLVED** | — |
| CC-053 | Isaiah 58:13-14; Luke 4:16 | Throughout the Bible, the Sabbath remains a sign of God… | **RESOLVED** | — |
| CC-054 | Genesis 2:2-3; Exodus 20:8-11 | I focus on Scripture as the foundation for worship prac… | **RESOLVED** | — |
| CC-055 | Acts 17:2 | Early Christians did gather on the first day in some pl… | **RESOLVED** | — |
| CC-063 | Isaiah 58:13-14 | Instructs delighting in the Sabbath and honoring it by … | **RESOLVED** | — |
| CC-064 | Acts 13:42-44 | Early Christians gathered on the Sabbath for hearing th… | **OPEN** | ref not on sabbath.card |
| CC-065 | Isaiah 58:13-14 | Isaiah encourages delighting in the Sabbath by calling … | **RESOLVED** | — |
| CC-066 | Luke 4:16; Acts 13:42-44; Acts 17:2 | Jesus showed example by attending synagogue on the Sabb… | **OPEN** | ref not on sabbath.card |
| CC-067 | Matthew 12:11-12 | Mercy and doing good are permitted on the Sabbath, as J… | **OPEN** | ref not on sabbath.card |
| CC-068 | Leviticus 23:3 | The seventh day is declared a sabbath of rest, a holy c… | **OPEN** | ref not on sabbath.card |
| CC-069 | Genesis 2:2-3 | The scriptures that support resting on the seventh day … | **RESOLVED** | — |
| CC-070 | Leviticus 23:3 | Leviticus 23:3 also designates the seventh day as a sab… | **OPEN** | ref not on sabbath.card |

---

## Remaining gaps (cannot fix without new card refs)

- **Acts 13:42-44**, **Matthew 12:11-12**, **Leviticus 23:3** — not on frozen `sabbath.card` scripture lists
- **CC-048** — doctrine claim with no scripture mapping (ungrounded)
