# Phase 4B Testing Charter

**Date:** 2026-06-10T07:26:30.785Z

Controlled testing categories before production use. Sandbox only.

## TEST CATEGORY 1 — SCRIPTURE RETRIEVAL

**Questions:** Can original, supporting, and parallel scriptures be retrieved? Are all scriptures traceable?

**Metrics:** `retrievalSuccessRate`, `traceabilityRate`

## TEST CATEGORY 2 — GENESIS-TO-REVELATION CONTINUITY

**Questions:** Torah→Prophets→Gospels→Epistles→Revelation connectivity.

**Metrics:** `continuityCoverage`, `continuityConfidence`

## TEST CATEGORY 3 — WITNESS VALIDATION

**Questions:** Multiple witnesses, supporting chains, witness counts.

**Metrics:** `witnessCount`, `supportScore`

## TEST CATEGORY 4 — TRACEABILITY

**Questions:** Every answer cites corpus sources; every scripture and chain traces to source material.

**Metrics:** `traceabilityCompleteness`

## TEST CATEGORY 5 — RELATIONSHIP NAVIGATION

**Required paths:**

- Abraham → Isaac → Jacob → Israel → Twelve Tribes → Kingdom → New Jerusalem → 144000
- Peter → Pentecost → Cornelius → Gentiles → Paul
- Kingdom → David → Messiah → Resurrection → Millennium → New Jerusalem

**Metrics:** `navigationSuccessRate`

## TEST CATEGORY 6 — WEAK TOPIC HANDLING

**Questions:** Low-confidence detection, no overstated support, review-needed when thin.

**Metrics:** `weakTopicDetectionRate`

## TEST CATEGORY 7 — CANDIDATE SEPARATION

**Questions:** Observed vs candidate separation; review-only candidates preserved.

**Metrics:** `candidateSeparationRate`

## TEST CATEGORY 8 — HALLUCINATION PREVENTION

**Questions:** No invented scriptures, chains, or sources; missing support labeled.

**Metrics:** `hallucinationRate` — target **0%**

## Constraints

No production deployment. No doctrine approval. Sandbox corpus only.
