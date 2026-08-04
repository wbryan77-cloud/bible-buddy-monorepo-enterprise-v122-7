# 01 — Runtime Object Trace (BIE Phase 1A)

**Mode:** Production Integration · Evidence Driven · Trace Only (then minimal adapter)  
**Live path:** `routes/buddy.js` → buddyBrain → `runOpenAiFirstCompanionRuntime`  
**Probe question:** `What does Scripture say about the Sabbath?`

## Pipeline (one production request)

| Stage | Object exists | Type | Size / count | Keys (primary) | Modified | Replaced | Discarded | Merged | Flattened | Survives next |
|---|---|---|---|---|---|---|---|---|---|---|
| User Question | YES | string | ~45 chars | n/a | NO | NO | NO | NO | NO | YES |
| Topic Selection | YES | string on pack | `topic=sabbath` | `topic`, `effectiveTopic` | YES (normalized) | NO | NO | NO | NO | YES |
| Topic Graph | PARTIAL | registry lookup (offline) | N/A in pack | witness registry used only inside adapter study-chain call | NO on pack | NO | Not selected as pack field | NO | NO | Adapter-only use |
| Support Graph | NO on path | candidates JSONL | frozen hash | admin candidates | NO | NO | Not selected | NO | NO | NO (admin-only) |
| Study Chain | YES (post-adapter) | object from `evaluateStudyChain` | ephemeral | `studyChainId`, members, scores | Created in adapter | NO | Not persisted | NO | NO | YES → Lesson |
| Lesson Engine | YES (post-adapter) | lesson object | ephemeral | `lessonId`, `sourceReadingOrder` | Created via `assembleLessonFromStudyChain` | NO | Not persisted | NO | NO | YES → Packet |
| Verified Lesson Packet | YES (post-adapter) | nested object | **~18 032 bytes** (Sabbath probe) | see below | Created; governance locks forced false | NO | NO | Nested on pack | **NO** (hierarchy kept) | YES |
| Runtime Adapter | YES | function attach | n/a | writes `verifiedLessonPacket`, `verifiedLessonPacketAttach` | YES | NO | On error → null packet | NO | NO | YES |
| Evidence Pack | YES | object | large | scripture, evidenceCards, memory, … + packet | Packet keys added | NO | Slimmer drops unused top-level fields later | Packet nested | Slim keeps packet nested | YES |
| Composer | YES | system prompt + user payload | prompt ~41 604 chars | evidence JSON includes packet | YES (stringify) | NO | Non-core slice still includes packet | Into prompt JSON | **NO** for packet | YES → OpenAI |
| OpenAI Payload | YES | messages[] | system + user | `role`, `content` | Packet inside system content JSON | NO | NO | JSON text | Stringified (not schema-flattened) | YES |
| Formatter | YES | polish / guards | reply string | n/a | Reply text only | NO | Packet not in formatter | NO | NO | User sees prose |
| User Response | YES | string | variable | n/a | Post-compose polish | NO | Packet not returned as object | NO | NO | END |

### Packet keys (probe)

`packetVersion`, `question`, `topic`, `lesson`, `passageRoles`, `scriptureBlocks`, `connections`, `balancingPassages`, `clarifyingPassages`, `citations`, `historicalEvidence`, `languageEvidence`, `responseContract`, `prohibitedOverstatements`, `doctrineStatus`, `historyStatus`, `languageStatus`, `governanceStatus`, `provenance`, `composedBy`, `openAiMayApproveEvidence`, `openAiMayDetermineDoctrine`, `productionActivation`, `persist`

### Pre-adapter drop (proven)

Before Phase 1A, after `buildRetrievalEvidencePack` the pack had **no** `verifiedLessonPacket`. Study Chain / Lesson Engine / VLP were never invoked on the live OpenAI-first path. Drop location: **between Evidence Pack build and Composer** — specifically **never created/attached** in `openAiFirstCompanionRuntime.js`.

### Post-adapter survival (proven dry-run)

1. Attach creates nested packet (`attached: true`, 16 passageRoles / scriptureBlocks for Sabbath).  
2. `slimEvidencePackForComposer` preserves full nested packet keys.  
3. `buildComposerSystemPrompt(..., coreRestoration:true)` embeds `verifiedLessonPacket` / `passageRoles` / `responseContract` in system content.  
4. `callOpenAI` sends that system prompt as `messages[0].content`.

## Stage code anchors

| Stage | File | Function |
|---|---|---|
| Evidence pack | `services/retrievalEvidencePack.js` | `buildRetrievalEvidencePack` |
| Adapter attach | `services/openAiFirstCompanionRuntime.js` | `attachVerifiedLessonPacketToEvidencePack` |
| Slim | `services/evidencePackSlimmer.js` | `slimEvidencePackForComposer` |
| Composer prompt | `services/reasonFirstComposer.js` | `buildComposerSystemPrompt` |
| OpenAI call | `services/reasonFirstComposer.js` | `callOpenAI` / `composeReasonFirstReply` |
| Formatter | `services/companionReplyPolish.js` (+ runtime guards) | polish path after compose |
