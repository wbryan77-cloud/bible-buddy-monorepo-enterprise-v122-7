# Missing Stage Report — Sprint 2.14 Release Candidate

**Generated:** 2026-05-31  
**Question:** Are all Sprint 2.14-required files staged?

---

## Executive Summary

| Status | Detail |
|--------|--------|
| **12 verified modules** | All **staged** — but **11 have unstaged 2.14 deltas** |
| **Critical gap** | `scripts/sprint214AcceptanceHttp.js` is **untracked** (not staged) |
| **Commit parity** | Staging area ≠ tested working tree |

**Verdict:** Files are mostly staged, but **Sprint 2.14 fixes are not fully staged**. A commit from the index today would **not** match the code that scored 97.

---

## Verified Module Checklist

| Module | On disk? | Staged? | Unstaged 2.14 delta? | Release-ready? |
|--------|----------|---------|----------------------|----------------|
| `companionDoctrinePresenter.js` | ✅ | ✅ | ⚠️ YES | ❌ re-stage needed |
| `continueStudyIntent.js` | ✅ | ✅ | ⚠️ YES | ❌ re-stage needed |
| `continueStudyEngine.js` | ✅ | ✅ | ⚠️ YES | ❌ re-stage needed |
| `griefCompanionResponse.js` | ✅ | ✅ | ⚠️ YES | ❌ re-stage needed |
| `prayerCompanionResponse.js` | ✅ | ✅ | ⚠️ YES | ❌ re-stage needed |
| `healthCompanionResponse.js` | ✅ | ✅ | ⚠️ YES | ❌ re-stage needed |
| `registryStudyPresenter.js` | ✅ | ✅ | No | ✅ |
| `companionReplyPolish.js` | ✅ | ✅ | ⚠️ YES | ❌ re-stage needed |
| `relationshipRecallEngine.js` | ✅ | ✅ | ⚠️ YES | ❌ re-stage needed |
| `companionLearningLayer.js` | ✅ | ✅ | No | ✅ |
| `companionDeliveryLayer.js` | ✅ | ✅ | No | ✅ |
| `companionNextSteps.js` | ✅ | ✅ | ⚠️ YES | ❌ re-stage needed |

**Also affected (not in checklist but required):**

| Module | Staged? | Unstaged 2.14 delta? |
|--------|---------|----------------------|
| `buddyBrain.js` | ✅ | ⚠️ YES |
| `companionRelationshipOrchestrator.js` | ✅ | ⚠️ YES |

---

## Files Required by Sprint 2.14 NOT Staged At All

| File | Status | Impact |
|------|--------|--------|
| `scripts/sprint214AcceptanceHttp.js` | **UNTRACKED** | 20-test acceptance suite not in commit; post-deploy validation blocked |
| `docs/sprint214/acceptance-results.json` | UNTRACKED | Test output — exclude from commit (OK) |

No **service module** required for runtime is completely absent from staging. The gap is **unstaged deltas** and the **acceptance runner**.

---

## Unstaged Delta Detail (11 services + 1 doc)

These files are staged with a **pre-2.14** version. Working tree has additional fixes:

```
services/buddyBrain.js                        (+7 lines unstaged)
services/companionDoctrinePresenter.js        (+10 lines unstaged)
services/companionNextSteps.js                (+2 lines unstaged)
services/companionRelationshipOrchestrator.js (+7 lines unstaged)
services/companionReplyPolish.js              (+8 lines unstaged)
services/continueStudyEngine.js               (+33 lines unstaged)
services/continueStudyIntent.js               (+20 lines unstaged)
services/griefCompanionResponse.js            (+63 lines unstaged)
services/healthCompanionResponse.js           (+29 lines unstaged)
services/prayerCompanionResponse.js           (+8 lines unstaged)
services/relationshipRecallEngine.js          (+158 lines unstaged)
docs/sprint213/acceptance-results.json        (updated results)
```

**Total unstaged delta:** 260 insertions, 89 deletions across 12 files.

---

## What Must Happen Before Commit

1. `git add` all 11 service files with unstaged 2.14 repairs.
2. `git add scripts/sprint214AcceptanceHttp.js` (and optionally `scripts/sprint2DeployValidation.js`).
3. Do **not** stage `data/*`, report markdown, or acceptance JSON outputs.
4. Re-run `node scripts/sprint214AcceptanceHttp.js` after re-staging to confirm 20/20 at score 97.

---

## Missing From Staging — By Category

| Category | Missing entirely | Staged but outdated |
|----------|------------------|---------------------|
| Memory | — | `relationshipRecallEngine.js`, `buddyBrain.js` |
| Study | — | `continueStudyEngine.js`, `continueStudyIntent.js` |
| Prayer | — | `prayerCompanionResponse.js` |
| Grief | — | `griefCompanionResponse.js`, `buddyBrain.js` |
| Health | — | `healthCompanionResponse.js` |
| Doctrine presentation | — | `companionDoctrinePresenter.js`, `companionReplyPolish.js` |
| History routing | — | (staged version OK) |
| Continue study | — | `continueStudyEngine.js`, `continueStudyIntent.js` |
| Acceptance testing | **`sprint214AcceptanceHttp.js` untracked** | — |
| Organic flow / presence | — | `companionRelationshipOrchestrator.js`, `companionNextSteps.js` |
