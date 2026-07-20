# Knowledge Pipeline Analytics — Phase 6E Part 8

Generated: 2026-07-19T09:43:56.925Z

- Dry-run pipeline pass duration: 73ms
- Total source documents: 47
- Total references processed: 910
- Final counts: {"autoApproved":135,"autoRejectedDuplicate":14,"autoRejectedInvalid":3,"unclassifiedNoTopic":226,"needsAdminReview":532}
- Audit log entries: 741
- Audit action counts: {"QUEUE_FOR_ADMIN_REVIEW":532,"PROMOTE_CROSS_REFERENCE":135,"REJECT_CANDIDATE":17,"ADMIN_DECISION":1,"ADMIN_BULK_DECISION":6,"RULES_OPTIMIZER_AUTO_DECISION":50}

> ACTIVE_AS_OF_PHASE_6E — every processed record now carries the full tag-dimension object (services/knowledgeTagStage.js); previously only proposedTopic + a fixed domain string were attached.

> Largest queue depth is ADMIN_REVIEW (475 pending) — expected and by design: services/knowledgeApprovalRulesEngine.js intentionally routes all new IOG/ICOJ topic-relationship candidates to a human rather than ever approving new doctrine automatically. See AdminQueueDiagnostics.md for the reason-code breakdown of that queue.

## Stage Metrics

| Stage | Entered | Passed | Rejected | Errored | Queue Depth |
|---|---|---|---|---|---|
| ACQUIRE | 47 | 47 | 0 | 0 | 0 |
| NORMALIZE | 910 | 910 | 0 | 0 | 0 |
| SCRIPTURE_REFERENCE_VALIDATION | 910 | 907 | 3 | 0 | 0 |
| DEDUPE | 907 | 893 | 14 | 0 | 0 |
| TAG | 893 | 893 | 0 | 0 | 0 |
| RELATIONSHIP_EXTRACTION | 893 | 667 | 226 | 0 | 0 |
| RULES_APPROVAL | 667 | 135 | 0 | 0 | 532 |
| ADMIN_REVIEW | 533 | 1 | 3 | 0 | 475 |
| INDEX | 135 | 135 | 0 | 0 | 0 |
| EVIDENCE_GRAPH | 135 | 135 | 0 | 0 | 0 |
| PRODUCTION | 135 | 135 | 0 | 0 | 0 |
