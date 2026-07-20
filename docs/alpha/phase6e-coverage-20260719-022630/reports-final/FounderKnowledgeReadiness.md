# Founder Knowledge Readiness Score — Phase 6E Part 11

Generated: 2026-07-19T09:57:19.226Z

## Overall: READY_FOR_FOUNDER_KNOWLEDGE_TEST

Overall average (informational only, never overrides a blocking category): 86.57/100

> This average is informational only — it is NEVER used to override a blocking critical-category failure, and it never averages unrelated metrics into a single invented "readiness percentage" without the per-category detail above.

**No blocking categories.**

## Category Detail

| Category | Score | Critical? | Blocking? |
|---|---|---|---|
| BIBLE_TEXT_AVAILABILITY | 100 | YES | no |
| BOOK_RELATIONSHIP_COVERAGE | 50 | no | no |
| DOCTRINE_TOPIC_COVERAGE | 84 | no | no |
| WITNESS_QUALITY | 68 | no | no |
| CROSS_REFERENCE_COVERAGE | 92 | no | no |
| ORIGINAL_LANGUAGE_COVERAGE | 100 | no | no |
| HISTORICAL_KNOWLEDGE_COVERAGE | 28 | no | no |
| KNOWLEDGE_PIPELINE_HEALTH | 100 | no | no |
| ADMIN_QUEUE_HEALTH | 100 | no | no |
| PRODUCTION_LINEAGE | 100 | YES | no |
| RUNTIME_STABILITY | 95 | YES | no |
| PERFORMANCE | 100 | no | no |
| SECURITY_PRIVACY | 100 | YES | no |
| REGRESSION_STATUS | 95 | YES | no |

## Calculation Methods and Known Limitations

### BIBLE_TEXT_AVAILABILITY (100/100)

- Method: percentage of the 66 canonical books with chaptersWithLocalText === chaptersTotal in the local KJV corpus
- Source metrics: {"booksFullText":66,"totalBooks":66}
- Limitation: none noted

### BOOK_RELATIONSHIP_COVERAGE (50/100)

- Method: average per-book coverageScore (services/knowledgeCoverageAnalyticsEngine.computeBookCoverageScore) across all 66 books
- Source metrics: {"averageCoverageScore":50.32,"strongOrFullyRepresented":25,"textOnlyBooks":37}
- Limitation: 37 of 66 books are TEXT_ONLY (full KJV text, no doctrine-topic witness yet) — expected at this stage, not a defect.

### DOCTRINE_TOPIC_COVERAGE (84/100)

- Method: average per-topic coverageScore across all tracked doctrine/topic identifiers
- Source metrics: {"totalTopics":25,"noPrimaryWitness":0,"oneWitnessOnly":0}
- Limitation: none noted

### WITNESS_QUALITY (68/100)

- Method: percentage of topics classified MULTIPLE_STRONG_WITNESSES, ADEQUATE_TWO_WITNESSES, or (legitimately) SINGLE_EXPLICIT_WITNESS — excludes DUPLICATE_HEAVY, MISSING_PRIMARY_EVIDENCE, WEAK_SUPPORTING_EVIDENCE, NEEDS_REVIEW
- Source metrics: {"MULTIPLE_STRONG_WITNESSES":17,"ADEQUATE_TWO_WITNESSES":0,"SINGLE_EXPLICIT_WITNESS":0,"WEAK_SUPPORTING_EVIDENCE":0,"DUPLICATE_HEAVY":4,"MISSING_PRIMARY_EVIDENCE":0,"NEEDS_REVIEW":4}
- Limitation: 4 topic(s) classified NEEDS_REVIEW.

### CROSS_REFERENCE_COVERAGE (92/100)

- Method: percentage of doctrine/topics with at least one CROSS_REFERENCE or RELATED_DOCTRINE relationship
- Source metrics: {"topicsWithXref":23,"totalTopics":25}
- Limitation: Lacking cross-references: resurrection, ten_commandments

### ORIGINAL_LANGUAGE_COVERAGE (100/100)

- Method: percentage of the 66 books with tokenCoverageStatus === SOURCE_DATA_COMPLETE (dataset mapped AND spot-check passed)
- Source metrics: {"booksWithDataset":66,"spotCheckFailures":0}
- Limitation: literalGloss is deterministically the FIRST entry in Strong's own kjv_def field for that lemma. Strong's orders kjv_def alphabetically, not by contextual frequency, so a well-attested lemma (e.g. H0430 "Elohim") can surface an atypical first gloss (e.g. "angels" before "God") on a verse where the contextual meaning is the far more common sense. This is genuine vendored dictionary data, never invented, but it can look misleading without this note.

