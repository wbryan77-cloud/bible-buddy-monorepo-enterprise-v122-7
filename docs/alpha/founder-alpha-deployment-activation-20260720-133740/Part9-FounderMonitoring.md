# Part 9 — Founder Monitoring and Admin Visibility

## 1. Telemetry Inventory

| Signal | Status | Where implemented |
|---|---|---|
| Anonymous/session identifier | **IMPLEMENTED** | `testerId`/`userId` + `sessionId` on every `/buddy/chat` request (`routes/buddy.js`) |
| Session start/end | **PARTIAL** | `runtimeHealthMonitor.recordAlphaCapture()` tracks per-session activity and a same-day session set (`alphaSessionsToday`); there is no explicit "session ended" event — sessions are inferred from activity gaps, not closed explicitly |
| Submitted messages (content) | **PARTIAL** | Not stored verbatim in the aggregate telemetry layer (`runtimeHealthMonitor` never stores message text — only counts). Full conversation transcripts *are* persisted per-tester for the existing Beta/Alpha review console (`routes/beta.js` `listFeedback`/session review, `services/alphaTesterManager.js`-adjacent transcript storage) — this is an existing, pre-Founder-Alpha mechanism, not new telemetry added here |
| Response metadata (route/owner, latency, evidence lineage) | **IMPLEMENTED** | `services/runtimeHealthMonitor.recordRequestOutcome()` (route, latency, ok/error, strictDoctrine, openAiCalled); `services/liveRequestTrace.js` and `coreDebug`/`answerLineage` fields returned in the `/buddy/chat` response body itself |
| Route/owner | **IMPLEMENTED** | `recordRequestOutcome({ route, strictDoctrine, openAiCalled })`; also logged to console as `[ROUTE_OWNERSHIP]` |
| Evidence lineage | **IMPLEMENTED** | `primaryWitness`/`supportingWitnesses`/`crossReferences`/`coreDebug` returned per-response; not separately aggregated into a counter, but present in the same transcript storage referenced above |
| Latency | **IMPLEMENTED** | `averageLatencyMs`/`maxLatencyMs`/`alphaAverageLatency` in `runtimeHealthMonitor` |
| Errors | **IMPLEMENTED** | `metrics.errors`, `recentErrors` (last 20, truncated to 120 chars, no full message body), `recordRouteFallback()` |
| Feature usage (original language, historical context, prayer, lesson alignment, continuation) | **IMPLEMENTED** | `recordFounderObservation()` — Phase 6H Founder Observation Layer — aggregate counters only, no per-user identity or message content |
| Lesson Alignment usage | **IMPLEMENTED** | `observation.lessonAlignmentUsageCount`; individual submissions also persisted for Admin review (`services/lessonScriptureAlignmentAnalyzer.js` `recordLessonAlignmentSubmission`) |
| Original-language usage | **IMPLEMENTED** | `observation.originalLanguageUsedCount` |
| Historical-context usage | **IMPLEMENTED** | `observation.historicalContextUsedCount` |
| Explicit feedback | **IMPLEMENTED** | `POST /api/alpha/feedback` (`routes/alphaTest.js`), `POST /api/beta/feedback` (`routes/beta.js`) — tag + optional free-text, tied to a testerId, readable/aggregatable by Admin (`routes/alphaAdmin.js` tag counts) |
| Admin actions | **NOT_IMPLEMENTED** | No audit log of what an Admin viewed/changed exists (e.g., no "Admin opened command-center at time X" log) |
| Safety events | **PARTIAL** | Doctrine-firewall/response-guarantee clarification fallbacks are counted (`contractClarifiers`, `recentFallbacks`) and are the closest existing signal to a "safety event," but there is no dedicated crisis-escalation or self-harm-flag event log distinct from ordinary fallback counting |

## 2. Admin Visibility of Implemented Signals

Confirmed live (local verification environment) that the Admin interface can already display the
signals above:

- `GET /admin/api/bible-authority/founder-console` — build identity (**includes `build.commit`,
  the actual deployed git SHA** — a stronger build-identity signal than any health-endpoint field;
  see note in §3), feature disposition matrix, and rolled-up readiness data.
