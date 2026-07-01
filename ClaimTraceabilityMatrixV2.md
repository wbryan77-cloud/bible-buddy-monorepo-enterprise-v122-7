# Claim Traceability Matrix v2

**Date:** 2026-06-08  
**Source:** `docs/regression-trace/claim-traceability-matrix-v2.json`  
**Schema version:** 2

---

## Matrix fields (per claim row)

| Field | Description |
|-------|-------------|
| `claimId` | Stable claim identifier |
| `claim` | Claim text |
| `scriptures` | Scripture refs attached to claim |
| `supportClass` | A / B / C / D |
| `supportReason` | Human-readable support analysis |
| `validatorDecision` | Approved / Rejected |
| `approvalDecision` | approved / degraded (turn-level) |

Additional diagnostic fields: `supportRelationship`, `confidence`, `derivedFrom`, `issues`, `evidenceCardUsed`, `affirmationId`, `citationDenialId`.

---

## Turn summaries

### third_heaven — degraded (70% support)

| Claim (abbreviated) | Scriptures | Class | Validator |
|---------------------|------------|-------|-----------|
| Paul names third heaven in vision | 2 Cor 12:2-4 | A | Approved |
| Firmament / first heaven | Gen 1:6-8 | B | Approved |
| Celestial heaven with lights | Gen 1:14-17 | B | Approved |
| Only Christ ascended | John 3:13 | A | Approved |
| Kingdom on earth | Matt 6:10 | C | Rejected |
| New heaven and earth | Rev 21:1-3 | C | Rejected |
| (sentence duplicates above) | — | A/A/C | mixed |

### kingdom — degraded (75% support)

| Claim (abbreviated) | Scriptures | Class | Validator |
|---------------------|------------|-------|-----------|
| Kingdom to come on earth | Matt 6:9-10 | A | Approved |
| Christ's return to receive followers | John 14:3 | C | Rejected |
| Separation before return | John 13:33 | A | Approved |
| Saints reign on earth | Rev 5:10 | A | Approved |
| Holy city comes to earth | Rev 21:1-3 | A | Approved |
| Matt 6:10 sentence ref | Matt 6:10 | C | Rejected |

### acts_10 — degraded (50% support)

| Claim | Scriptures | Class | Validator |
|-------|------------|-------|-----------|
| Swine unclean (Leviticus) | Lev 11 | A | Approved |
| Swine unclean (Deuteronomy) | Deut 14 | A | Approved |
| Vision about people not food | Acts 10:28 | C | Rejected |
| Vision about Gentiles | Acts 10:28 | C | Rejected |

### pork — degraded (60% support)

| Claim | Scriptures | Class | Validator |
|-------|------------|-------|-----------|
| Swine unclean (Leviticus) | Lev 11 | A | Approved |
| Swine unclean (Deuteronomy) | Deut 14 | A | Approved |
| Vision about people not food | Acts 10:28 | C | Rejected |
| Gentiles not food laws | Acts 11:1-18 | C | Rejected |
| Lev 11:7 / Deut 14:8 detail | Lev 11, Deut 14 | A | Approved |

### sabbath — degraded (0% support)

All 10 claims **class C**. Evidence card `sabbath` retrieved but no claim received A or B affirmation. Refs cited: Gen 2:2-3, Ex 20:8-11, Isa 58:13-14, Luke 4:16, Acts 13:42-44, Acts 17:2, Heb 4:9.

### death_state — approved (100% support)

| Claim | Scriptures | Class | Validator |
|-------|------------|-------|-----------|
| Dead know nothing | Eccl 9:5 | A | Approved |
| Thoughts perish, return to dust | Ps 146:4 | B | Approved |
| Death as sleep | John 11:11-14 | A | Approved |
| Resurrection hope | 1 Thess 4:13-16 | B | Approved |
| Dead resting until resurrection | Eccl 9:5, 1 Thess 4:13-16 | B | Approved |
| Jesus called death sleep | John 11:11-14 | A | Approved |

### resurrection — approved (100% support)

| Claim | Scriptures | Class | Validator |
|-------|------------|-------|-----------|
| Dead know nothing | Eccl 9:5 | B | Approved |
| Resurrection at Christ's coming | 1 Thess 4:13-16 | B | Approved |
| Living soul / breath | Gen 2:7 | B | Approved |
| Death as sleep | John 11:11-14 | A | Approved |
| Awakening from dust | Dan 12:2 | B | Approved |
| Combined passage claim | Eccl 9:5, 1 Thess 4:13-16 | B | Approved |

### logos — degraded (0% support)

All 6 claims **class C** on `messiahLogos` card. John 1:1-14, John 1:1, Genesis 1:1 cited but no frozen affirmation matched.

### holy — degraded (0% support)

| Claim | Scriptures | Class | Validator |
|-------|------------|-------|-----------|
| Called to be holy | Lev 20:26 | C | Rejected |
| Holy in all manner of living | 1 Pet 1:15-16 | C | Rejected |

No evidence pack retrieved (`evidenceCardUsed: null`).

---

## Matrix coverage

| Requirement | Status |
|-------------|--------|
| `claim` on every row | ✅ 57/57 |
| `scriptures` on every row | ✅ 57/57 |
| `supportClass` on every row | ✅ 57/57 |
| `supportReason` on every row | ✅ 57/57 |
| `validatorDecision` on every row | ✅ 57/57 |
| `approvalDecision` on every row | ✅ 57/57 |

Full machine-readable matrix: `docs/regression-trace/claim-traceability-matrix-v2.json`