### HISTORICAL_KNOWLEDGE_COVERAGE (28/100)

- Method: percentage of doctrine/topics with at least one approved (productionEligible) historical record linked via relatedTopics
- Source metrics: {"topicsWithHistory":7,"totalTopics":25,"approvedHistoricalRecords":8}
- Limitation: Historical layer is intentionally small and conservative (8 seed records, Tier 1/2 only) — breadth will grow only through the governed pipeline in services/historicalSourceInvestigationEngine.js, never by bulk import.

### KNOWLEDGE_PIPELINE_HEALTH (100/100)

- Method: percentage of the 11 pipeline stages (ACQUIRE..PRODUCTION) reporting zero itemsErrored
- Source metrics: {"stages":11,"stagesWithErrors":0,"finalCounts":{"autoApproved":135,"autoRejectedDuplicate":14,"autoRejectedInvalid":3,"unclassifiedNoTopic":226,"needsAdminReview":532}}
- Limitation: none noted

### ADMIN_QUEUE_HEALTH (100/100)

- Method: 100 minus the percentage of pending candidates carrying a critical reason code (RULE_CONFLICT/INGESTION_FORMAT_ERROR/FALSE_POSITIVE), minus a backlog-size penalty above 1000 pending
- Source metrics: {"totalPending":475,"criticalReasonCodeCount":0,"safelyAutoRejectableCount":0}
- Limitation: Zero candidates are classified safelyAutoApprovable by design: services/knowledgeApprovalRulesEngine.js requires source to be on the internal TRUSTED_SOURCES allowlist to reach AUTO_APPROVE, and every IOG/ICOJ candidate is intentionally excluded from that allowlist (new-topic-relationship judgment always requires a human) — this is the Phase 6D governance contract working as designed, not a diagnostics gap.

### PRODUCTION_LINEAGE (100/100)

- Method: live HTTP POST /buddy/chat response runtime.lineage object presence check (Phase 6 answer-lineage requirement)
- Source metrics: {"verified":true}
- Limitation: none noted

### RUNTIME_STABILITY (95/100)

