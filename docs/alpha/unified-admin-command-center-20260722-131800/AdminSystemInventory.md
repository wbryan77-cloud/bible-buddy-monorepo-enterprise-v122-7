# Admin System Inventory — Pre-Flight Discovery

Evidence-based map of the existing Admin/Founder architecture, gathered
by direct code inspection before any implementation in this batch. All
systems below are treated as authoritative and are consumed, not
replaced, by the new Unified Admin Command Center.

## 1. Admin Dashboard Page

- **Files:** `admin/bible-authority.html`, `admin/js/bible-authority.js`
- **Served via:** `app.use('/admin', express.static(ADMIN_DIR))` (`server.js:32`)
- **Auth:** page itself is static/public; every data call it makes goes
  through `adminFetch()` (added in a prior batch), which attaches
  `Authorization: Bearer <token>` from `localStorage` key `bb_admin_token`.
- **Current sections (`<section id="...">`):** `executive` (active by
  default), `scripture-review`, `engineering`, `founder`, `intelligence`.
- **Current tabs:** `tab-executive`, `tab-scripture`, `tab-engineering`,
  `tab-founder`, `tab-intelligence`, plus `refreshBtn`.
- **Sub-views inside Scripture Review:** `sub-candidates`, `sub-groups`,
  `sub-coverage`, `sub-readiness`, `sub-packs`, `sub-pending`.
- **Known limitation:** single flat page, no left-nav, no cross-tab
  drill-down links, no search, no unified queue/audit/briefing view.

## 2. Founder Console

- **Service:** `services/founderAdminConsoleStatus.js` — exports
  `getBuildIdentity`, `getProviderHealthSummary`,
  `getPrivacyCapabilityStatus`, `FEATURE_DISPOSITION`,
  `getFounderConsoleStatus`.
- **Route:** `GET /admin/api/bible-authority/founder-console`
  (`routes/bibleAuthorityAdmin.js:419`)
- **Auth:** `checkAdminAuth` (Bearer token)
- **Data shape:** `{ ok, ...getFounderConsoleStatus() }` — build
  identity, provider health, privacy capability status, feature
  disposition matrix.
- **Persistence:** none (computed live from env/git each call).
- **UI location:** `admin/bible-authority.html` → Founder Readiness tab
  (`loadFounderReadiness()` in `bible-authority.js`).

## 3. Command Center

- **Service:** `services/bibleAuthorityAdminCenter.js` — exports
  `getAdminCommandCenter` (composes `buildScriptureAuthorityReview`,
  `buildEngineeringIntelligence`, `buildExecutiveGrowthDashboard`,
  `buildNotificationPlan`).
- **Route:** `GET /admin/api/bible-authority/command-center`
  (`routes/bibleAuthorityAdmin.js:56`); also standalone
  `/scripture-review`, `/engineering`, `/executive` sub-routes.
- **Auth:** `checkAdminAuth`
- **Data shape:** `{ areas: { executiveGrowthDashboard,
  scriptureAuthorityReview, engineeringIntelligence } }`
- **Persistence:** reads existing JSON registries (applied-log, etc.);
  no new writes.
- **UI location:** `load()` in `bible-authority.js`, feeds Executive
  Growth + Scripture Review + Engineering tabs.
- **Known limitation:** ~6s typical latency (documented in a prior
  batch as a performance warning, not a defect).

## 4. Knowledge Coverage

- **Service:** `services/knowledgeAnalyticsSnapshotStore.js` — exports
  `SNAPSHOT_DIR`, `SNAPSHOT_NAMES` (11 named snapshots: BibleBookCoverage,
  DoctrineTopicCoverage, WitnessQualityReport, OriginalLanguageCoverage,
  HistoricalCoverage, HistoricalSourceInvestigation,
  AdminQueueDiagnostics, RulesOptimizerReport, KnowledgePipelineAnalytics,
  KnowledgeDriftReport, FounderKnowledgeReadiness),
  `writeSnapshot`, `readSnapshot`, `readAllSnapshots`.
- **Route:** `GET /admin/api/bible-authority/knowledge-coverage-dashboard`
  (+ `/knowledge-coverage-dashboard/book/:bookName`,
  `/founder-knowledge-readiness`) (`routes/bibleAuthorityAdmin.js:265`)
