# Release Candidate Validation — Sprint 2.14

**Generated:** 2026-05-31  
**Runner:** `node scripts/sprint214AcceptanceHttp.js`  
**Target:** Current working tree (release candidate source of truth)  
**Route:** Local HTTP server → `runBuddy()` (mirrors `POST /buddy/chat`)

---

## Result

| Metric | Value |
|--------|-------|
| Tests passed | **20 / 20** |
| Tests failed | 0 |
| Overall acceptance score | **97** |
| All categories ≥ 95 | **YES** |

---

## Scorecard (matches Sprint 2.14 baseline)

| Category | Score | Target | Status |
|----------|------:|-------:|--------|
| Memory | 96 | 95+ | ✅ |
| Warmth | 100 | 95+ | ✅ |
| Scripture Grounding | 97 | 95+ | ✅ |
| Accuracy | 96 | 95+ | ✅ |
| Natural Conversation | 96 | 95+ | ✅ |
| Listening | 97 | 95+ | ✅ |
| Organic Flow | 96 | 95+ | ✅ |
| Follow-Up Understanding | 97 | 95+ | ✅ |
| Continue Study | 97 | 95+ | ✅ |
| Historical Routing | 96 | 95+ | ✅ |
| Companion Presence | 96 | 95+ | ✅ |

**Score confirmed: 97** — same as Sprint 2.14 final report.

---

## Test Results Summary

| # | Test | Status |
|---|------|--------|
| 1 | Lost friend | ✅ PASS |
| 2 | Knee pain | ✅ PASS |
| 3 | Job opportunity | ✅ PASS |
| 4 | Sabbath definition | ✅ PASS |
| 5 | Sabbath history | ✅ PASS |
| 6 | Prayer | ✅ PASS |
| 7 | Memory recall | ✅ PASS |
| 8 | Kingdom | ✅ PASS |
| 9 | Continue study | ✅ PASS |
| 10 | Follow-up understanding | ✅ PASS |
| 11 | Sabbath journey | ✅ PASS |
| 12 | Kingdom journey | ✅ PASS |
| 13 | Feast journey | ✅ PASS |
| 14 | Resume after topic switch | ✅ PASS |
| 15 | Completion / next study | ✅ PASS |
| 16 | Recurring knee pain | ✅ PASS |
| 17 | Grief follow-up | ✅ PASS |
| 18 | Continue journey explanation | ✅ PASS |
| 19 | Focus this week | ✅ PASS |
| 20 | Working on lately | ✅ PASS |

Full JSON: `docs/sprint214/acceptance-results.json`

---

## What Was Validated

The acceptance suite exercised the **working tree** release candidate including:

- Unstaged Sprint 2.14 fixes in 11 service files
- Staged Sprint 2 baseline in 87 files
- Untracked `scripts/sprint214AcceptanceHttp.js`

---

## Staging vs Tested Code Warning

Validation passed against **disk**, not against **git index alone**.

If commit were made from current staging area **without** re-staging the 11 unstaged service files:

| Risk | Impact |
|------|--------|
| Commit ≠ tested code | Score would drop below 97 |
| Grief follow-up (TEST 17) | Would fail — fix unstaged |
| Recurring knee (TEST 16) | Would fail — fix unstaged |
| Continue journey (TEST 18) | Would fail — fix unstaged |
| Relational memory (TEST 7, 19, 20) | Would fail — fix unstaged |

**Re-stage all 11 unstaged service files before commit to preserve score 97.**

---

## Validation Command

```bash
node scripts/sprint214AcceptanceHttp.js
```

Exit code: **0** (success)
