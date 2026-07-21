# Part 1 — Working-Tree Reconciliation

**Batch:** Founder Alpha Baseline, Deployment Activation, Live Verification, and Tester Access Package
**Timestamp:** 2026-07-20T13:37:40Z
**Base commit (pre-reconciliation):** `09626367d1fd586b83b807a15c078507fbdd8aa1`
**Branch:** `sprint-2c-c3-explicit-scripture-handoff`

## 1. Summary

The working tree contained **167 top-level changed entries** reported by `git status --short`
(39 modified tracked files + 128 untracked entries, several of the untracked entries being
directories containing many files). Every entry was inspected and classified. The reconciled
result:

| Disposition | Top-level entries | Approx. file count | Approx. size |
|---|---|---|---|
| **Included in release commit** | 93 (40 modified + 40 new flat files + 13 new directories \* ) | 339 files | ~13 MB (text/code only) |
| **Excluded — preserved locally** | 74 (59 historical evidence directories + 14 ZIP archives + 1 backup file) | thousands (mostly log/evidence text inside pre-Phase-6 directories) | ~1.7 GB |

\* `docs/architecture/` and `scripts/alpha/` are counted among the 13 included directories.

No file was deleted. No file was silently dropped. Everything excluded from the commit remains
present on disk, unstaged, exactly as it was before this batch began (verified below).

## 2. Classification Method

Because "Founder Alpha required" work spans many prior batches, a defensible, evidence-based
rule was used instead of ad hoc judgment:

1. Any **modified tracked file** (the 39 `M` entries) is part of the live, running application or
   its regression/documentation baseline — always **FOUNDER_ALPHA_REQUIRED** or
   **RELEASE_DOCUMENTATION**.
2. Any **new (untracked) application source file** under `services/`, `routes/`, `scripts/`,
   `scripts/alpha/`, `public/`, `admin/` is part of the verified Phase 5–6 implementation actually
   loaded by `server.js` at runtime (Scripture Authority Engine, Grounded Scripture Engine,
   Knowledge Coverage/Drift/Approval engines, Lesson Alignment Analyzer, Founder Admin Console
   Status, Historical/Original-Language providers, etc.) — **FOUNDER_ALPHA_REQUIRED**.
3. Any **release/evidence directory under `docs/alpha/` dated 2026-07-17 (Phase 5R/5S) through
   2026-07-20** (the Phase 6-Knowledge → 6E → 6F → 6G → 6H → Final Gate → Release Review →
   Deployment-Verification chain that produced the currently verified build) —
   **RELEASE_DOCUMENTATION** / **GENERATED_REPORT** — included.
4. Any **evidence directory under `docs/alpha/` dated 2026-07-07 through 2026-07-16** (pre-Phase-6
   Sprint 2C / batch1 / batch2 exploratory and repair work, already superseded by the frozen
   architecture and the Phase 6 chain) — **LOCAL_ONLY_ARTIFACT** — excluded, preserved locally.
5. `docs/architecture/` (root-level, not `docs/alpha/`) contains 5 Architecture Decision Records
   (ADR-001…ADR-005) plus the Ownership Constitution and a live-ownership audit. These are durable
   architecture decisions referenced by the Architecture Freeze, not disposable test evidence —
   **RELEASE_DOCUMENTATION** — included.
6. Any **`.zip` archive** anywhere under `docs/alpha/` is a generated snapshot of directories that
   already exist unzipped next to it — **LOCAL_ONLY_ARTIFACT (generated archive)** — excluded per
   explicit instruction ("no generated archives").
7. `docs/dev-archive/*` is explicitly self-labeled as archived, superseded development work
   (Sprint 2C exploratory branches, all dated 2026-07-10/07-12) — **LOCAL_ONLY_ARTIFACT** —
   excluded.
8. `services/companionIntentIntelligence.js.before-restore.20260703-142214` is a manual pre-restore
   backup copy of a file that is already tracked and unchanged in this batch —
   **LOCAL_ONLY_ARTIFACT (backup)** — excluded.

Evidence used for the date cutoff: listing the maximum file `mtime` inside every untracked
`docs/alpha/*` directory (see `05-directory-mtimes.txt` in this evidence folder). This showed a
clean chronological boundary — nothing after `phase6-knowledge-20260718-204759/` overlaps with
anything before `archverify-20260717-222100/` — confirming the Phase 6 baseline is cleanly
separable from the earlier Sprint 2C/batch1/batch2 exploratory record. `Phase5RLiveRuntimeValidationReport.md`
and `Phase5SScriptureAuthorityEngineReport.md` (2026-07-17) were included by content inspection —
they document `groundedScriptureEngine.js` and `scriptureAuthorityEngine.js`, which are
currently-active, in-scope engines, not superseded drafts. `docs/alpha/architecture/ArchitectureFreeze.md`
(2026-07-07, 165 bytes) was excluded by content inspection — it is a 6-line stub superseded by the
much more complete `docs/alpha/ArchitectureFreezeDeclaration.md` (2026-07-19).

## 3. Full Classification Table

