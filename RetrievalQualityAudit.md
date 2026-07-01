# Retrieval Quality Audit — Reason-First Evidence Pack

**Method:** Reconstructed evidence via `buildRetrievalEvidencePack()` with fresh userIds per turn (no polluted `active-conversation-state.json`).  
**Artifact:** `docs/reason-first-migration/listening-audit-evidence.json`  
**Validation run:** 2026-06-02, OpenAI available, 20 turns

---

## Executive Summary

| Category | Count (of 20 turns) |
|----------|---------------------|
| Memory hits | **0** |
| Scripture refs retrieved | **4 turns** (Sabbath T1, T5, T7; grief/Alzheimer's topic-only) |
| History chain included | **1 turn** (Sabbath T1 only) |
| History correctly excluded (wording) | **5 turns** (Sabbath T2–4, T6) |
| Understanding/intent classified correctly | ~**16/20** |
| Irrelevant scripture injected | **2 turns** (Sabbath T5, T7 on correction turns) |

**Core finding:** Retrieval layer correctly identifies question *type* in most cases, but **memory is entirely empty** across all validation threads, **scripture refs are often topic-only with zero verses**, and **follow-up turns lose emotional context flags** (grief, health continuity).

---

## Retrieval Hits

### Sabbath historical turn (T1)

- **Scripture:** Full seventh-day Sabbath chain (8 KJV references with themes).
- **History:** Complete Constantine → Laodicea chain, sources, tier `historical_secondary`, focus flags (`asksWhySunday: true`).
- **Understanding:** `historical_evidence` / `historical_answer` — matches user question.
- **Outcome:** Composer produced coherent historical answer using retrieved facts.

### Meta/wording turns (Sabbath T2–4, T6)

- **History exclusion:** `reason: wording_question` — prevents Constantine chain repeat on phrasing questions. **Correct.**
- **Understanding:** `meta_about_previous_answer` / `wording_explanation` with explicit `forbiddenDistractions` (Sabbath block, Laodicea repeat, unrelated memories). **Correct intent routing.**

### Discernment thread (Job T1–3)

- **Understanding:** All three turns classified `discernment` / `discernment_conversation`.
- **ForbiddenDistractions:** Sabbath history, Feast Days, doctrine intercept — appropriate guardrails.
- **Companion context:** `discernment: true` on all three.

### Correction turns (Sabbath T5, T7)

- **Understanding:** `correction` / `direct_reanswer`, `isCorrection: true`.
- **T7:** `strictAnswerMode: true` with expanded forbiddenDistractions — retrieval *signals* urgency correctly even though composer failed.

### Grief / health classification (initial turns)

- Grief T1: `topic: grief`, `companionContext.grief: true`.
- Health T1–2: `health` / `companion_support`, `companionContext.health: true`.
- Alzheimer's T3: grief classification when user names grieving who mom was.

---

## Retrieval Misses

### Memory — universal miss (20/20 turns)

| Expected | Actual |
|----------|--------|
| Job thread: open loop on "job opportunity" | `snippets: []`, `hits: []` |
| Health T2: recall prior knee pain from T1 | No memory snippets; relies on raw conversationHistory text |
| Grief T2: grief continuity | `companionContext.grief: false` on follow-up |
| Alzheimer's thread: caregiver context accumulation | No memory hits across 3 turns |

**Impact:** Reason-first cannot demonstrate "remembering you" — a primary listening signal for companion mode.

### Scripture — topic without content (4 turns)

| Turn | Scripture pack | Issue |
|------|----------------|-------|
| Alzheimer's T3 | `topic: grief`, `references: []` | Grief flagged but no verses for composer to ground in |
| Grief T1 | `topic: grief`, `references: []` | Same |
| Most other turns | `topic: null` | Composer invents citations (Psalm 42, Romans 8:26, Proverbs 3:5-6) from model weights, not retrieval |

**Impact:** "Scripture as foundation" in composer instruction is **honored in prose but not in evidence** for emotional/companion turns.

### Follow-up context drops

| Turn | Problem |
|------|---------|
| Grief T2 | Classified `direct_question` instead of grief — loses `companion_support` routing |
| Alzheimer's T1–2 | `companionContext` all false — Alzheimer's/caregiver not in classifier taxonomy |
| Distant from God T3 | Stays `direct_question` — acceptable, but no accumulated "spiritual dryness" state |

### Active conversation — not populated in fresh replay

All 20 turns show `activeConversation: null` in clean replay. During live migration, persisted state can carry **stale topic/question from other threads** if userIds are reused — a separate contamination risk documented in prior audit notes.

---

## Irrelevant Context

### Sabbath scripture on non-doctrine turns

| Turn | User intent | Scripture injected |
|------|-------------|-------------------|
| Sabbath T5 | "Why are you not answering my question?" (wording frustration) | Full 8-ref Sabbath chain |
| Sabbath T7 | "Are you not listening?" (meta frustration) | Full 8-ref Sabbath chain |

**Cause:** Correction/meta messages still trigger topic detection from thread vocabulary or prior context, re-injecting Sabbath chain into evidence pack despite `forbiddenDistractions` listing "scripture chain dump."

**Impact:** ~2K chars of irrelevant Sabbath refs in system prompt on turns where user explicitly rejects history/doctrine framing — increases template drift risk.

### ForbiddenDistractions as negative evidence only

The pack lists what **not** to include (knee pain memory, grief memory, Feast Days) but those memories were never retrieved anyway — the list is aspirational guardrails, not active filtering of noisy hits.

### Historical chain on Sabbath T1 only — appropriate

No irrelevant history on wording turns (retrieval layer succeeded; composer failed separately).

---

## Missing Context

| Scenario | What should have been retrieved | What composer had |
|----------|--------------------------------|-------------------|
| Health T2 "again today" | Prior knee mention, date/recurrence | Health flag + conversationHistory text only |
| Grief T1 "Wednesday" | Temporal anchor for fresh loss | Generic grief topic, no refs |
| Alzheimer's T1–2 | Caregiver / dementia companion facts | No health/grief flags until T3 |
| Sabbath T2–7 | Prior assistant phrasing ("Roman church" from T1 reply) | Meta understanding yes; **no evidence of actual prior wording** in pack |
| Job T2–3 | Prior constraints (distance, offer timing) | conversationHistory in user payload only — not structured in evidence |

### Meta/wording gap (critical)

For "why did you say Roman church?", the evidence pack correctly sets `wording_explanation` but provides **no fact** such as:

- The exact phrase from the prior assistant reply
- Whether `sabbathHistoryDeepResponder` or system prompt prefers informal ecclesial language
- Whether a doctrine sanitizer rewrites "Roman Catholic Church" → "Roman church"

The composer must guess — and guesses the same plausible-but-wrong rationale every time.

---

## Retrieval vs Listening Score Correlation

| Retrieval quality | Listening outcome |
|-------------------|-------------------|
| Rich history + scripture (Sabbath T1) | 7/10 |
| Correct wording exclusion, empty evidence (Sabbath T2–3) | 5/10 — composer loop, not retrieval |
| Irrelevant scripture on correction (T5, T7) | 7 and 3 — scripture noise did not help T7 |
| Zero memory all threads | Caps emotional continuity at ~5–7 |

**Conclusion:** Retrieval fixes alone will not reach ≥7 listening. The Sabbath wording thread proves **intent routing can be correct while the composer still loops**. Memory and scripture grounding gaps explain flat emotional-thread scores.

---

## Recommendations (audit-only — not implemented)

1. Populate memory snippets for recurring health/discernment open loops.
2. Attach grief/caregiver scripture refs when topic is set, not topic-only stubs.
3. On meta/wording turns, inject **prior assistant quote** as evidence fact.
4. Suppress scripture/history re-injection when `wording_explanation` or `strictAnswerMode` is active.
5. Persist `companionContext.grief/health` across thread follow-ups, not just turn 1.
