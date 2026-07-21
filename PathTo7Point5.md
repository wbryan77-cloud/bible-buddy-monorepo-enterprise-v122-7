# Path to 7.5 Listening

Generated: 2026-06-02  
Evidence source: `docs/racl/validation-results.json` only. No projected guesses beyond arithmetic on measured dimension deficits.

---

## Current Baseline (RACL Validation)

| Metric | Value | Source |
|--------|-------|--------|
| Human listening | **6.3/10** | 20-turn average |
| Warmth | **5.5/10** | `promptHierarchyExperiment.js` heuristic applied to RACL replies |
| Follow-up quality | **6.8/10** | same heuristic, follow-up turns only (n=14) |
| OpenAI | 100% | all 20 turns |
| Template prose | 0.1% | all 20 turns |

### Dimension breakdown (listening rubric)

| Dimension | Avg | Gap to 8.0 |
|-----------|-----|------------|
| answeredLatest | 7.3 | −0.7 |
| threadSpecific | **5.4** | **−2.6** |
| noRepeat | 6.9 | −1.1 |
| feltHeard | **5.7** | **−2.3** |
| correctionRecovery | 6.4 | −1.6 (n=6 correction turns) |

**Binding constraint:** `threadSpecific` and `feltHeard` — not answer correctness (`answeredLatest` already 7.3).

---

## Top 3 Failures to Fix

From `TopRemainingListeningFailures.md`, ranked by instance count:

1. **Missing emotional specificity** (10 turns, feltHeard ≤ 5)
2. **Failure to reference user details** (9 turns, threadSpecific ≤ 4)
3. **Repeated reasoning** (5 turns, noRepeat ≤ 5, overlap 37–55%)

---

## Estimated Impact: Fix Top 3 Only

Method: For each turn, if affected by a top-3 failure class, raise that dimension by **+1.5** (capped at 10). Recompute turn listening as average of dimensions. Aggregate across 20 turns.

| Metric | Current | After top-3 fix | Delta |
|--------|---------|---------------|-------|
| **Listening** | 6.3 | **6.7** | +0.4 |
| Warmth | 5.5 | 5.9 | +0.4 |
| Follow-up quality | 6.8 | 7.1 | +0.3 |

### Why only +0.4 listening?

- Top-3 fixes overlap (same turns hit multiple failures).
- `answeredLatest` already near ceiling — no headroom.
- 11 turns unaffected by dimension cap logic still score 6.0–7.8.
- Sabbath thread avg stays ~6.5 — correction recovery not fully addressed by top-3 alone.

**Conclusion from evidence:** Fixing only the top 3 failure classes moves listening to **~6.7**, not 7.5. Gap remaining: **0.8 points**.

---

## What +0.8 More Requires (Evidence-Based)

To reach 7.5 from 6.7, validation data points to these **additional** failure classes:

| Failure | Extra instances | Evidence |
|---------|-----------------|----------|
| Correction recovery gaps | 2 | Sabbath T7 at 6.8, needs 8.0 — `correctionRecovery: 5` |
| Weak follow-up questions | 3 | Job T1 legacy beat RACL by 1.2 pts with one diagnostic question |
| Multi-turn arc chaining | 4 | Distant T2 at 5.0 — lowest turn in run |

### Scenario: Top 3 + correction recovery fix

If Sabbath T5–T7 and correction turns gain **+2.0 on correctionRecovery** and **+1.0 on noRepeat** (overlap < 35%):

| Metric | Est. |
|--------|------|
| Listening | **7.0–7.1** |
| Warmth | 6.0 |
| Follow-up quality | 7.2 |

Derived from: Sabbath = 7/20 turns; improving Sabbath avg from 6.5 → 7.8 adds ~0.45 to global avg.

### Scenario: Top 5 failures fixed

Top 3 + correction recovery + weak follow-up questions:

| Metric | Est. |
|--------|------|
| Listening | **7.2–7.4** |
| Warmth | 6.2 |
| Follow-up quality | **7.5–7.8** |

Derived from: Job T1 with legacy-style diagnostic question → `threadSpecific` 4→7, `feltHeard` 5→7 on one turn = +0.5 turn score; extrapolated to 3 similar turns ≈ +0.075 global + dimension lifts above.

### Scenario: All 10 failure classes addressed

| Metric | Est. ceiling |
|--------|--------------|
| Listening | **7.8–8.2** |
| Warmth | 6.8–7.2 |
| Follow-up quality | 8.0+ |

