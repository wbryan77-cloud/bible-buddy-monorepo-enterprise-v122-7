# Regression Report
### BibleBuddy Enterprise Operations Foundation — Phase 1B, Deliverable 9 of 10
Updated for the v2.0 Execution Batch (Operational Observability + Future Role Readiness API visibility).

Executed against a local server running the full Phase 1B working tree, admin-authenticated with a test bearer token. Evidence below is from live command output captured during this batch, not from memory or assumption.

## v2.0 addendum — new evidence this pass

```
GET /unified/metrics (authenticated)      → 200, ok:true, all 6 metric groups populated with live data
GET /unified/metrics (anonymous)          → 401
overview.observability field present      → true, keys: [runtimeMetrics, queueMetrics, recommendationMetrics,
                                                          userAssistanceMetrics, notificationMetrics, executiveSummary]
GET /unified/capabilities → namedRoleCapabilities → all 6 named roles (FOUNDER, ADMINISTRATOR, REVIEWER,
                                                          SUPPORT, OPERATIONS, ENGINEERING) resolve correctly
                                                          e.g. FOUNDER → OWNER_CEO capability set (19 capabilities)
unifiedAdminCommandCenterSmoke.js (re-run after v2.0 changes) → 31/31 passed, 0 failed
founder-alpha:validate (re-run after v2.0 changes)            → pass=42, fail=2 (same pre-existing Phase5O issue)
```

**Note on test methodology this pass:** two stale server processes from earlier testing sessions were found occupying ports 3000 and 3001 and could not be terminated (sandbox permission boundary — "operation not permitted"). This was caught by cross-checking `lsof` process ownership against the actual PID the shell started, rather than trusting that a `curl` response against an expected port reflected the current code. All v2.0 verification below was re-run against a freshly confirmed, freshly-bound port (5111) to guarantee the results reflect the current working tree.

## Summary table

| Area | Result | Evidence |
|---|---|---|
| Founder | **PASS** | `founder-alpha:validate` → `admin_/admin/api/bible-authority/founder-console — status=200`; ADMIN block fully PASS |
| Buddy Chat | **PASS** | `founder-alpha:validate` COMPANION block — `decisionOwnershipSmoke — 14 passed, 0 failed`; live doctrine query returned correct grounded Scripture answer (`doctrine_final_authority` route, Sabbath question, citations verified) |
| Governance | **PASS** | Command Center `governance` section unchanged, zero files touched; `admin_requires_auth_*` all return 401 anonymous |
| Scripture Authority | **PASS** | No Scripture/doctrine files modified this batch (confirmed by diff); `local_kjv_corpus_available` PASS in founder validator |
| Runtime Health | **PASS** | `aggregation_top_level_shape`, `aggregation_no_fabricated_status_values` (statuses seen: OK) — smoke PASS |
| Command Center / Executive Operations Center | **PASS** | `unifiedAdminCommandCenterSmoke.js` — **31/31 passed, 0 failed** (re-confirmed after v2.0 Observability + Role API changes) |
| Founder Intelligence | **PASS** | `founderIntelligence` section unchanged by this batch; `founder_summary` intents on Chief of Staff unaffected; `admin_/admin/api/bible-authority/founder-console — status=200` |
| Knowledge Coverage | **PASS** | `admin_/admin/api/bible-authority/knowledge-coverage-dashboard — status=200`; section untouched by this batch |
| Lesson Alignment | **PASS** | Section untouched by this batch; aggregator smoke confirms all sections render with complete envelopes |
| Review Queue | **PASS** | `admin_/admin/api/bible-authority/review-queue — status=200`; section untouched |
| Notifications (disabled by default) | **PASS** | Manual send returned `attempted: 0, delivered: 0` against a fresh tester set with all non-security categories defaulted off — confirms nothing sends until a user/tester opts in |
| User Assistance | **PASS** | End-to-end: 3 submitted low-confidence questions → 3 escalations → visible in Decision Queue (`"Support Escalation": 3`) |
| Enterprise Search | **PASS** | Query for "notification" returned 3 correctly-shaped results spanning 3 distinct providers (1 pre-existing, 2 new) in one call |
| Executive Operations Center | **PASS** | `executive_overview_five_key_answers`, `executive_overview_severity_present`, `executive_overview_drilldown_targets_present` all PASS; new sections (`notifications`, `userAssistance`, `knowledgeImprovement`) all report `status: OK` |

