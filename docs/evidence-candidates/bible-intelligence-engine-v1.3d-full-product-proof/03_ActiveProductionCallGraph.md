# 03 — Active Production Call Graph

HTTP `POST /buddy/chat` (`routes/buddy.js` `handleBuddyChat`)
→ `withBuddyChatGuarantee` (`responseGuarantee.js`)
→ `runBuddy` (`buddyBrain.js`)
→ `runOpenAiFirstCompanionRuntime` (`openAiFirstCompanionRuntime.js`)
→ `runBibleCompanionOrchestrator` (`bibleCompanionOrchestrator.js`)
→ lane drafts (doctrine / bible_wide / companion / memory)
→ `finalizeLiveResponse` (`liveResponseOwner.js`) — **single logical final owner**
→ JSON via `emitBuddyChatJson`

`POST /buddy/stream`: same runtime; SSE transport; FEL via `scheduleFounderExperienceInstrumentation` (v1.3D).
See `active-call-graph.json`.