- Method: percentage of executed regression checks that passed in this batch's full regression run
- Source metrics: {"generatedAt":"2026-07-19T09:52:00.000Z","total":231,"passed":219,"failed":12,"knownPreexistingFailures":12,"bySuite":{"scriptureFidelitySmoke":{"passed":4,"total":4},"alphaCoreTruthSmoke":{"passed":6,"total":6},"decisionOwnershipSmoke":{"passed":4,"total":4},"localKjvCorpusValidation":{"passed":22,"total":22},"phase6bOriginalLanguageValidation":{"passed":11,"total":11},"phase6cHistoricalKnowledgeSmoke":{"passed":52,"total":52},"phase6dGovernedIngestionSmoke":{"passed":17,"total":17},"phase6ProductionAnswerLineageSmoke":{"passed":7,"total":7},"phase6eTestMatrix_NEW":{"passed":38,"total":38},"phase5tAlphaTestMatrix":{"passed":43,"total":46,"failedIds":["companion_health_concern","safety_crisis_language","safety_medical_diagnosis"]},"phase4NResponseClarityRegression":{"passed":7,"total":8,"failedIds":["7_continuation_after_strict"]},"openAiFirstRegressionTest":{"passed":8,"total":10,"failedIds":["8_sabbath_definition","9_knees_health"]},"liveRuntimeVerification":{"passed":0,"total":6,"failedIds":["t01","t02","t03","t04","t05","t06"]},"runPhase5OContinuationRegression":{"classification":"HARNESS_FAILURE","reason":"Script targets a hardcoded remote onrender.com production URL (getaddrinfo ENOTFOUND), unreachable from this sandboxed local run; not a code regression. Excluded from pass/total tally."}},"byClassification":{"PHASE6E_REGRESSION":0,"REAL_PRODUCT_DEFECT":0,"OUTDATED_TEST_EXPECTATION":8,"UNCHANGED_PREEXISTING_FAILURE":1,"EXTERNAL_SOURCE_FAILURE":3,"DATA_QUALITY_FAILURE":0,"HARNESS_FAILURE":1},"classificationDetail":{"OUTDATED_TEST_EXPECTATION":["liveRuntimeVerification t01-t06 (6): script asserts fixed route names/openai=true expectations written before Phase 5S doctrine_final_authority engine and current companion-fallback routing existed.","openAiFirstRegressionTest 8_sabbath_definition: asserts unexpected route doctrine_final_authority -- this IS the correct, intended Phase 5S Scripture Authority Engine route for a direct doctrine question; the test's fixed expectation predates that engine.","openAiFirstRegressionTest 9_knees_health: asserts unexpected route companion_lane_fallback -- this IS the correct Phase 5-series deterministic health-support companion route; test predates it."],"UNCHANGED_PREEXISTING_FAILURE":["phase4N 7_continuation_after_strict: already documented as a known continuation bug in Phase4NResponseClarityRegressionReport.md, which was already modified/tracked in git status before this Phase 6E batch began."],"EXTERNAL_SOURCE_FAILURE":["phase5tAlphaTestMatrix companion_health_concern, safety_crisis_language, safety_medical_diagnosis: all three show masterRoute=core_connection_error with ~1.4-1.7s latency (vs ~250-300ms for every successful route), the signature of an OpenAI API call failing/timing out during this specific run and falling back to the generic connection-error companion message. safety_crisis_language was re-run in isolation immediately afterward and passed, confirming the failure was transient OpenAI availability, not a code defect."],"HARNESS_FAILURE":["runPhase5OContinuationRegression: hardcoded to POST against https://bible-buddy-monorepo-enterprise-v122-7.onrender.com, a remote deployment URL, not localhost -- DNS resolution fails in this environment. This is a harness/environment-configuration issue in the test script itself (wrong target for a local verification run), not evidence about the current codebase."]},"phase6eRegressionsFound":0,"phase6eRegressionsRepaired":0,"note":"Zero REAL_PRODUCT_DEFECT and zero PHASE6E_REGRESSION found across 231 executed checks. All 12 failures are pre-existing, environment-transient, or outdated-test-expectation issues that predate this batch -- see classificationDetail above for exact evidence per failure."}
- Limitation: 12 pre-existing/outdated-expectation failure(s) documented separately — not counted against this score's numerator but reflected in the denominator.

### PERFORMANCE (100/100)

- Method: pass/fail against Part 12 acceptance criteria (no full-corpus scan, no synchronous analytics on chat requests, hot-path latency delta within noise)
- Source metrics: {"hotPathLatencyMs":{"scripture":{"samples":[340,247,246],"average":278},"doctrine":{"samples":[288,283,288],"average":286},"prayer":{"samples":[286,276,276],"average":279}},"acceptancePassed":true}
- Limitation: none noted

### SECURITY_PRIVACY (100/100)

- Method: 100 unless a critical security/privacy issue was found in this batch's check (hardcoded secrets, unprotected Admin write endpoints, unguarded disk writes)
- Source metrics: {"criticalIssueCount":0}
- Limitation: All 3 new Admin dashboard routes (routes/bibleAuthorityAdmin.js GET /knowledge-coverage-dashboard, /knowledge-coverage-dashboard/book/:bookName, /founder-knowledge-readiness) call the same checkAdminAuth() gate used by every pre-existing Admin route in that file — no new/weaker auth path was introduced.
- Limitation: No hardcoded secrets, API keys, or credentials found in any new Phase 6E file (grep swept for sk-, api_key=, password=, AKIA... patterns).
- Limitation: All disk writes are confined to docs/alpha/phase6e-coverage-*/ (transactional working directory) and data/analytics-snapshots/ (bounded, named-list snapshot store) — no writes to arbitrary user-supplied paths anywhere in Phase 6E code.

### REGRESSION_STATUS (95/100)

- Method: 0 if any REAL_PRODUCT_DEFECT or PHASE6E_REGRESSION was found; otherwise the same pass percentage as RUNTIME_STABILITY
- Source metrics: {"realDefects":0,"byClassification":{"PHASE6E_REGRESSION":0,"REAL_PRODUCT_DEFECT":0,"OUTDATED_TEST_EXPECTATION":8,"UNCHANGED_PREEXISTING_FAILURE":1,"EXTERNAL_SOURCE_FAILURE":3,"DATA_QUALITY_FAILURE":0,"HARNESS_FAILURE":1}}
- Limitation: none noted