- **Auth:** `checkAdminAuth`
- **Persistence:** JSON snapshot files under `data/analytics-snapshots/`
  (gitignored — regenerated, not committed).
- **UI location:** Founder Readiness tab, `renderIntelSummary`-adjacent
  code in `bible-authority.js`.
- **Known limitation:** dashboard flags a snapshot stale after 24h
  (`SNAPSHOT_MAX_AGE_MS`) but does not auto-regenerate it.

## 5. Lesson Alignment

- **Service:** `services/lessonScriptureAlignmentAnalyzer.js` — exports
  `MAX_TEXT_LENGTH`, `MAX_REFERENCES_PER_ANALYSIS`, `CLAIM_TYPE`,
  `analyzeLessonText`, `recordLessonAlignmentSubmission`,
  `readLessonAlignmentSubmissions`.
- **Routes:** `POST /lesson-alignment/analyze`,
  `GET /lesson-alignment/limits`, `GET /lesson-alignment/submissions`
  (`routes/bibleAuthorityAdmin.js:363-418`)
- **Auth:** `checkAdminAuth` on all three (documented "Admin/Founder-only
  PASTE-TEXT prototype" in the service's own header comment — currently
  gated behind the Admin token, not separately Founder-accessible).
- **Persistence:** append-only JSONL via `appendJsonlSafe`
  (`safeJsonlWriter.js`) — never promotes into production knowledge.
- **UI location:** Founder Readiness tab, submissions table.
- **Known limitation:** file upload feature-flagged off; paste-text only.

## 6. Founder Intelligence

- **Services:**
  `services/founderOperationalIntelligenceEngine.js` — exports
  `buildKnowledgeContext`, `computeTrendAnalysis`,
  `computeRecurringPatterns`, `resolveCoverageForReference`,
  `matchFreeTextToTopicId`, `humanizeTopicId`,
  `correlateEvidenceForSubmission`,
  `buildFounderOperationalIntelligenceReport`.
  `services/founderIntelligenceRecommendationStore.js` — exports
  `syncRecommendations`, `listRecommendations`, `getRecommendation`,
  `recordAdminDecision`, `readDecisionsLog`, `loadGrowthBaseline`,
  `saveGrowthBaseline`, `trackKnowledgeGrowth`,
  `computeEffectivenessMetrics`.
- **Routes:** `GET /founder-intelligence`,
  `GET /founder-intelligence/recommendations`,
  `POST /founder-intelligence/recommendations/:id/decision`,
  `GET /founder-intelligence/effectiveness`
  (`routes/bibleAuthorityAdmin.js:482-533`)
- **Auth:** `checkAdminAuth`
- **Persistence:** `data/founder-intelligence/{recommendation-index.json,
  decisions.jsonl, growth-baseline.json}` (gitignored, runtime state).
- **UI location:** Founder Intelligence tab.
- **Known limitation:** no `DEFER` status exists (only
  PENDING/APPROVED/REJECTED — `PENDING` already serves that role).

## 7. Runtime Health

- **Service:** `services/runtimeHealthMonitor.js` — exports
  `recordRequestOutcome`, `recordStrictDoctrineBypass`,
  `recordRouteFallback`, `recordContractHandled`, `recordAlphaCapture`,
  `recordAlphaFeedback`, `recordFounderObservation`,
  `setAlphaNotificationQueueCount`, `getRuntimeHealthSnapshot`,
  `getRuntimeHealthHistory({limit})`, `persistSnapshot`,
  `handleMemoryPressure`, `sampleMemory`.
- **Route:** `GET /api/runtime-health` (`routes/runtimeHealth.js:8`,
  mounted at `/api`) — also `GET /api/scripture-provider-health`.
- **Auth:** none — intentionally public (Founder-facing telemetry, no
  secrets).
- **Persistence:** `data/runtime-health.json` (current snapshot),
  `data/runtime-health-history.jsonl` (append-only history, trimmed by
  `trimHealthHistoryFile`).
- **UI location:** Founder Readiness tab (`healthRes` in
  `loadFounderReadiness`).

## 8. Founder Feedback

- **Service:** `services/alphaFeedbackCapture.js` — exports
  `recordFeedback`, `readFeedback({limit, tag})`, `VALID_TAGS`.
