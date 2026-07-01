# Death / Resurrection Coverage Report

**Phase:** 2H Part C  
**Date:** 2026-06-08

---

## Audit

| Component | Status |
|-----------|--------|
| deathState.card | Unchanged — primary + supporting refs frozen |
| Retrieval trigger | **Fixed** — `died`, `dead`, `state of the dead` added to MESSAGE_PATTERNS |
| stateOfTheDead catalog | Trigger expanded; firstResurrection catalog trigger added |
| Support graph edges | **6 new edges** from deathState.card scriptures |

---

## New support edges (deathState.card only)

| Edge | Scripture | Source field |
|------|-----------|--------------|
| john11_death_as_sleep | John 11:11-14 | primaryScriptures |
| eccl9_dead_know_nothing | Ecclesiastes 9:5 | primaryScriptures |
| psalm146_breath_departeth | Psalm 146:4 | primaryScriptures |
| 1thess4_sleep_until_resurrection | 1 Thessalonians 4:13-16 | primaryScriptures |
| dan12_resurrection_hope | Daniel 12:2 | supportingScriptures |
| 1cor15_resurrection_victory | 1 Corinthians 15:51-55 | supportingScriptures |

---

## Live verification

| Topic | Approval | Class C | Support accuracy |
|-------|----------|---------|------------------|
| death_state | **approved** | 0 | 100% |
| resurrection | degraded | 1 | 86% |

---

## Death/resurrection Class C replay

Total Phase 2G death/resurrection cluster: **12**  
Resolved offline: **7**  
Open: **5** (mostly pastoral Psalm 34:18 / John 11:35 — not on deathState.card)

---

## Remaining gaps

- **Pastoral comfort refs** (Psalm 34:18, John 11:35, Matthew 11:28) — companion stubs, not doctrine cards
- **Resurrection narrative** (Matthew 27-28, John 20) — not on deathState.card primary/supporting lists
