# 04 — Runtime Adapter Patch (BIE Phase 1A)

## Decision

Trace proved drop **before composer** (packet never created). Smallest adapter implemented in the three allowed files only.

## Files changed (ONLY)

| File | Change |
|---|---|
| `services/openAiFirstCompanionRuntime.js` | Add `attachVerifiedLessonPacketToEvidencePack`; call after pack build; export helper |
| `services/evidencePackSlimmer.js` | Pass through `verifiedLessonPacket` |
| `services/reasonFirstComposer.js` | Include packet in non-core evidenceSlice + `userPayload.evidence` |

## Files not changed

Lesson Engine, Study Chain Evaluation, Topic/Support graphs, Historical/OL, Evidence Cards schema, Governance, IOG/ICOJ ingest, prompts (`COMPOSER_INSTRUCTION` text untouched — packet rides existing JSON evidence channel).

## Adapter behavior

```
buildRetrievalEvidencePack(...)
→ attachVerifiedLessonPacketToEvidencePack(pack, message)
    evaluateStudyChain(...)           // call only
    assembleLessonFromStudyChain(...) // call only
    buildVerifiedLessonPacket(...)    // call only
    force openAiMay* / productionActivation / persist = false
→ composeReasonFirstReply(..., coreRestoration:true)
    slimEvidencePackForComposer includes nested packet
    system prompt JSON.stringify includes packet
→ callOpenAI(systemPrompt, userPayload)
```

## Failure mode

Try/catch: attach errors set `verifiedLessonPacket=null` + `verifiedLessonPacketAttach.error` — runtime continues without hard fail.

## Tests

`tests/runtimeVerifiedLessonPacketAdapter.test.js` — 5 passing  
Also: `tests/lessonEngine.test.js` (23), `tests/studyChainEvaluation.test.js` (17) — unchanged / green.

## STOP condition

Not triggered. No additional production file required beyond the three allowed.
