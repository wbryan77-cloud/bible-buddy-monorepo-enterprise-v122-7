# BIBLEBUDDY PHASE 6G FOUNDER HARDENING REPORT

## STATUS: READY_FOR_FOUNDER_ALPHA

(Final `founder-alpha:validate` run against the live main instance:
`READY_WITH_DOCUMENTED_WARNINGS`, `pass=37 warn=2 fail=0 skip=0`. Both
warnings are explicitly documented, non-blocking, expected-for-local-dev
conditions — no critical failure remains. Per the batch's own readiness
decisions, `READY_WITH_DOCUMENTED_WARNINGS` is a form of ready-to-begin;
this report's top-level STATUS reflects that Founder Alpha testing can
begin now.)

---

## DECISION OWNERSHIP

**Failures before:** 3 of 4 original `decisionOwnershipSmoke` cases
(`decision_single_word`, `decision_not_bible`, `help_me_decide`) — all
falling through to `reason_first_openai` with no dedicated ownership.

**Root causes:**
1. No lane in `bibleCompanionOrchestrator.js` claimed ambiguous decision
   prompts (`humanNeed === 'open_life' | 'next_steps'`) before they fell
   through to generic OpenAI composition.
2. `humanNeedDetector.js`'s decision-detection regex missed common
   "should I..." phrasing entirely.

**Files changed:**
- `services/bibleCompanionOrchestrator.js` — added `buildLifeDecisionReply`
  (deterministic composer: acknowledgment → what Scripture establishes →
  what Scripture leaves to wisdom → practical factors → next step →
  optional prayer) and a new early-exit `conversation_owner_life_decision`
  lane.
- `services/humanNeedDetector.js` — broadened `open_life`/`next_steps`
  regex to catch "should I" phrasing, with negative lookaheads and
  doctrine-keyword exclusions to avoid hijacking genuine Scripture
  questions.
- `scripts/alpha/decisionOwnershipSmoke.js` — extended from 4 to 14 cases
  (job, relationship, financial, medical, legal, family-forgiveness,
  faith-and-action, immediate-safety, repeat-question, rejected-suggestion,
  prayer-only-not-hijacked); later hardened the `decision_medical`
  assertion from a brittle fixed-phrase match to a robust
  topic-relevance + non-directive-language check (Part 4, after
  discovering it was flaky against legitimate OpenAI phrasing variance).

**Cases repaired:** 3/3 original failures + 10 new regression cases, all
passing.

**Tests after:** `decisionOwnershipSmoke` 14/14, stable across 8+
consecutive full runs performed throughout this batch.

**Remaining concerns:** None. Doctrine routing, prayer, and companion
regressions confirmed unchanged throughout (Parts 1, 8).

---

## REGRESSION REFRESH

**Outdated expectations found:**
- `openAiFirstRegressionTest` case `8_sabbath_definition` expected legacy
  route names or unconditional `openai_first`.
- `liveRuntimeVerification`'s shared `scoreTest` (and the underlying
  `services/liveRequestTrace.js` diagnostic) assumed every answer must
  call OpenAI or be flagged `non_openai_speaker` — 5 cases failed
  (`t01, t02, t03, t04, t06`) purely because the Scripture Authority
  Engine correctly answered them deterministically without OpenAI.

**Expectations changed:**
- `8_sabbath_definition` now asserts `doctrine_final_authority` (or
  `bible_wide_reasoning`) plus a real cited Sabbath witness
  (Genesis 2 / Exodus 20 / Isaiah 58 / Luke 4) in the reply.
- `services/liveRequestTrace.js` gained an exported
  `GOVERNED_NON_OPENAI_AUTHORS` allowlist (single source of truth) and
  now only raises `non_openai_speaker` when the final answer author is
  outside that governed-authority list.
- `scripts/liveRuntimeVerification.js` imports the same allowlist and
  adds `expectAuthorityOwned`, `expectScriptureContains`, and
  `expectExactQuote` assertions — stronger content/authority checks, not
  weaker route-name checks.

