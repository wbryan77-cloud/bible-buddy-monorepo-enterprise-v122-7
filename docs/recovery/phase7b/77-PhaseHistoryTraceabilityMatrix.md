# 77 — Phase History Traceability Matrix

**Tip audited:** `5cce42a` (docs) / behavior base `4f9bc62` + Phase 7B repairs (this batch).  
**Method:** Code + probe evidence, not report restatement.

| Prior recommendation | Status | Evidence |
|---|---|---|
| 6X semanticUnderstanding on evidence pack | Implemented and active | `services/semanticUnderstandingSnapshot.js` |
| 6X truth classification / GK clarifier fix | Implemented and active | `UNKNOWN_BIBLE` narrowed; GK paths |
| 6Y historical causation not doctrine stamp | Implemented and active | `historicalCausationAsk.js` |
| 6Z.A companion voice / presence gaps | Partially addressed in 7A/7B | Presence lane; residual template risk |
| 6Z.B wire relationship into care lanes | Implemented and active | Orchestrator + prayer + recall |
| 7A relationshipContextSelector adapter | Implemented; **boundary corrected in 7B** | Persistence removed from selector |
| 7A personalize prayer | Implemented and active | `prayerCompanionEngine` |
| 7A natural remember ack | Implemented and active | Orchestrator early exit |
| 7A person-first recall | Implemented and active | `relationshipSummaryEngine` |
| 7A pray-again not revision | Implemented and active | `responseRevisionOwner` |
| 7A celebration before verse dump | Implemented and active | Orchestrator celebration exit |
| Durable cross-instance memory | **Still unresolved / topology-limited** | File JSON on ephemeral FS |
| Resolved burden lifecycle | **Was unresolved → repaired 7B** | `recentConcern=resolved` |
| Short / no-advice prayer | **Was unresolved → repaired 7B** | `phase7b_prayer_concise` |
| Vague prior prayer confabulation | **Was FAIL → repaired 7B** | Clarifier / stopwords |
| OpenAI prayer path without userId | **Was RISK → repaired 7B** | `openAiFirstCompanionRuntime` passes userId |
| LEARNING_ACK never written for personal remember | Implemented incompletely | Reply fixed; ingest may still create BNC candidate |
| Multi-subject prayer (“dad and son”) | Deferred intentionally | First-subject only |
| Shared durable DB for relationship | Deferred / out of scope | No new DB authorized |

Machine-readable: `fixtures/recommendation-traceability.json`
