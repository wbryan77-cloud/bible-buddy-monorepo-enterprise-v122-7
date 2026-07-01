# Evidence Gap Ranking

**Date:** 2026-06-07  
**Method:** Offline retrieval audit + validator — no new doctrine added  
**Source:** `docs/regression-trace/bae-gap-audit.json`

---

## Ranked gaps (authority impact)

| Rank | Topic | Gap type | Evidence exists? | Retrieved? | Sent? | Validated? | Impact | Fix class |
|------|-------|----------|:----------------:|:----------:|:-----:|:----------:|--------|-----------|
| 1 | **holy** (generic) | No frozen card | ❌ | ❌ | ❌ | ✅ C→denial | High — word study drift | Expansion gate (admin card) |
| 2 | **logos** | No scripture chain | ✅ card | ✅ | ✅ | ✅ | Medium — line-upon-line thin | Graph wiring (catalog chain if approved) |
| 3 | **dietary** | No bindingRules on card | ✅ | ✅ | ✅ | ✅ forbidden rules | Medium | Card metadata (admin) |
| 4 | **sabbath** | No bindingRules on card | ✅ | ✅ | ✅ | ✅ | Medium | Card metadata (admin) |
| 5 | **death_state** | Partial binding | ✅ | ✅ | ✅ | ✅ | Low — catalog wired | Optional binding metadata |

---

## Resolved this phase (no new doctrine)

| Gap | Fix |
|-----|-----|
| Resurrection routing | `resurrection` → deathState card pattern |
| death_state chain empty | `TOPIC_TO_CHAIN.death_state` |
| feasts chain empty | `feasts → feastDays` |
| Citation ≠ support | `claimSupportVerifier.js` |
| Validator misses (no ascended, cannot come) | Forbidden + citation denial rules |

---

## Per-gap trace

### 1. Holy (Rank 1 — BLOCKING for word-study confidence)

| Stage | Status |
|-------|--------|
| Evidence exists | ❌ No generic holy word-study card |
| Retrieved | ❌ |
| Sent to OpenAI | Boundaries only (~3.5 KB) |
| Used by model | Uncontrolled — general training risk |
| Validated | ✅ Class C; requires denial phrase |

**Authority fix without new doctrine:** Thin-evidence policy enforced — unsupported claims → Rejected → denial.

### 2. Logos (Rank 2)

| Stage | Status |
|-------|--------|
| Evidence exists | ✅ messiahLogos card (10 refs) |
| Retrieved | ✅ |
| Sent | ✅ ~9.6 KB pack |
| Chain | ❌ No catalog chain key |
| Validated | ✅ NIV drift + citation rules |

### 3–5. Binding metadata gaps

Cards exist with `bibleFirstConclusion` and refs but limited `bindingRules`. Validator compensates via forbidden patterns + citation denials. **Not blocking push** if live validation passes.

---

## Expansion gate

Do **not** add large evidence libraries until:

1. Live `baePhase1bValidation.js` → `allPass: true`
2. Holy handled via denial (current) or admin-approved thin card (future)
3. Readiness score ≥ 85

**Do not mass-ingest IOG** — see `data/iog-pilot-discovery.json` (3 lesson slots, 0 ingested).