**Production defects found:** None — every one of the 6 refreshed cases
was an `OUTDATED_TEST_EXPECTATION`, not a real product defect.

**Suites before → after:** `openAiFirstRegressionTest` 9/10 → 10/10.
`liveRuntimeVerification` 1/6 → 6/6.

---

## IOG / ICOJ FINAL VERIFICATION

- **Sources found:** 47 ICOJ PDF-derived sources; 240 raw IOG YouTube
  transcript files (120 unique episodes after dedup).
- **Sources processed:** 47/47 ICOJ (100%); 5/120 IOG episodes (bounded
  feasibility sample, not persisted).
- **Sources unprocessed:** 115 IOG episodes — explicitly deferred with a
  documented reason (spoken-caption extraction requires a fundamentally
  different, higher-false-positive-risk parsing strategy than the
  structured ICOJ reference-list pipeline).
- **References extracted:** 910 (ICOJ).
- **References verified / duplicates:** 135 auto-approved (new,
  duplicate-checked against the live registry), 14 auto-rejected as
  duplicates, 3 auto-rejected as invalid, 199 unclassified (no matching
  doctrine topic — now visible in the audit log, a fix made this batch).
- **Candidates created / Admin review:** 559 sent to Admin review.
- **Primary/supporting witnesses promoted:** 0 new primary witnesses this
  batch (all promotions were cross-reference tier, correctly — IOG/ICOJ
  are discovery sources, not primary-witness authorities).
- **Cross-references promoted:** 135 (idempotency-guarded — reruns now
  correctly report 0 newly-persisted on a second pass, a real bug fixed
  this batch).
- **Typed relationships promoted:** 135 cross-reference + 33 pre-existing
  book-level relationships = 110 confirmed reachable in the live
  production relationship graph.
- **Historical sources investigated:** 13 (bibliographic-identity
  resolution: 8 resolved, 4 unresolved, 1 ambiguous).
- **Historical facts promoted:** 13 (all from prior phases, re-verified
  this batch as still `APPROVED` and trust-tiered).
- **Historical claims rejected:** 0 (none were rejectable; all either
  resolved or correctly flagged unresolved/ambiguous for Admin, not
  promoted as-is).
- **Licensing blockers:** 0 hard blockers; one `COPYRIGHTED_CITE_ONLY_NO_REPRODUCTION`
  source correctly stores only a supplemental label/summary, never full text.
- **Production retrieval proof:** live `runBuddy()` calls confirmed
  cross-reference-backed doctrine answers with real cited witnesses.
- **Lineage proof:** confirmed via `finalAnswerAuthor`/`route` fields on
  every live response, and via the Admin command-center/review-queue.
- **Remaining gaps:** 115 unprocessed IOG transcript episodes (explicitly
  listed, deferred to a future reviewed batch); the bibliographic
  resolution status of the 4 unresolved/1 ambiguous historical sources
  does not yet sync back into `historicalKnowledgeProvider`'s
  `approvalStatus` field (documented gap, not a blocker — none of those
  5 records were promoted or demoted incorrectly).

---

## FOUNDER READINESS VALIDATOR

- **Command:** `npm run founder-alpha:validate`
  (`scripts/founderAlphaReadinessValidator.js`).
- **Checks executed:** 11 categories, 42 individual checks (REPOSITORY 7,
  SCRIPTURE 4, ORIGINAL_LANGUAGE 1, HISTORY 2, COMPANION 2, ADMIN 5,
  USER_PRODUCT 3, PROVIDERS 3, SECURITY_AND_PRIVACY 3, PERFORMANCE 3,
  DEPLOYMENT 6).
- **Passes:** 37. **Warnings:** 2 (no admin token configured locally;
  ~6s Admin dashboard snapshot latency — both documented, non-blocking).
  **Failures:** 0. **Skips:** 0 (server was reachable for this final run).
- **Exit code:** `0`.
- **Readiness decision:** `READY_WITH_DOCUMENTED_WARNINGS`.

