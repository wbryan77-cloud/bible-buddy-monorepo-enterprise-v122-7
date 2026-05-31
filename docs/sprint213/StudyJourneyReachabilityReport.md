# Sprint 2.13 — Study Journey Reachability Report

**Date:** 2026-05-31  
**Verification:** POST /buddy/chat HTTP acceptance suite

---

## Part 3 — Study Path Verification

### SABBATH

| Verse / step | In registry/catalog | Reachable via /buddy/chat | HTTP evidence |
|--------------|---------------------|---------------------------|---------------|
| Genesis 2:2–3 | YES sabbath chain | YES | TEST 4 witness |
| Exodus 20:8–11 | YES | YES | TEST 4 |
| Isaiah 58:13–14 | YES | YES | TEST 4 reply |
| Luke 4:16 | YES | YES | doctrine chain |
| Acts 13:42–44 | YES | YES | TEST 9 continue offer |
| Acts 17:2 | YES | catalog | doctrine path |
| Hebrews 4:9 | YES | YES | TEST 9 next step |

**History path:** TEST 5 — `sabbath_history_companion` intercept, Scripture first then historical block.

### FEAST DAYS

| Verse | Reachable | Evidence |
|-------|-----------|----------|
| Exodus 12 | YES | feast_days doctrine / catalog |
| Leviticus 23 | YES | feast intercept term |
| Luke 22 | YES | registry chain |
| Acts 2 | YES | catalog |
| 1 Corinthians 5 | YES | catalog |
| Zechariah 14 | YES | catalog |

**HTTP:** TEST 13 — Feast continue from Acts 20:6.

### DIETARY

| Verse | Reachable | Evidence |
|-------|-----------|----------|
| Leviticus 11 | YES | dietary_law intercept |
| Deuteronomy 14 | YES | sourceGroundedResponder |
| Daniel 1 | YES | source body |
| Acts 10/11 | YES | source body |
| Isaiah 66 | YES | source body |

**HTTP:** Not in 15-test suite; reachable via `runBuddy` doctrine intercept for dietary terms (code path confirmed, not HTTP-run this session).

### RESURRECTION TIMELINE

| Verse | Reachable | Evidence |
|-------|-----------|----------|
| Daniel 9:27 | YES | resurrection_timeline |
| Matthew 12:40 | YES | sourceGroundedResponder |
| Matthew 28 | YES | source body |
| Mark 16 / Luke 24 / John 20 | YES | source body |

**HTTP:** Via doctrine intercept (code confirmed).

### KINGDOM

| Step | Reachable | Evidence |
|------|-----------|----------|
| Genesis / Davidic | YES | registry chain |
| Isaiah 2 | YES | TEST 8 |
| Daniel 2 / 7 | YES | registry |
| Matthew 6:10 | YES | TEST 12 continue next step |
| Acts 3:19–21 | YES | registry |
| Revelation 20 / 21 | YES | registry |

**HTTP:** TEST 8, 12, 15.

### MESSIAH

| Step | Reachable | Evidence |
|------|-----------|----------|
| Genesis 3:15 / 22 | YES | registry messiah chain |
| Passover / Psalm 22 / Isaiah 53 | YES | catalog |
| Daniel 7 | YES | registry |
| Gospels / Hebrews / Revelation | YES | registry chain |

**HTTP:** TEST 15 connects Kingdom → Messiah (study_connection).

---

## Part 4 — Continue Study Verification

| Phrase | Classified | HTTP tested |
|--------|------------|-------------|
| Continue. | YES short continue | TEST 9, 11, 12, 13, 14 |
| Continue study | YES explicit | code pattern |
| Go on | YES | code pattern |
| Next | YES | code pattern |
| What's next | YES study connection | TEST 15 |
| Teach me more | YES | code pattern |
| Keep going | YES | code pattern |

| Behavior | Status | Notes |
|----------|--------|-------|
| Finds active study | PASS | Uses last session topic |
| Resumes correct step | PASS | Acts 13 → Hebrews 4:9 |
| Does not restart | PASS | References last ref |
| Advances progress | **PARTIAL** | Repeated Continue may repeat same next offer until step saved |
| Saves memory | PASS | saveStudySession on doctrine/registry |
| Survives restart | PASS | JSON file persistence |

---

## Journey Progression Tests

| Test | Result | Progression observed |
|------|--------|---------------------|
| TEST 11 Sabbath journey | PASS | Definition → Continue ×3 (continue_study intent) |
| TEST 12 Kingdom journey | PASS | Kingdom → Continue (Matthew 5:5 → 6:10) |
| TEST 13 Feast journey | PASS | Feast question → Continue (Acts 20:6) |
| TEST 14 Resume after switch | PASS | Sabbath → health → Continue resumes Sabbath |
| TEST 15 Completion path | PASS | Kingdom → study next → Messiah connection |

---

## EXISTS BUT NOT REACHABLE

| System | Reason |
|--------|--------|
| `structuredCompanionRuntime` study buttons | Not imported in buddyBrain |
| `runtimeButtonContinuityRouter` | No route mount |
| Study paths via `public/chat.html` | Wrong API route (404) |

---

## Production vs Local

| Environment | Study journey status |
|-------------|---------------------|
| **Local working tree** | Reachable — 15/15 HTTP tests pass |
| **Git HEAD / Render** | **NOT REACHABLE** — no presenter, no continue intercepts, no registry presenter in committed buddyBrain |