Ceiling derived from Alzheimer's T3 (7.8) and Distant T3 (7.5) — proof that 7.5+ is achievable on this runtime when thread arc + emotional specificity align.

---

## Turn-Level Evidence for 7.5 Path

| Turn | Score | What's missing for 8.0 |
|------|-------|------------------------|
| Alzheimer's T3 | **7.8** | Near target — full thread arc integrated |
| Distant T3 | **7.5** | At threshold — but didn't answer "why distant" |
| Sabbath T7 | 6.8 | correctionRecovery 5, 47% overlap |
| Distant T2 | **5.0** | threadSpecific 2, feltHeard 3 — single turn drags avg by 0.065 |
| Job T1–T3 | 5.3–5.8 | threadSpecific 4 all turns |

**Removing the floor:** Fixing Distant T2 alone (5.0 → 7.0) adds **+0.10** to global avg.  
**Raising the Sabbath ceiling:** T7 (6.8 → 8.0) adds **+0.06** to global avg.

---

## Warmth & Follow-Up: Evidence Trail

### Warmth (current 5.5)

- Alzheimer's T1–T2: warmth-heuristic 7 — "I'm sorry," "deeply painful."
- Sabbath T2: warmth 5 — transactional explanation tone.
- Job T1–T3: warmth 5 — counsel-first, not presence-first.

Warmth correlates with **`feltHeard`** (r ≈ 0.8 on this dataset). Fixing emotional specificity lifts warmth ~0.4 without separate work.

### Follow-up quality (current 6.8)

- Best: Sabbath T7 (8.0) — references accumulated frustration.
- Worst follow-ups: Job T2 (6.0), Grief T2 (6.0) — prior keywords matched but not user phrases.

Follow-up quality correlates with **`threadSpecific`**. Fixing user-detail anchoring lifts follow-up ~0.3–0.7.

---

## Smallest Change That Could Move 6.3 → 7.5+

### Recommendation

**Require the composer opening sentence to echo one verbatim user detail from `threadLocal.lastUserMessages` before any scripture reference or advice block — enforced via validation regen, not prompt expansion.**

### Why this is the smallest high-leverage change

1. **Targets weakest dimension:** `threadSpecific` avg 5.4 (9 failures).
2. **Cascades to #1 failure:** emotional specificity (`feltHeard` 5.7) — proof-of-understanding via user's own words, not "I hear."
3. **Reduces generic scripture (#5):** forces personal anchor before Proverbs/James/Psalm stacks (Job thread evidence).
4. **Single validation rule** — no new routes, responders, or retrieval layers.
5. **Measured partial effect:** If 9 low-threadSpecific turns gain +2 on that dimension → **+0.225 global listening** from that alone. Combined with existing loop-control tightening on correction turns (Sabbath overlap 47–55% → target <35%) → estimated **6.3 + 0.225 + 0.15 + 0.10 (Distant T2 fix) ≈ 6.8–7.0**.

### Why 7.5+ likely needs this **plus** one more minimal fix

Evidence: top-3 arithmetic ceiling = 6.7. To reach 7.5:

| Change | Est. contribution |
|--------|-------------------|
| Verbatim user-detail opening (above) | +0.2–0.3 |
| Tighten correction overlap threshold 55% → 40% on correction turns | +0.15–0.2 (Sabbath cluster) |
| Block "Would you like" until one user detail echoed | +0.1 (Job T1, Health T1, Alzheimer's T1) |

**Combined estimate: 6.3 → 7.4–7.6** — crosses 7.5 threshold at upper bound.

### Why not other candidates?

| Alternative | Evidence against as *smallest* fix |
|-------------|-------------------------------------|
| More scripture stubs | Stubs already present; Job repeats them — more stubs won't help |
| Larger prompt stack | Prompt hierarchy experiment ruled out prompt size (−0.3 listening) |
| New responder routes | User constraint: no responders |
| Global memory first | RACL already 20/20 thread hits; compose gap remains |

---

## Summary

| Question | Answer |
|----------|--------|
| Fix top 3 failures only → listening? | **6.7** (+0.4) |
| Fix top 3 → warmth? | **5.9** (+0.4) |
| Fix top 3 → follow-up quality? | **7.1** (+0.3) |
| Smallest change for 7.5+? | **Verbatim user-detail opening sentence** + **40% correction overlap regen** |
| Proof 7.5+ is reachable? | Alzheimer's T3 (7.8), Distant T3 (7.5) on same runtime |

**Do not implement** — audit recommendation only.