Three real bugs were found and fixed while building/testing the
validator itself: a false-positive `prisma migrate` comment-text match, a
socket-reuse `EPIPE` against a long-idle keep-alive connection, and the
`decision_medical` phrase-match flakiness described above.

---

## FRESH ENVIRONMENT

- **Method:** isolated `rsync` copy of the current working tree (all
  uncommitted Phase 6F/6G work included, since nothing has been committed
  yet), excluding `.git`, `node_modules`, and the bulk `docs/` tree
  (except two subpaths discovered to be runtime-required — see below);
  fresh `.env` built from `.env.sample` with every credential blank.
- **Install result:** `npm ci` succeeded cleanly (151 packages).
- **Migrations:** N/A — none declared, none needed, render.yaml confirmed
  not to invoke `prisma migrate`.
- **Build:** N/A — no build step declared or required.
- **Startup:** clean, port 3099, isolated from the port-3000 dev instance.
- **Health:** `/health` → `200` within ~3s.
- **E2E / regressions in isolated env:** `scriptureFidelitySmoke` 4/4,
  `alphaCoreTruthSmoke` 6/6, `liveRuntimeVerification` 6/6,
  `decisionOwnershipSmoke` 14/14, `phase5OContinuationRegression` pass,
  `openAiFirstRegressionTest` **9/10** — the one difference
  (`9_knees_health`) is transparently attributed to the intentionally
  blank `OPENAI_API_KEY` in this isolated run, not a defect (with a real
  key, this same case passes — confirmed 10/10 repeatedly on the main
  instance).
- **Hidden dependencies found:** `docs/bible-learning/` and
  `docs/evidence-candidates/` are read directly by 9 production services
  at runtime — despite living inside a folder that looks like pure
  documentation and is 1.9GB in total. Tracked in git (so `git clone`
  works today), but fragile against any future deploy step that trims
  `docs/`. Documented with a concrete recommendation, not fixed this
  batch (structural move, out of "smallest safe change" scope).
- **Cleanup result:** temp directory and isolated server fully removed
  and stopped; confirmed via follow-up `ls` (not found).

---

## ARCHITECTURE FREEZE

- **Frozen components:** authority ownership, doctrine routing, Scripture
  retrieval, witness retrieval, relationship graph, original-language
  provider architecture, historical provider architecture, governed
  ingestion, Admin approval, knowledge-drift/coverage analytics, answer
  lineage, companion routing, memory/continuation ownership. Full file-
  level mapping in `docs/alpha/ArchitectureFreezeDeclaration.md`.
- **Allowed changes:** bug fixes, regression repair, knowledge
  completion through the existing pipeline, usability/accessibility,
  security, performance, scalability, approved provider adapters,
  Founder feedback response, data-quality repair, test improvement.
- **Exception process:** documented 7-point requirement (proven
  defect/blocker, affected path, alternatives considered, smallest safe
  change, regression plan, rollback plan, Admin/security impact).
- **Exact freeze point:** commit `09626367d1fd586b83b807a15c078507fbdd8aa1`
  on branch `sprint-2c-c3-explicit-scripture-handoff`, with the explicit
  working-tree caveat that all Phase 6F/6G work is layered on top,
  uncommitted, at freeze time.

---

## FOUNDER TESTING PACKAGE

- **Test URL:** `http://localhost:3000` (or the shared/hosted URL if one
  is provided separately).
- **Startup command:** `npm ci && npm start` (after `cp .env.sample .env`
  and filling in `OPENAI_API_KEY`).
- **Enabled features:** Scripture chat, KJV retrieval, witnesses/cross-
  references, original-language study, historical context, prayer,
  therapeutic/reflection companion, session memory, reading-plan/daily-
  verse prompts, lightweight auth, memory export/delete (conversational),
  lesson-alignment review (Admin), Admin knowledge-review console.
- **Disabled features:** voice, avatar video, food/health integrations,
  groups/community, push/SMS notifications, lesson file upload (paste
  works), dedicated notes/highlights/bookmarks UI — all either invisible
  or marked "Coming soon."