### 3a. FOUNDER_ALPHA_REQUIRED (application source — included)

All 39 modified tracked files under `services/`, `routes/`, `scripts/`, `admin/`, `public/`,
plus `package.json`, `render.yaml`, `.gitignore`. Plus 27 new files: `.env.sample`,
`scripts/architectureOwnershipAudit.js`, `scripts/founderAlphaReadinessValidator.js`,
`scripts/runPhase5RLiveRuntimeValidation.js`, and 24 new `services/*.js` engines
(`bibleTextProvider.js`, `canonicalScriptureProvider.js`, `groundedScriptureEngine.js`,
`scriptureAuthorityEngine.js`, `scriptureRelationshipGraph.js`, `topicWitnessRegistry.js`,
`historicalKnowledgeProvider.js`, `historicalSourceInvestigationEngine.js`,
`iogIcojGovernedIngestion.js`, `knowledgeAnalyticsSnapshotStore.js`,
`knowledgeApprovalRulesEngine.js`, `knowledgeApprovalRulesOptimizer.js`,
`knowledgeCoverageAnalyticsEngine.js`, `knowledgeDriftDetector.js`,
`knowledgePipelineAnalytics.js`, `knowledgeTagStage.js`, `lessonScriptureAlignmentAnalyzer.js`,
`localKjvCorpusProvider.js`, `originalLanguageProvider.js`,
`originalLanguageResponseFormatter.js`, `runtimeCanonicalContinuityScoringAI.js`,
`runtimeCanonicalLifeApplicationEngine.js`, `runtimeCanonicalResponseComposer.js`,
`runtimeCanonicalWorshipContinuityEngine.js`, `adminQueueDiagnosticsEngine.js`,
`founderAdminConsoleStatus.js`, `founderKnowledgeReadinessScorer.js`). Plus
`scripts/alpha/` (30 test/validator scripts invoked by `founderAlphaReadinessValidator.js` and
referenced throughout the regression suite). **No credentials, secrets, or absolute local paths
found in any of these files** (verified by recursive grep, see §4).

### 3b. RELEASE_DOCUMENTATION / GENERATED_REPORT (included)

- `docs/alpha/AlphaFreezePlan.md`, `ArchitectureFreezeDeclaration.md`,
  `BibleBuddyAlphaConstitution.md`, `Roadmap.md`, `FounderAlphaIssueTemplate.md`,
  `FounderAlphaTestChecklist.md`, `FounderAlphaTestingGuide.md`