## Detailed evidence

### 1. `npm run founder-alpha:validate`

```
pass=42 warn=0 fail=2 skip=0
[PASS] === ADMIN ===        (5/5)
[PASS] === USER_PRODUCT ===  (3/3)
[PASS] === PROVIDERS ===     (3/3)
[PASS] === SECURITY_AND_PRIVACY === (8/8)
[PASS] === PERFORMANCE ===   (3/3)
[PASS] === DEPLOYMENT ===    (6/6)
[FAIL] === COMPANION ===
  [PASS] decisionOwnershipSmoke — 14 passed, 0 failed
  [FAIL] phase5OContinuationRegression — see Known Issue below
```

**Known issue investigated and confirmed pre-existing / unrelated to this batch:** `phase5OContinuationRegression`'s "Tell me more." follow-up sometimes routes to `core_connection_error` instead of `conversation_owner_app_identity_continuation`. This was reproduced by running the script directly (`node -r dotenv/config scripts/runPhase5OContinuationRegression.js`) with **all Phase 1B changes stashed out**, against the clean Phase 1A baseline — the identical failure occurred with zero Phase 1B code present. This confirms the failure is intermittent Companion-AI/OpenAI-dependent behavior that predates this batch and is **not a regression introduced by Phase 1B**. No Companion AI, orchestrator, or continuation-memory file was touched by this batch (confirmed by `git diff --stat`).

### 2. `unifiedAdminCommandCenterSmoke.js`

```
31/31 passed, 0 failed.
```
Full pass list includes auth (anonymous/invalid/valid), aggregation shape/envelope/no-fabrication, executive overview, decision queue (list/filter/action/audit), search (min-length/pagination/shape/auth), assistant (answers/attribution/confidence/approval-claim-safety), and scalability (limit clamping on queue/search/audit). This suite runs against the same live server serving the new Phase 1B code, so it is a true regression check, not a stale baseline.

### 3. Live end-to-end feature verification (this batch, ad hoc against running server)

- **Command Center new sections:** `notifications: OK`, `userAssistance: OK`, `knowledgeImprovement: OK`, `overallStatus: OK`.
- **Decision Queue categories (seeded):** `{"Evidence Candidate":211,"Governance Review":2,"Knowledge Improvement":1,"Support Escalation":3,"Scripture Coverage":3}` — both new categories present and populated from real, seeded data, not placeholders.
- **AI Chief of Staff new intents:**
  - `documentation_recommendations` → correctly summarized 1 real recommendation.
  - `user_assistance_status` → correctly reported 7 published articles, 3 pending escalations.
- **Capabilities endpoint:** confirmed presence of `VIEW_NOTIFICATIONS`, `MANAGE_NOTIFICATIONS`, `VIEW_USER_ASSISTANCE`, `MANAGE_HELP_CENTER`, `RESOLVE_SUPPORT_ESCALATIONS`, `VIEW_KNOWLEDGE_IMPROVEMENT`.
- **Public support endpoints:** reachable without authentication (200), while admin support endpoints correctly return 401 anonymous / 200 with valid admin token.
- **Homepage / Buddy Chat:** unaffected, status 200, no technical route leakage in UI (verified by `founder-alpha:validate`'s `USER_PRODUCT` block).

### 4. Security regression (Phase 1A preservation check)

All new admin routes added this batch were verified to require the same unified `checkAdminAuth()` middleware as pre-existing admin routes:

```
admin_requires_auth_always — status=401                (anonymous)
auth_valid_token_succeeds — status=200                 (with token)
auth_token_not_echoed_in_body — token not leaked
```

No new route bypasses authentication. No public route gained new privileges. `security_alerts` notification category remains hardcoded non-disableable.

## Test data cleanup

Escalation test data generated during this regression run (`data/user-assistance-escalations.jsonl`, 3 test entries) was deleted after verification. `data/` is git-ignored (`.gitignore:10`), so no test artifacts are present in tracked changes regardless.

## Conclusion

**All 14 mandated regression areas PASS.** The single failing sub-check (`phase5OContinuationRegression`) is a confirmed pre-existing, intermittent Companion-AI behavior unrelated to Phase 1B — reproduced identically on the clean Phase 1A baseline with Phase 1B changes removed. It does not block this batch, though it is flagged as a known open item for a future Companion AI-focused investigation, unrelated to Enterprise Operations.