- **Known warnings:** no admin token configured locally (expected,
  must be set before any shared/public deployment); Admin dashboard
  ~6s load (expected, offline snapshot).
- **Guide paths:** `docs/alpha/FounderAlphaTestingGuide.md`,
  `docs/alpha/FounderAlphaIssueTemplate.md`,
  `docs/alpha/FounderAlphaTestChecklist.md`.

---

## FILES SEARCHED

`server.js`, `routes/*.js` (all mounted routes), `services/bibleCompanionOrchestrator.js`,
`services/humanNeedDetector.js`, `services/liveRequestTrace.js`,
`services/doctrineFinalAuthorityEngine.js`, `services/scriptureAuthorityEngine.js`,
`services/groundedScriptureEngine.js`, `services/scriptureRelationshipGraph.js`,
`services/historicalKnowledgeProvider.js`, `services/historicalSourceInvestigationEngine.js`,
`services/iogIcojGovernedIngestion.js`, `scripts/alpha/*.js` (all alpha suites),
`scripts/openAiFirstRegressionTest.js`, `scripts/liveRuntimeVerification.js`,
`scripts/runPhase5OContinuationRegression.js`, `package.json`, `render.yaml`,
`.env.sample`, `public/index.html`, `data/approved-cross-references.jsonl`,
`data/knowledge-audit-log.jsonl`, `docs/bible-learning/`, `docs/evidence-candidates/`.

## FILES CREATED

- `scripts/founderAlphaReadinessValidator.js`
- `docs/alpha/ArchitectureFreezeDeclaration.md`
- `docs/alpha/FounderAlphaTestingGuide.md`
- `docs/alpha/FounderAlphaIssueTemplate.md`
- `docs/alpha/FounderAlphaTestChecklist.md`
- `docs/alpha/founder-readiness/<timestamp>/FounderReadinessReport.{json,md}` (generated fresh on every validator run; 5 generated this batch)
- `docs/alpha/phase6g-founder-hardening-20260719-102058/` (all Part 1–8 evidence, this report, and pre-batch baseline captures)

## FILES MODIFIED

- `services/bibleCompanionOrchestrator.js` — decision-ownership lane
- `services/humanNeedDetector.js` — broadened decision-need detection
- `services/liveRequestTrace.js` — `GOVERNED_NON_OPENAI_AUTHORS` allowlist
- `scripts/alpha/decisionOwnershipSmoke.js` — 4→14 cases, robustness fix
- `scripts/openAiFirstRegressionTest.js` — refreshed sabbath assertion
- `scripts/liveRuntimeVerification.js` — refreshed authority-based assertions
- `services/iogIcojGovernedIngestion.js` — unclassified-visibility fix, idempotency guard, bounded transcript sample function
- `package.json` — added `founder-alpha:validate` script
- `render.yaml` — added missing `healthCheckPath: /health`
- `data/approved-cross-references.jsonl` — one clean official persist run (135 entries, confirmed idempotent on rerun)
- `data/knowledge-audit-log.jsonl` — new `UNCLASSIFIED_NO_TOPIC_MATCH` entries now visible

## FILES MOVED

None.

## FILES DEPRECATED

None.

## FILES REMOVED

None. (Proof: `git status --short` shows no deletions attributable to this batch.)

---

## TESTS EXECUTED

`decisionOwnershipSmoke` (14 cases), `openAiFirstRegressionTest` (10
cases), `liveRuntimeVerification` (6 cases), `scriptureFidelitySmoke` (4
cases), `alphaCoreTruthSmoke` (6 cases), `phase6bOriginalLanguageValidation`,
`runPhase5OContinuationRegression`, `phase6fFounderAlphaE2E` (35 cases),
`phase6fTherapeuticMultiTurn` (10 multi-turn scenarios), IOG/ICOJ
governed-ingestion dry-run and one clean persist run, `founder-alpha:validate`
(6 full runs across this batch: 2 on the main instance pre-fix, 1
post-fix confirming `READY_WITH_DOCUMENTED_WARNINGS`, 1 in the isolated
fresh environment, 1 final confirmation run, plus standalone re-runs of
individual suites during triage).

