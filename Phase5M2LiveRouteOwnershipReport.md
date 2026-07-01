# Phase 5M.2 Live Route Ownership Report

**Date:** 2026-06-16T23:34:27.210Z

## Route tracing

Every `/buddy/chat` response now logs `[ROUTE_OWNERSHIP]` with:
`detectedIntent`, `detectedConcept`, `selectedEngine`, `selectedTemplate`, `selectedRoute`, `finalResponseOwner`.

Also stored on `reply.runtime.routeOwnership`.

---

## Live prompt traces

### app

| Field | Value |
|-------|-------|
| INPUT | What is this app? |
| INTENT | app_identity |
| ENGINE CHOSEN | companionIdentityEngine |
| TEMPLATE | singleCompanionContract.app_identity |
| DRAFT ROUTE | phase5l_app_identity |
| DRAFT LANE | app_identity |
| REPAIR LANE | app_identity |
| RESPONSE OWNER | liveResponseOwner |
| EXPECTED ENGINE | companionIdentityEngine |
| MATCH | yes |

**FINAL TEXT (preview):**

> BibleBuddy is a Scripture-grounded companion. I'm here to listen, pray with you, help you study the Bible line upon line, and talk through real-life situations with Scripture as the foundation. I'm not here to force you or pressure you. You can ask Bible questions, ask for prayer, talk through somet

**Why actual engine won:** Contract repair lane: app_identity

---

### prayer

| Field | Value |
|-------|-------|
| INPUT | Can you pray with me? |
| INTENT | prayer |
| ENGINE CHOSEN | prayerCompanionEngine |
| TEMPLATE | — |
| DRAFT ROUTE | phase5k_prayer_companion |
| DRAFT LANE | prayer_companion |
| REPAIR LANE | — |
| RESPONSE OWNER | liveResponseOwner |
| EXPECTED ENGINE | prayerCompanionEngine |
| MATCH | yes |

**FINAL TEXT (preview):**

> Yes, I'll pray with you. Father, please steady my heart. Give me wisdom, peace, courage, and gentleness. Help me walk in truth with love and not fear. In Jesus' name, amen. Philippians 4:6-7 and James 1:5 are good Scriptures to hold onto.

**Why actual engine won:** Orchestrator lane: prayer_companion

---

### explain

| Field | Value |
|-------|-------|
| INPUT | How do I explain it to my family? |
| INTENT | practical_guidance |
| ENGINE CHOSEN | practicalWisdomEngine |
| TEMPLATE | singleCompanionContract.practical_wisdom |
| DRAFT ROUTE | phase5l_practical_wisdom_family |
| DRAFT LANE | practical_wisdom |
| REPAIR LANE | practical_wisdom |
| RESPONSE OWNER | liveResponseOwner |
| EXPECTED ENGINE | practicalWisdomEngine |
| MATCH | yes |

**FINAL TEXT (preview):**

> I hear you — you're asking how to say it without sounding harsh. You could say: 'I love you and respect you. I'm not judging anyone. After studying Scripture, I believe God distinguishes clean and unclean foods. Leviticus 11 and Deuteronomy 14 are the passages that led me there, and Acts 10:28 shows

**Why actual engine won:** Contract repair lane: practical_wisdom

---

### nervous

| Field | Value |
|-------|-------|
| INPUT | I'm nervous. |
| INTENT | anxiety_support |
| ENGINE CHOSEN | companionPresenceEngine |
| TEMPLATE | — |
| DRAFT ROUTE | phase5l_presence_nervous |
| DRAFT LANE | anxiety_presence |
| REPAIR LANE | — |
| RESPONSE OWNER | liveResponseOwner |
| EXPECTED ENGINE | companionPresenceEngine |
| MATCH | yes |

**FINAL TEXT (preview):**

> I hear that you're nervous. Pause and breathe for a moment. What's weighing on you most — a conversation, a decision, or something else?

**Why actual engine won:** Orchestrator lane: anxiety_presence

---

### remember

| Field | Value |
|-------|-------|
| INPUT | What do you remember? |
| INTENT | memory_recall |
| ENGINE CHOSEN | relationshipSummaryEngine |
| TEMPLATE | — |
| DRAFT ROUTE | relationship_memory_recall |
| DRAFT LANE | memory_recall |
| REPAIR LANE | — |
| RESPONSE OWNER | liveResponseOwner |
| EXPECTED ENGINE | relationshipSummaryEngine |
| MATCH | yes |

**FINAL TEXT (preview):**

> In this conversation, I remember you prefer direct answers first. I also remember you prefer direct answers with Scripture support.

**Why actual engine won:** Orchestrator lane: memory_recall

---

## Forbidden phrase origins (exact file / function / return)

### "I want to answer from Scripture directly"

- **File:** `services/bibleCompanionOrchestrator.js`
- **Function:** buildClarificationReply
- **Return lines:** 71-78
- **Return statement:** return { reply: 'I want to answer from Scripture directly. Could you tell me a little more — which book, topic, or passage you mean?...', masterRoute: 'bible_companion_clarification' }
- **First caller:** runBibleCompanionOrchestrator when reasoningPlan.answerLane === 'clarification' (line ~1127)

### "Scripture invites us to cast our care upon God"

- **File:** `services/bibleConceptGraph.js`
- **Function:** GRAPH_EXTENSIONS.prayer_comfort.directAnswer (concept graph node)
- **Return lines:** 84-85
- **Return statement:** 'I’m here to pray with you. Scripture invites us to cast our care upon God — Philippians 4:6-7 and 1 Peter 5:7.'
- **First caller:** Returned when bibleWideReasoningEngine / companionResponseBuilder uses getGraphNode('prayer_comfort').directAnswer instead of prayerCompanionEngine

### "Absolutely — staying with Scripture / Absolutely — staying with the Bible text"

- **File:** `services/doctrineFinalAuthorityEngine.js (historical buildActs10FinalAnswer)`
- **Function:** buildActs10FinalAnswer
- **Return lines:** removed in 5M.1; was line 84
- **Return statement:** Historically: `Absolutely — staying with the Bible text: ${exactConclusion}...` — now stripped by singleCompanionContract.polishDoctrineOpener
- **First caller:** strictDoctrineGate / doctrineFinalAuthorityEngine when Acts 10 strict lane wins before contract
- **Current live producer:** No live producer for "Absolutely — staying" in services/*.js. Current pork path: singleCompanionContract.buildPorkContractReply → "No. Staying with Scripture, pork is unclean..." (services/singleCompanionContract.js ~100)

## Ownership summary

| Layer | Role |
|-------|------|
| Orchestrator / engines | Produce **draft** text (`selectedEngine`, `draftRoute`) |
| `liveResponseOwner` | Assigns final `reply` from draft + contract |
| `singleCompanionContract` | Repairs forbidden phrases; may replace draft entirely (`contractRepairLane`) |
| `routes/buddy.js` | Logs `[ROUTE_OWNERSHIP]` on every response |