- `docs/alpha/phase6-knowledge-20260718-204759/`, `phase6-knowledge-20260719-011107/`,
  `phase6e-coverage-20260719-022630/`, `phase6f-20260719-075444/`,
  `phase6g-founder-hardening-20260719-102058/`,
  `phase6h-founder-experience-ui-polish-20260719-220000/`,
  `phase6h-founder-experience-product-polish-20260719-234100/`,
  `phase5t-2026-07-19T0840/`, `phase5t-2026-07-19T0948/`, `founder-readiness/`,
  `founder-alpha-release-verification-20260720-004049/`,
  `founder-alpha-deployment-activation-20260720-133740/` (this batch's own evidence)
- `docs/architecture/` (5 ADRs + Ownership Constitution + live-ownership audit)
- `Phase5RLiveRuntimeValidationReport.md`, `Phase5SScriptureAuthorityEngineReport.md`,
  `Phase4NResponseClarityRegressionReport.md`, `Phase4OBibleWideReasoningRegressionReport.md`,
  `Phase5ABibleCompanionOrchestrationRegressionReport.md`, `Phase5LLiveThreadRegressionReport.md`,
  `Phase5LNoRegressionGateReport.md` (modified tracked)
- `docs/evidence-candidates/console-queue.json`, `topic-approval-packs.json`,
  `docs/regression-trace/*.json` (modified tracked regression trace snapshots)

### 3c. LOCAL_ONLY_ARTIFACT — excluded, preserved locally (not committed)

**Reason for every item below: superseded pre-Phase-6 exploratory/repair evidence (Sprint 2C,
batch1, batch2), a generated archive duplicating an already-present unzipped directory, a dev
backup file, or a self-labeled archive folder. Nothing here is required to run, verify, or
understand the current Founder Alpha build. All remain on disk at their original paths.**

59 directories (full list in `Part1-WorkingTreeReconciliation.json`, field `excluded.directories`):
`docs/alpha/architecture/`, `archverify-20260717-222100/`, `batch1-architecture-foundation-20260716-161250/`,
`batch1-complete-v2-20260716-174935/`, `batch1-repair-complete-20260716-161939/`,
`batch2-authority-ownership-20260716-180728/`, `batch2a-regression-triage-20260716-182607/`,
`checklists/`, `cleanup/`, `concepts/`, `consolidation/`, `core-connection-audit/`,
`dispatcher-analysis/`, `governance/`, `implementation-source/`, `implementation/`,
`kilrps-20260717-232059/`, `minimum-live-runtime-export/`, `phase5t-20260717-211212/`,
`project-checkpoint/`, `readiness/`, `regression-architecture/`, `regression/`,
`repository-inventory/`, `runtime-source-export/`, `runtime/`,
`scripture-completion-rebaseline-20260715-184344/`, `scripture-fidelity/`, `sprint2-discovery/`,
19× `sprint2c-*` directories (dated 2026-07-10 through 2026-07-16), plus 7×
`docs/dev-archive/*` directories (dated 2026-07-10/07-12, self-labeled archive).

14 ZIP archives under `docs/alpha/` (all duplicate content already present unzipped alongside
them): `minimum-live-runtime-export.zip`, `runtime-source-export.zip`,
`scripture-completion-rebaseline-20260715-184344.zip`,
`sprint2c-c-resolver-evidence-20260712-164145.zip`,
`sprint2c-c-resolver-exact-body-20260712-173133.zip`,
`sprint2c-c1-decision-package-20260713-124745.zip`,
`sprint2c-c2-explicit-scripture-handoff-20260713-132400.zip`,
`sprint2c-c2-explicit-scripture-handoff-20260713-132545.zip`,
`sprint2c-c3-caller-boundary-20260713-143024.zip`,
`sprint2c-c3-caller-window-20260715-074647.zip`, `sprint2c-closeout-20260712-155318.zip`,
`sprint2c-enterprise-rebaseline-20260710-213122.zip`,
`sprint2c-retrieval-execution-trace-20260712-142906.zip`,
`sprint2c-retrieval-execution-trace-20260713-134047.zip`.

1 backup file: `services/companionIntentIntelligence.js.before-restore.20260703-142214`
(pre-restore snapshot of a file that is unchanged and already tracked in this batch).

### 3d. SECRET_OR_SENSITIVE

**None found.** See §4 for verification method.

### 3e. UNRELATED_CHANGE / UNKNOWN_REQUIRES_REVIEW

**None.** Every one of the 167 top-level entries was resolved to one of the categories above.

## 4. Safety Verification

- **Credentials / API keys / tokens:** Recursively searched all untracked files and all modified
  tracked files for the pattern `sk-[A-Za-z0-9]{20,}` (OpenAI key shape) and for
  `OPENAI_API_KEY=sk-` assignments. Zero real key values found. The only matches were
  `process.env.OPENAI_API_KEY` variable references and one documentation placeholder
  (`OPENAI_API_KEY=sk-...` in a script's usage comment, three literal dots, not a real key).
- **`.env` file:** Not present in the working tree; not staged. `.env.sample` (no secrets, template
  only) is new and included by design — this is the file the README and validator reference as the
  setup template.
- **Local absolute paths:** Recursively searched for `/Users/william`. 64 matches. 63 are confined to
  excluded `docs/alpha/*` evidence/log directories (captured command output, `cwd` fields in JSON
  test summaries) that are not part of the release commit. The 1 remaining match is inside
  `docs/architecture/live-ownership-audit.json` (included as an ADR-supporting artifact) — this is
  inert audit metadata (a recorded file path from when the audit was generated), not a functional
  dependency; it does not affect runtime behavior. The ADR markdown files themselves are clean.
  **Zero occurrences in any application source file** (`services/`, `routes/`, `scripts/`,
  `public/`, `admin/`) — confirmed the running application has no hardcoded developer-machine
  paths.
- **`node_modules/`:** Not present in untracked list; already `.gitignore`d.
- **Local databases (`.db`/`.sqlite`):** None found anywhere in the working tree.
- **Screenshots:** None found (`.png`/`.jpg`/`.jpeg`) among untracked files.
- **Stale PID files:** None found.
- **Generated archives:** 14 `.zip` files found and excluded (§3c).
- **Accidental user-content exports:** None found — no exported conversation/user-data files
  present.
- **Unrelated project files:** None found — every file belongs to this repository's own history.

## 5. Preservation Guarantee

Nothing was deleted, moved, or modified by this reconciliation step — only `git add` (staging)
was performed. Confirmed after staging:

- `git status --short | grep '^??' | wc -l` → **74** (exactly the 59 excluded directories + 14 ZIPs
  + 1 backup file — matches the exclusion list exactly, confirming no excluded item was
  accidentally staged and no included item was left behind).
- Spot-checked that excluded directory contents are still present on disk after staging
  (`docs/alpha/sprint2c-retrieval-root-cause-20260712-133334/` still contains its files).
- `git diff --cached --name-only | grep '\.zip$'` → empty (no archive staged).
- `git diff --cached --stat` → **339 files changed, 127504 insertions(+), 365 deletions(-)**.

## 6. Acceptance Criteria

| Criterion | Status |
|---|---|
| Every changed file classified | ✅ (167/167 top-level entries) |
| All intended Founder Alpha files included | ✅ (339 files staged: all app code + Phase 5R–6H/Final-Gate/Release-Review/Deployment-Activation documentation + ADRs) |
| No secret or unsafe artifact included | ✅ (verified §4) |
| No verified work silently lost | ✅ (all 74 excluded entries remain on disk, documented above, none deleted) |