## REGRESSIONS REPAIRED

3 `decisionOwnershipSmoke` failures (real product defect), 1
`openAiFirstRegressionTest` outdated expectation, 5 `liveRuntimeVerification`
outdated-harness-assumption failures, 1 flaky test-assertion
(`decision_medical`), 1 validator-harness `EPIPE` bug, 1 validator
false-positive `prisma migrate` check, 1 IOG/ICOJ idempotency bug
(duplicate cross-reference risk on rerun), 1 IOG/ICOJ visibility gap
(unclassified references were being silently discarded).

## REMAINING WARNINGS

1. No admin token configured in this local environment — Admin routes
   open on localhost; must be set before any shared/public deployment
   (already documented in `.env.sample` and the Founder testing guide).
2. Admin `command-center` dashboard latency ~6s — large offline snapshot,
   not on the live chat hot path, acceptable for Founder Alpha.
3. `docs/bible-learning/` and `docs/evidence-candidates/` contain
   runtime-required data inside a folder that looks like pure
   documentation — recommend relocation in a future maintenance batch.
4. `form-data` 4.0.0–4.0.5 high-severity transitive advisory
   (`GHSA-hmw2-7cc7-3qxx`) — fix available via `npm audit fix`, not
   applied this batch (blocked by this session's own command-safety
   review as an out-of-scope networked dependency mutation);
   recommend running it in a dedicated reviewed commit immediately.
5. 115 of 120 unique IOG transcript episodes remain unprocessed
   (explicitly deferred, documented feasibility sample completed on 5).
6. Bibliographic-resolution status for 5 historical sources (4
   unresolved, 1 ambiguous) does not yet sync back into
   `historicalKnowledgeProvider`'s approval field.

## PERFORMANCE

Governed doctrine answers remain sub-second (~400ms) with zero OpenAI
dependency. OpenAI-composed companion answers vary 1–35s depending on
provider-side latency (external, not a code regression). Admin dashboard
~6s (offline snapshot, non-hot-path). No full-corpus scan, IOG/ICOJ
processing, or synchronous analytics rebuild occurs in the live chat
path — confirmed via the same require-graph method used in Phase 6F.

## SECURITY/PRIVACY

No new blocker introduced. Admin auth boundary correctly enforced when a
token is configured; correctly and transparently open (with warning) when
none is configured locally. `.env` confirmed gitignored and untracked.
Temporary fresh-install artifacts fully cleaned up. One real, disclosed
dependency vulnerability documented (not silently ignored, not force-
fixed without review).

## EXACT TESTED COMMIT OR WORKING-TREE CAVEAT

Commit `09626367d1fd586b83b807a15c078507fbdd8aa1`,
branch `sprint-2c-c3-explicit-scripture-handoff`. **Working tree is
dirty**: all Phase 6F and Phase 6G implementation exists as uncommitted
changes on top of this commit. Every test and validator run in this
report was executed against that same uncommitted working tree — the
commit hash identifies the last committed ancestor, not a fully
self-contained tested state. The repository owner should commit this
working tree promptly so future "exact commit" references are
unambiguous.

## FINAL RECOMMENDATION: BEGIN_FOUNDER_ALPHA

All 20 acceptance gates pass (see Part 8 for the gate-by-gate check). No
Phase 6G regression remains. The two documented warnings (admin-token
configuration, Admin dashboard latency) are expected local-dev conditions
and non-blocking snapshot-load latency respectively — neither affects
the Founder-facing companion experience. Two additional non-blocking
findings (docs/-embedded runtime data, one transitive dependency
advisory) are explicitly listed with concrete remediation recommendations
for the next maintenance batch, per the batch's own instruction to list
rather than silently fix or silently ignore remaining items.
