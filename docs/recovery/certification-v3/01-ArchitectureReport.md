# Architecture Report — Certification v3.0

## Authoritative live path (proven)

`POST /buddy/chat` → `routes/buddy.js` → `withBuddyChatGuarantee` → `buddyBrain.runBuddy` → `openAiFirstCompanionRuntime` → `bibleCompanionOrchestrator` → finalize → `liveResponseOwner`

Hard cutover in `buddyBrain` forces OpenAI-first even if env attempts to disable it.

## Ownership intent vs current state

| Concern | Intended single owner | Current state | Drift |
|---|---|---|---|
| Conversation pipeline | openAiFirst + orchestrator | Live path verified | Low on live path |
| Response owner | liveResponseOwner | Present; polish still mutates text | Medium — mutation layer caused H1 |
| Memory / continuation | continuation memory + Phase 5O | Recovered in `7fc7acf`; dual lanes remain | Medium |
| Scripture retrieval | grounded retrieval + authority answer | bible_wide / authority path live | Medium — claim labels not enforced |
| Evidence (IOG/ICOJ) | approved evidence strengthens retrieval | Inventory/pipeline exists; utilization uncertified | High for Stage 8 |

## Architectural drift (evidence-supported)

1. Multiple polish/mutation layers (`formatDirectDoctrineReply`, `polishDoctrineOpener`, `polishFinalReply`) can rewrite already-correct doctrine openers.
2. Dual continuation/conversation handlers still ordered rather than consolidated.
3. `masterBuddyRuntime` remains as shadow/legacy surface in ownership tables.
4. Readiness historically overstated by health/route green; incident freeze corrects that governance failure.

## Simplification recommendation (evidence only)

- Keep one polish owner for doctrine openers; collapse duplicate scrubbers.
- Consolidate continuation ownership after production corpus stays green.
- Do not remove shadow modules until route-ownership assertions prove zero callers.
