# Class C Fix Prioritization

**Date:** 2026-06-08  
**Input:** 27 Class C claims from Phase 2B regression  
**Constraint:** No implementation in Phase 2C — ranking only

---

## Ranking criteria

1. Impact on doctrine correctness  
2. Risk of reintroducing loop/template/responder regressions  
3. Implementation effort  
4. Multi-topic improvement  
5. Preserves OpenAI-as-narrator / BibleBuddy-as-authority split

---

## P0 — Must fix before push

### P0-1: Reference range normalization (Fix type 5)

| Attribute | Value |
|-----------|-------|
| Claims fixed | 3 (#1, #3, #5 — Matthew 6:10) |
| Topics | third_heaven, kingdom |
| Effort | Low — `refInApproved` in `claimToScriptureValidator.js` |
| Doctrine risk | None — graph already contains Matt 6:9-10 |
| Loop/template risk | **Minimal** — pure ref matcher change |
| Multi-topic | Yes — heavens + kingdom |
| Authority model | Unchanged — verifier only |

**Why P0:** Lowest-risk change; immediately unlocks existing `matt6_10_kingdom_on_earth` affirmation for sentence_ref claims that already state kingdom-on-earth correctly.

---

### P0-2: Affirmation rules from frozen dietaryLaw card (Fix type 2)

| Attribute | Value |
|-----------|-------|
| Claims fixed | 4 (#6–9 — Acts 10:28, Acts 11:1-18) |
| Topics | acts_10, pork |
| Source text | `dietaryLaw.card.js` cautionPassages + bibleFirstConclusion |
| Effort | Low — 2 affirmation entries in `claimSupportVerifier.js` |
| Doctrine risk | Low — encodes existing frozen caution language |
| Loop/template risk | **Low** — no new responder; denial rules for pork-clean already exist |
| Multi-topic | Yes — acts_10 + pork |
| Authority model | Strengthens BB proof without changing OpenAI output |

**Rule candidates (from frozen card, not new doctrine):**
- `acts10_28_people_not_food` — Acts 10:28 + claim about Gentiles/people not food
- `acts11_gentile_clarification` — Acts 11:1-18 + Peter explains vision

---

### P0-3: Affirmation rules from frozen kingdom/heavens bindingRules (Fix type 2)

| Attribute | Value |
|-----------|-------|
| Claims fixed | 2 (#2, #4 — John 14:3; optionally #2 Rev 21 if heavens turn) |
| Topics | kingdom, third_heaven |
| Source text | `kingdom.card.js` bindingRules + cautionPassages |
| Effort | Low — 2–3 affirmation entries |
| Doctrine risk | Low — must not affirm "permanent heaven" (denial rules exist) |
| Loop/template risk | Low |
| Multi-topic | Yes |

**Rule candidates:**
- `john14_3_come_again` — John 14:3 + come again / receive (not permanent heaven)
- `rev21_comes_down` — Rev 21:1-3 + new heaven/earth / dwell with men / comes down

---

## P1 — Fix before IOG ingestion

### P1-1: Sabbath affirmation rules + catalog chain (Fix types 2 + 4)

| Attribute | Value |
|-----------|-------|
| Claims fixed | 9–10 (#10–19) |
| Topics | sabbath |
| Source | `sabbath.card.js` primaryScriptures + `bibleTopicCatalog.sabbath` parallelThemes |
| Effort | Medium — affirmations for Gen 2, Ex 20, Isa 58, Luke 4, Acts 17, Heb 4:9 + catalog wiring |
| Doctrine risk | Medium — Hebrews 4:9 semantics need careful affirmation patterns |
| Loop/template risk | **Medium** — sabbath has `sabbathHistoryCompanion` / `doctrineCompanionPath`; must not wire responder |
| Multi-topic | Single topic, highest claim count |
| Authority model | Safe if affirmations only; catalog chain enables class B |

**Additional:** Add Acts 13:42-44 to card `supportingScriptures` (Fix type 3) for claim #14.

---

### P1-2: Holy evidence card + retrieval trigger (Fix type 1)

| Attribute | Value |
|-----------|-------|
| Claims fixed | 2 (#26–27) |
| Topics | holy |
| Effort | Medium — new frozen card asset + `MESSAGE_PATTERNS` entry |
| Doctrine risk | **High** — new topic asset requires admin review |
| Loop/template risk | Low if card is evidence-only |
| Multi-topic | No |
| Authority model | Enables layer 1 retrieval; affirmations still needed after |

**Requires Fix type 9 (admin review)** before merge.

---

### P1-3: Logos affirmation rules (Fix type 2)

| Attribute | Value |
|-----------|-------|
| Claims fixed | 6 (#20–25) |
| Topics | logos |
| Source | `messiahLogos.card.js` primaryScriptures + bibleFirstConclusion |
| Effort | Medium — John 1:1-14, Genesis 1:1 patterns; optional catalog chain |
| Doctrine risk | Medium — Logos/Godhead wording is sensitive |
| Loop/template risk | Low |
| Multi-topic | No |
| Authority model | Safe with card-derived patterns only |

---

## P2 — Later enhancement

### P2-1: Catalog relationship edges for messiahLogos (Fix type 4)

Wire `approvedCatalogChainKey` from existing `jesusInBible` / registry sources. Enables class B chain support without new doctrine.

### P2-2: Concordance expansion for supportingScriptures (Fix type 6)

Expand card refs via concordance index per `BibleLearningEnginePlan.md` Part I. Helps breadth, not core 27-claim gap.

### P2-3: OpenAI instruction tightening (Fix type 7)

Reduce duplicate witness + sentence_ref claims (e.g., Acts 10 stated twice). Cosmetic to approval; does not fix support proof.

### P2-4: IOG pilot (Fix type — defer)

Only after P0+P1 regression shows ≥80% support accuracy on 9-topic matrix.

---

## Prioritization matrix

| Rank | Fix | Bucket | Claims | Risk | Effort | Topics |
|------|-----|--------|--------|------|--------|--------|
| 1 | Reference normalization | P0 | 3 | Minimal | S | 2 |
| 2 | dietaryLaw affirmations | P0 | 4 | Low | S | 2 |
| 3 | kingdom/heavens affirmations | P0 | 2–3 | Low | S | 2 |
| 4 | Sabbath affirmations + catalog | P1 | 10 | Medium | M | 1 |
| 5 | Holy card | P1 | 2 | High | M | 1 |
| 6 | Logos affirmations | P1 | 6 | Medium | M | 1 |
| 7 | Logos catalog chain | P2 | 0–6 | Low | M | 1 |
| 8 | IOG pilot | P2 | — | High | XL | all |

---

## Expected regression impact (if P0 complete)

| Topic | Current support % | After P0 only | After P0+P1 |
|-------|-------------------|---------------|-------------|
| third_heaven | 70% | ~90% | ~100% |
| kingdom | 75% | ~88% | ~100% |
| acts_10 | 50% | 100% | 100% |
| pork | 60% | 100% | 100% |
| sabbath | 0% | 0% | ~90–100% |
| logos | 0% | 0% | ~100% |
| holy | 0% | 0% | ~100% (with card) |
| death_state | 100% | 100% | 100% |
| resurrection | 100% | 100% | 100% |

**Aggregate support accuracy:** 53% → ~65% (P0) → ~85–90% (P0+P1).

---

## Anti-patterns to block in implementation

| Anti-pattern | Safer alternative |
|--------------|-------------------|
| `sabbathHistoryDeepResponder` as answer path | Affirmation rules only |
| Template string in composer | Frozen affirmation in verifier |
| Lower validator threshold to pass C | Encode support from card text |
| Prompt "always cite Acts 10:28" | Verifier affirmation when cited |
| New holy card with prose conclusion field used as reply | Card refs + affirmations only |
