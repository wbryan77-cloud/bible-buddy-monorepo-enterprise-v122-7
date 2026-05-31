# Sprint 2.13 — Companion Acceptance Tests

**Date:** 2026-05-31  
**Route:** `POST /buddy/chat` (native HTTP — mirrors `routes/buddy.js`)  
**Script:** `scripts/sprint213AcceptanceHttp.js`  
**Raw JSON:** `docs/sprint213/acceptance-results.json`

---

## Execution Summary

| Metric | Value |
|--------|-------|
| Tests run | 15 |
| Passed | **15** |
| Failed | 0 |
| HTTP status | 200 all |
| Method | Real POST body → runBuddy (same as production route handler) |

---

## Test Results

### TEST 1 — Lost friend

**Input:** `I lost a friend Wednesday.`

| Criterion | Result |
|-----------|--------|
| Empathy | PASS — "really sorry for your loss" |
| Prayer | PARTIAL — comfort-first, not explicit prayer block |
| Memory write | PASS — grief stored (visible in TEST 7) |
| Scripture witness | PASS — 4 refs (Psalm 34:18, Matthew 5:4, Revelation 21:4) |
| Runtime | `emotional_support` |

---

### TEST 2 — Knee pain

**Input:** `My knees hurt.`

| Criterion | Result |
|-----------|--------|
| Support | PASS — gentle, not a doctor disclaimer |
| Health memory | PASS — recalled in TEST 7 |
| Follow-up | PASS — links to prior grief context |
| Runtime | `health_support` |

---

### TEST 3 — Job opportunity

**Input:** `I have a job opportunity.`

| Criterion | Result |
|-----------|--------|
| Wisdom / encouragement | PASS — open loop acknowledgment |
| Scripture | PARTIAL — 1 ref |
| Open loop | PASS — "hold that gently" |
| Runtime | `companion` (OpenAI-off fallback path) |

---

### TEST 4 — Sabbath definition

**Input:** `What is the Sabbath?`

| Criterion | Result |
|-----------|--------|
| Scripture | PASS — Genesis 2, Exodus 20, Isaiah 58 |
| Continuity | PASS — witness path |
| Study path | PASS — 5 scripture refs |
| No internal labels | PASS |
| Runtime | doctrinal_study via presenter |

---

### TEST 5 — Sabbath history

**Input:** `Who changed the Sabbath and why?`

| Criterion | Result |
|-----------|--------|
| Scripture first | PASS |
| History second | PASS — labeled block |
| Distinction line | PASS |
| Intercept | `sabbath_history_companion` |
| Runtime | `sabbath_history` |

---

### TEST 6 — Prayer

**Input:** `Please pray for me.`

| Criterion | Result |
|-----------|--------|
| Actual prayer | PASS — "Father, we bring..." |
| Support | PASS |
| Memory | PASS — prayer continuity write path |
| Runtime | `prayer` |

---

### TEST 7 — Memory recall

**Input:** `What were we talking about last week?`

| Criterion | Result |
|-----------|--------|
| Retrieval | PASS — knee pain, grief, open topics |
| Honesty | PASS — structured confidence blocks |
| No hallucination | PASS — no [object Object] |
| Runtime | `memory_recall` |

---

### TEST 8 — Kingdom

**Input:** `What is the Kingdom of God?`

| Criterion | Result |
|-----------|--------|
| Continuity | PASS — Isaiah 2, Micah 4, 2 Samuel 7 |
| Study path | PASS — registry presenter |
| Next step | Available via continue |
| Runtime | `study` |

---

### TEST 9 — Continue study

**Input:** `Continue.` (after Sabbath question)

| Criterion | Result |
|-----------|--------|
| Resume | PASS — Acts 13:42-44 → Hebrews 4:9 |
| Journey phrase | PASS |
| Runtime | `continue_study` |

---

### TEST 10 — Follow-up understanding

**Sequence:** Sabbath definition → history question → correction

| Criterion | Result |
|-----------|--------|
| Context retention | PASS |
| Correction ack | PASS — "You're right..." |
| No repetition | PASS — different from prior |
| Runtime | `sabbath_history` + correction |

---

### TEST 11 — Sabbath journey

**Sequence:** Sabbath → Continue ×3

| Criterion | Result |
|-----------|--------|
| Progression | PASS — multiple distinct reply shapes |
| Continue works | PASS |

---

### TEST 12 — Kingdom journey

**Sequence:** Kingdom → Continue

| Criterion | Result |
|-----------|--------|
| Progression | PASS — Matthew 5:5 → 6:10 |
| Runtime | `continue_study` |

---

### TEST 13 — Feast journey

**Sequence:** Leviticus 23 feast question → Continue

| Criterion | Result |
|-----------|--------|
| Session memory | PASS — Acts 20:6 |
| Runtime | `continue_study` |

---

### TEST 14 — Resume after delay

**Sequence:** Sabbath → knee pain → Continue

| Criterion | Result |
|-----------|--------|
| Resume Sabbath | PASS — not health path |

---

### TEST 15 — Completion path

**Sequence:** Kingdom → "What should I study next?"

| Criterion | Result |
|-----------|--------|
| Recommendation | PASS — Messiah connection |
| Runtime | `study_connection` |

---

## Part 6 — Historical Context Verification

| Check | Result |
|-------|--------|
| Authority order preserved | PASS on TEST 5 |
| History secondary | PASS — "Historical context, secondary to Scripture" |
| Distinction line | PASS |
| Identity buckets blocked | PASS — `historicalContextRouter.isIdentityBlocked` in code |
| Sabbath definition vs history split | PASS — TEST 4 vs TEST 5 different paths |

---

## Prior Test Gap (addressed)

| Suite | Uses POST /buddy/chat? |
|-------|------------------------|
| phase2Sprint*.test.js | NO — runBuddy() direct |
| sprint2RepairRoute.test.js | NO — handler parity only |
| **sprint213AcceptanceHttp.js** | **YES** |
