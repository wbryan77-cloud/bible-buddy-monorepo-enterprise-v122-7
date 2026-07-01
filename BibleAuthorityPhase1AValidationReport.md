# Bible Authority Phase 1A Validation Report

**Date:** 2026-06-07  
**Priority:** CRITICAL  
**Push status:** **BLOCKED** — `allPass: false` (no `OPENAI_API_KEY` in environment)

---

## Executive summary

The **authority system** (claim extraction + claim-to-Scripture validator + approval gate) is implemented and passes **offline** validation. **Live OpenAI happy-path validation cannot complete** without an API key. Do not push until live `allPass: true`.

---

## Part A — Happy-path validation results

### Offline fixtures (`node scripts/baeClaimValidatorFixtures.js`)

| Fixture | Support class | Result |
|---------|---------------|--------|
| Third heaven destination drift | D | ✅ PASS |
| Kingdom in heaven drift | D | ✅ PASS |
| Acts 10 pork clean drift | D | ✅ PASS |
| Third heaven good claim | A | ✅ PASS |

**Offline: 4/4 allPass**

### Live regression (`node scripts/baePhase1aRegression.js`)

| Metric | Value |
|--------|-------|
| `OPENAI_API_KEY` | **Not set** |
| Tests passed | **0 / 8** |
| `allPass` | **false** |
| Connection errors | 0 (API unavailable, not network) |
| Claim degraded count | 0 (no live compose) |
| Max OpenAI attempts | 0 |
| Memory delta (offline run) | +79 MB RSS across 8 turns |

### Per-test capture (live fields — blocked on API)

| ID | Question | Retrieval | Live status |
|----|----------|-----------|-------------|
| bae_01 | Third heaven | heavens + threeHeavens + 10 chain refs | ⏳ API blocked |
| bae_02 | Kingdom on earth | kingdom + kingdomComesToEarth | ⏳ |
| bae_03 | When we die | deathState + stateOfTheDead | ⏳ |
| bae_04 | Acts 10 pork | dietaryLaw | ⏳ |
| bae_05 | Sabbath holy | sabbath | ⏳ |
| bae_06 | Logos | messiahLogos | ⏳ |
| bae_07 | Holy mean | thin evidence (no card) | ⏳ |
| bae_08 | Sleep/resurrection | deathState + stateOfTheDead | ⏳ |

Full JSON: `docs/regression-trace/bae-phase1a-results.json`

### Required live fields (captured when API available)

Each test records: `question`, `retrievedEvidence`, `claimsMade`, `supportingScriptures`, `supportClasses`, `unsupportedClaims`, `contradictedClaims`, `validatorResult`, `finalAnswer`, `openaiCalled`, `finalAnswerAuthor`, `memoryBefore`, `memoryAfter`.

---

## Part B — Root authority failures fixed this session

| Root cause | Issue | Fix applied |
|------------|-------|-------------|
| **E** | Validator missed John 3:13 ascension violation | Added `john_3_13_ascension_violation` forbidden rule |
| **E** | Validator missed "cannot come" permanent heaven drift | Added `cannot_come_permanent_heaven` forbidden rule |
| **G** | `death_state` had 0 scripture chain | Wired `TOPIC_TO_CHAIN.death_state → resurrection` |
| **G** | `feasts` had 0 scripture chain | Wired `feasts → feastDays` chain |
| **H** | Resurrection question missed deathState card | Added `resurrection` to deathState message pattern |
| **Render** | BAE trace on by default | `BAE_TRACE` now opt-in (`BAE_TRACE=1` only) |

### Remaining gaps (not doctrine patches)

| Root | Topic | Status |
|------|-------|--------|
| **A** | Standalone `holy` word study | No frozen card — requires denial path or future card (expansion gate) |
| **G** | Logos / messiahLogos | Card refs exist; no scripture chain in catalog — wiring only, no new content |

---

## Part C — Authority order verification

```
Question → retrieval → approved evidence → OpenAI + claims[] → validator → regen (max 1) → final answer
```

| Gate | Implemented | Verified offline |
|------|-------------|------------------|
| Evidence retrieval | ✅ | ✅ 10/12 topics |
| claims[] in compose | ✅ | ⏳ live |
| A/B/C/D classification | ✅ | ✅ fixtures |
| C/D regen | ✅ | ⏳ live |
| Degraded denial phrase | ✅ | ⏳ live |
| Max 1 regen | ✅ | `regenerated` flag + attempt cap |
| No template responders | ✅ | hard cutover |

---

## Part F — Render stability (static)

| Check | Status |
|-------|--------|
| Max one regeneration | ✅ `regenerated` flag; cap flag if >2 attempts |
| `BUDDY_DEBUG=0` | ✅ render.yaml |
| `BUDDY_LIVE_TRACE=0` | ✅ render.yaml |
| `BAE_TRACE` default off | ✅ fixed this session |
| Trace logging opt-in | ✅ `BAE_TRACE=1` |
| Memory (offline 8 tests) | +79 MB — within 2 GB plan |
| Regeneration loops | None in offline path |

---

## Part G — Expansion gate

| Gate | Status |
|------|--------|
| Claim validation passes (offline) | ✅ 4/4 fixtures |
| Claim validation passes (live) | ❌ blocked |
| Unsupported doctrine blocked | ✅ offline drift blocked |
| Render stability | ✅ static checks pass |
| Happy-path OpenAI | ❌ **BLOCKED** |
| IOG ingestion | Admin-review only — not started at scale |

**Do not begin large-scale evidence ingestion until live `allPass: true`.**

---

## Completion command

```bash
export OPENAI_API_KEY=sk-...
node scripts/baeClaimValidatorFixtures.js   # expect 4/4
node scripts/baePhase1aRegression.js        # expect 8/8 allPass
```

**Do not push until `bae-phase1a-results.json` shows `allPass: true`.**