- **Routes:** `POST /api/alpha/feedback`, `GET /api/alpha/feedback/tags`
  (`routes/alphaTest.js`, mounted at `/api/alpha` — public, but
  `recordFeedback` internally validates the `testerId` against
  `isActiveAlphaTester`); Admin read side: `GET /admin/api/alpha/feedback`
  (`routes/alphaAdmin.js`, gated by `ALPHA_ADMIN_TOKEN`/`BETA_REVIEW_TOKEN`
  — a **different** token from `BIBLE_AUTHORITY_ADMIN_TOKEN`).
- **Persistence:** JSONL append-only (same family as other capture logs).
- **UI location:** not currently rendered in `bible-authority.html`
  (only referenced indirectly via Founder Intelligence's
  `recurringQuestions`/feedback-by-tag aggregation).

## 9. Founder Observation / Telemetry

- **Location:** `runtimeHealthMonitor.js` → `metrics.observation` object,
  populated by `recordFounderObservation({category, sessionKey, ...})`.
- **Fields:** `witnessRetrievalCount`, `historicalContextUsedCount`,
  `originalLanguageUsedCount`, `prayerUsageCount`,
  `lessonAlignmentUsageCount`, `continuationUsageCount`,
  `questionCategoryCounts`, `categoryTransitionCounts`.
- **Call sites:** `routes/buddy.js` (`recordFounderObservationSafely`),
  `routes/bibleAuthorityAdmin.js` (lesson-alignment usage).
- **Exposed via:** `/api/runtime-health` → `observation` key (public,
  aggregate-only, no raw text/PII).

## 10. Recommendation Engine / Store

Covered in #6 above. Additionally, a **separate, older** review queue
exists:
- **Service:** `services/supportGraphCandidateQueue.js` — exports
  `enqueueSupportGraphCandidate`, `recordCandidateDecision`,
  `readSupportGraphCandidates({limit, status})`,
  `proposeCandidateFromUnverifiedClaim`.
- **Scoring:** `services/knowledgeApprovalRulesEngine.js` — exports
  `evaluateCandidates`, `evaluateCandidate`.
- **Routes:** `GET /review-queue`, `POST /review-queue/bulk/:action`,
  `POST /review-queue/:id/:action` (`routes/bibleAuthorityAdmin.js:95-244`)
- **UI location:** Scripture Authority Review → Pending Candidates
  sub-view.
- This is a **distinct system** from Founder Intelligence
  recommendations — both are surfaced separately in the new Decision
  Queue, tagged by `sourceSystem`, never merged into one store.

## 11. Approval Workflow

- `recordAdminDecision` in `founderIntelligenceRecommendationStore.js`
  (Founder Intelligence) and `recordCandidateDecision` in
  `supportGraphCandidateQueue.js` (review queue) are the two existing,
  independent approval mechanisms. Both already guarantee no automatic
  production mutation — decisions are recorded, not executed.

## 12. Evidence Correlation

- `correlateEvidenceForSubmission` in
  `founderOperationalIntelligenceEngine.js` — scores claims against the
  live topic witness registry; read-only, no writes.

## 13. Lineage

- `routes/buddy.js` returns `primaryWitness`, `supportingWitnesses`,
  `crossReferences`, `coreDebug` on `/buddy/chat` replies (existing,
  unrelated to Admin routes — this is Founder-facing answer lineage, not
  an Admin API; the Command Center references it but does not duplicate
  its computation).

## 14. Audit History

- `appendAuditLog`/`readKnowledgeAuditLog` in
  `services/iogIcojGovernedIngestion.js` — ingestion/knowledge audit log
  only (`data/knowledge-audit-log.jsonl`), exposed via
  `GET /knowledge-audit-log`.
- `readDecisionsLog` in `founderIntelligenceRecommendationStore.js` —
  Founder Intelligence decisions only (`data/founder-intelligence/decisions.jsonl`).
- **No single, unified, cross-system Admin audit trail exists today.**
  This is the gap Part 10 of this batch fills — as an additive layer,
  not a replacement for either existing log.

## 15. Existing Admin Assistant Functionality

- `routes/adminAssistant.js` (mounted at `/admin/assistant`, route itself
  `/assistant` → full path `/admin/assistant/assistant`) →
  `services/adminBrain.js` → `getAdminAnswer(question)`.