- `GET /admin/api/bible-authority/command-center` — aggregate command-center view.
- `GET /api/runtime-health` (consumed by `admin/js/bible-authority.js` `loadFounderReadiness()`) —
  the full `runtimeHealthMonitor` snapshot: latency, errors, memory, and the Founder Observation
  Layer counters.
- `GET /admin/api/bible-authority/lesson-alignment/submissions` — recent Lesson Alignment
  submissions for review.
- `GET /admin/api/bible-authority/knowledge-coverage-dashboard`, `/provider-health`,
  `/review-queue` — knowledge/provider/queue visibility, all pre-existing and confirmed working in
  the Part 2 validator run.
- `admin/bible-authority.html` "Founder Readiness" tab already renders the System Health and
  Founder Observation Layer cards and the Lesson Alignment submissions table (added in Phase 6H,
  reconfirmed present in this batch's source review).

## 3. Admin AI / Digest Functionality

**NOT_IMPLEMENTED** as an automated capability. There is a separate, pre-existing `/api/ai`
router (`admin/ai/routes.js`) with `tester-chat`, `picture-plan`, and an explicitly
comment-labeled-`(future)` `admin-helper` endpoint — this is a parallel "Lab" feature, not wired to
summarize the Founder Alpha telemetry above, and its own source comment marks the admin-helper
piece as not yet built out. **No code claims otherwise.**

What Admin *can* do today without an AI digest layer: view raw counts and recent-item lists
(errors, fallbacks, feedback tags, lesson-alignment submissions, knowledge coverage) directly
through the endpoints in §2, and manually derive patterns (repeated bugs, common question
categories via `observation.questionCategoryCounts`, latency issues via `averageLatencyMs`/
`maxLatencyMs`, feedback classification via existing tag counts in `routes/alphaAdmin.js`). This
is sufficient raw visibility for a 10–20 person Founder cohort; it is not an automated
summarization feature, and this batch does not build one (out of scope — would be a new feature).

## 4. Build Identity — Confirmed Working Mechanism (Supersedes Part 6's Uncertainty)

While Part 6 noted no reliable build-identity field existed and added a `releaseCommit` field to
`/health` (populated only via Render's auto-injected `RENDER_GIT_COMMIT`), this Part 9 review found
that `GET /admin/api/bible-authority/founder-console` **already returns `build.commit` and
`build.branch`, read directly from the local git working tree at request time** (confirmed live:
`"commit":"6d8a254f9ecef84af66ff70f8b8510d2c6fbf56d","branch":"sprint-2c-c3-explicit-scripture-handoff"`
— exactly matching the actual current `HEAD`). This is a stronger, already-existing signal and
should be treated as the primary build-identity source; the new `/health.releaseCommit` field
added in Part 6 is a secondary, safe fallback that works even where a full git checkout is not
present in production (e.g., if a future deploy mechanism ships only the built artifact, not the
`.git` directory).

## 5. No Invasive Telemetry

Confirmed no keystroke logging, no password capture, no unrelated browsing capture, and no
per-message full-content aggregate storage in the counters layer. Full-transcript storage (for
Admin session review) is a pre-existing mechanism from prior Alpha/Beta phases, not new telemetry
introduced by this batch, and is already disclosed in the Founder Alpha release documentation. No
new telemetry code was added in this batch — the existing Phase 6H Founder Observation Layer
already satisfies the "privacy-respecting event telemetry" requirement (feature usage, errors,
performance) with consent/retention/redaction properties documented in
`docs/alpha/founder-alpha-release-verification-20260720-004049/FounderAlphaKnownWarnings.md` and
the Founder Alpha Testing Guide. No `FOUNDER_ALPHA_TELEMETRY` feature flag currently gates this —
it is always-on aggregate counting with no per-user profiling, which was judged in Phase 6H not to
need a kill-switch since it stores no personal content. This absence of a dedicated flag is noted
here for completeness rather than treated as a new defect to fix in this release-operations batch.
