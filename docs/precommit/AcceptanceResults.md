# Pre-Commit Acceptance Results

**Generated:** 2026-05-31  
**Method:** `node scripts/sprint213AcceptanceHttp.js`  
**Route:** Real `POST /buddy/chat` over native HTTP (mirrors `routes/buddy.js` handler)  
**NOT:** helper-only or isolated module calls

---

## Summary

| Metric | Value |
|--------|-------|
| Tests requested (subset) | 9 core + 6 extended = 15 total |
| Passed | **15 / 15** |
| HTTP status | 200 all |
| Internal label leaks | None detected |
| "slow this down together" | None detected |

---

## Required Test Results

### 1. Lost Friend

**Input:** `I lost a friend Wednesday.`  
**Pass:** ✅  
**Runtime:** `emotional_support`  
**Scripture refs:** 4  
**Preview:** *"I'm really sorry for your loss. I'm glad you brought this here — we can take it gently..."*  
**Path:** griefCompanionResponse → finalizeBuddyResponse

---

### 2. Knee Pain

**Input:** `My knees hurt.`  
**Pass:** ✅  
**Runtime:** `health_support`  
**Scripture refs:** 3  
**Preview:** *"I hear you sharing about knee pain. Let's take this gently — I'm not a doctor..."*  
**Path:** healthCompanionResponse → finalizeBuddyResponse

---

### 3. Prayer

**Input:** `Please pray for me.`  
**Pass:** ✅  
**Runtime:** `prayer`  
**Scripture refs:** 3  
**Preview:** *"I'm glad you asked to pray... Father, we bring this need before You..."*  
**Path:** prayerCompanionResponse → savePrayerContinuity

---

### 4. Memory Recall

**Input:** `What were we talking about last week?`  
**Pass:** ✅ (within sequential test userId with prior turns)  
**Runtime:** `memory_recall`  
**Scripture refs:** 0  
**Preview:** *"You mentioned recently that your knee pain has been on your mind... grief after a loss..."*  
**Path:** relationshipRecallEngine → memoryRecallEngine read context  
**Note:** Fresh isolated user returns *"I don't have that conversation stored"* — recall requires prior turns in same userId

---

### 5. Sabbath

**Input:** `What is the Sabbath?`  
**Pass:** ✅  
**Runtime:** `doctrinal_study`  
**Scripture refs:** 5  
**Preview:** *"Let's stay close to the text... Genesis 2:2-3... Exodus 20:8-11... Isaiah 58:13-14"*  
**Path:** doctrine → presentCompanionDoctrine

---

### 6. Sabbath History

**Input:** `Who changed the Sabbath and why?`  
**Pass:** ✅  
**Runtime:** `sabbath_history`  
**Intercept:** `sabbath_history_companion`  
**Scripture refs:** 2  
**Preview:** *"You're asking the historical side now... Scripture first, then history... not the same as a biblical command"*  
**Path:** sabbathIntentRouter → sabbathHistoryCompanion → routeHistoricalContext

---

### 7. Kingdom

**Input:** `What is the Kingdom of God?`  
**Pass:** ✅  
**Runtime:** `study`  
**Scripture refs:** 5  
**Preview:** *"Isaiah 2:1-4... Micah 4:1-5... 2 Samuel 7:12-16... Witness path"*  
**Path:** registryStudyPresenter

---

### 8. Continue Study

**Input:** `Continue.` (after Sabbath question)  
**Pass:** ✅  
**Runtime:** `continue_study`  
**Scripture refs:** 2  
**Preview:** *"Last time we were studying Sabbath through Acts 13:42-44. The next step is Hebrews 4:9."*  
**Path:** continueStudyIntent → continueStudyEngine

---

### 9. Follow-Up Understanding

**Input:** `That was not my question. Who changed it historically?` (after Sabbath + history turns)  
**Pass:** ✅  
**Runtime:** `sabbath_history`  
**Intercept:** `sabbath_history_companion`  
**Preview:** *"You're right — I answered the Sabbath definition again, but you were asking who changed it historically..."*  
**Path:** sabbathIntentRouter correction intent

---

## Raw Results File

`docs/sprint213/acceptance-results.json` (updated 2026-05-31T01:50:26Z)

---

## Test Execution Command

```bash
node scripts/sprint213AcceptanceHttp.js
```

Exit code: **0** (15/15 pass)