- **This is a legacy, pre-Founder-Alpha stub**: hardcoded prompt about
  planning-stage modules (`KJV_CORE`, `THERAPY_HEALTH`, `SERMON_BUILDER`),
  reads from `project-brain/modules.json` etc. (a separate, unrelated
  planning artifact), and has **no authentication** (`checkAdminAuth` is
  never called in `routes/adminAssistant.js`).
- **Decision:** preserved unchanged (per "preserve all currently working
  production routes"). The new AI Chief of Staff (Part 4) is built as a
  distinct, properly authenticated capability inside
  `routes/bibleAuthorityAdmin.js`, grounded in real live Admin data —
  it does not replace, wrap, or call this legacy stub.

## 16. Authentication Middleware

- `checkAdminAuth(req, res)` in `routes/bibleAuthorityAdmin.js:40-54` —
  checks `BIBLE_AUTHORITY_ADMIN_TOKEN || ALPHA_ADMIN_TOKEN ||
  BETA_REVIEW_TOKEN` against `Authorization: Bearer <token>` or
  `?token=`; no-op (open) only when no token is configured.
- Equivalent, independent copies: `routes/alphaAdmin.js:19`
  (`ALPHA_ADMIN_TOKEN || BETA_REVIEW_TOKEN`), `routes/beta.js:20`
  (`BETA_REVIEW_TOKEN` only). These are three separate functions, not
  shared code — a known duplication, out of scope to consolidate in this
  batch (would touch working, verified routes without a required need).

## 17. Token Storage / Request Behavior (Frontend)

- `admin/js/bible-authority.js`: `ADMIN_TOKEN_KEY = 'bb_admin_token'`,
  `getAdminToken()`/`setAdminToken()` (localStorage only),
  `adminFetch(url, options)` (attaches `Authorization: Bearer` header,
  flips a visible "locked" banner on 401). Added in a prior batch;
  preserved and extended (not replaced) in this batch.

## 18. Existing Charts/Tables/Cards/Tabs

See #1 above for the full section/tab list. Executive Growth renders a
metrics grid (`renderExecutive`); Scripture Review renders relationship
groups, topic coverage, implementation readiness, topic packs, and a
pending-candidates table; Engineering renders its own metrics grid;
Founder Readiness renders console/coverage/health/lesson-submission
cards; Founder Intelligence renders summary/trends/recurring/
recommendations/effectiveness.

## 19. Review Queue (Candidate Scoring)

Covered in #10.

## 20. Relationship / Cross-Reference Services

Many exist (`scriptureRelationshipGraph.js`, `verseGraphRelationships.js`,
`approvedSupportGraph.js`, etc.) but the Admin surface already exposes
their output through `buildScriptureAuthorityReview`'s
`relationshipGroups` (Command Center, #3) — the new aggregation layer
reuses that existing composed output rather than querying the raw graph
services a second time.

---

## Full Route Inventory — `routes/bibleAuthorityAdmin.js`

| Method | Path | Auth |
|---|---|---|
| GET | `/command-center` | checkAdminAuth |
| GET | `/scripture-review` | checkAdminAuth |
| GET | `/engineering` | checkAdminAuth |
| GET | `/executive` | checkAdminAuth |
| GET | `/review-queue` | checkAdminAuth |
| POST | `/review-queue/bulk/:action` | checkAdminAuth |
| POST | `/review-queue/:id/:action` | checkAdminAuth |
| GET | `/knowledge-audit-log` | checkAdminAuth |
| GET | `/knowledge-coverage-dashboard` | checkAdminAuth |
| GET | `/knowledge-coverage-dashboard/book/:bookName` | checkAdminAuth |
| GET | `/founder-knowledge-readiness` | checkAdminAuth |
| POST | `/lesson-alignment/analyze` | checkAdminAuth |
| GET | `/lesson-alignment/limits` | checkAdminAuth |
| GET | `/lesson-alignment/submissions` | checkAdminAuth |
| GET | `/founder-console` | checkAdminAuth |
| GET | `/provider-health` | checkAdminAuth |
| GET | `/founder-readiness-report` | checkAdminAuth |
| GET | `/founder-intelligence` | checkAdminAuth |
| GET | `/founder-intelligence/recommendations` | checkAdminAuth |
| POST | `/founder-intelligence/recommendations/:id/decision` | checkAdminAuth |
| GET | `/founder-intelligence/effectiveness` | checkAdminAuth |

All mounted at `/admin/api/bible-authority` (`server.js:140`).
