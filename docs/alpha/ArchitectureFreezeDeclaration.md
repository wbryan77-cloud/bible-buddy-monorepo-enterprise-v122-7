# BibleBuddy Architecture Freeze Declaration

**Effective date:** 2026-07-19
**Freeze point (exact commit):** `09626367d1fd586b83b807a15c078507fbdd8aa1`
on branch `sprint-2c-c3-explicit-scripture-handoff`
**Working-tree caveat:** The commit above is the last committed ancestor.
Phase 6G (this batch) and Phase 6F before it were implemented as
uncommitted working-tree changes on top of that commit. This freeze
covers the architecture **as implemented in the current working tree**,
including every file listed as "Files created/modified" in the Phase 6G
Final Implementation Report. The repository owner should commit this
working tree (or an equivalent snapshot) promptly so that "the frozen
architecture" and "the committed history" refer to the same code.
**Scope:** Founder Alpha testing phase (Phases 4 through 6G).

---

## 1. What is frozen

The following production subsystems are frozen as architecturally
complete for Founder Alpha. They may be repaired, hardened, and completed
with missing data — they may not be redesigned, replaced, or duplicated.

| Component | Frozen implementation |
|---|---|
| **Authority ownership** | `services/scriptureAuthorityEngine.js`, `services/doctrineFinalAuthorityEngine.js`, `services/doctrineAuthorityContract.js` — the deterministic authority order: Scripture → verified KJV text → approved canonical relationships → approved original-language data → verified supplemental history → ministry discovery provenance |
| **Doctrine routing** | `services/doctrineTopicDetector.js`, `services/bibleConceptGraph.js`, `services/topicWitnessRegistry.js`, the strict-doctrine gate in `services/bibleCompanionOrchestrator.js` |
| **Scripture retrieval** | `services/canonicalScriptureProvider.js`, `services/bibleTextProvider.js`, `services/localKjvCorpusProvider.js` (66-book local KJV corpus + external-provider fallback) |
| **Witness retrieval** | `services/topicWitnessRegistry.js`, `services/groundedScriptureEngine.js` (READ/QUOTE/COMPARE/YES_NO) |
| **Relationship graph** | `services/scriptureRelationshipGraph.js` (precept/cross-reference graph, including the 110 IOG/ICOJ-sourced and 33 book-level approved relationships) |
| **Original-language provider architecture** | `services/originalLanguageProvider.js` and related Hebrew/Aramaic/Greek/Strong's data services (Phase 6B) |
| **Historical provider architecture** | `services/historicalKnowledgeProvider.js`, `services/historicalSourceInvestigationEngine.js` (Phase 6C/6E/6F, trust-tiered, supplemental-only) |
| **Governed ingestion** | `services/iogIcojGovernedIngestion.js` and the 11-stage ACQUIRE→PRODUCTION knowledge-acquisition pipeline (Phase 6D) |
| **Admin approval** | `services/knowledgeApprovalRulesEngine.js`, `services/supportGraphCandidateQueue.js`, `routes/bibleAuthorityAdmin.js` |
| **Knowledge drift / coverage analytics** | Phase 6E offline snapshot generators and `admin/api/bible-authority/knowledge-coverage-dashboard` (background-only, never on the live chat hot path) |
| **Answer lineage** | Lineage attachment inside `services/bibleCompanionOrchestrator.js` / `services/liveRequestTrace.js` (`finalAnswerAuthor`, `GOVERNED_NON_OPENAI_AUTHORS`, provenance fields on promoted evidence) |
| **Companion routing** | `services/humanNeedDetector.js`, `services/openAiFirstCompanionRuntime.js`, the companion/prayer/decision-ownership lanes in `services/bibleCompanionOrchestrator.js` (including the Phase 6G `conversation_owner_life_decision` lane) |
| **Memory and continuation ownership** | `services/activeConversationManager.js`, `services/conversationContinuationMemory.js`, `services/companionMemoryManager.js` |

## 2. What "frozen" means

- No new routing engine, doctrine-ownership system, evidence graph,
  approval pipeline, or analytics engine may be introduced without a
  **proven defect or blocker** (see Section 4).
- No parallel implementation of any frozen component may be created
  "alongside" the existing one.
- No hot-path knowledge scans, autonomous doctrine learning, or
  large-scale redesign may occur during Founder Alpha.
- Configuration, data, and content may still change (see Section 3) —
  frozen means the *architecture*, not the *content* or *data*.

## 3. Allowed during the freeze

The following remain fully permitted and expected during Founder Alpha:

- Bug fixes and regression repair (as performed throughout Phase 6G Parts
  1–3, 5, and 8).
- Missing-knowledge completion through the **existing** governed
  ingestion/approval pipeline (more Scripture witnesses, cross-references,
  historical records — not new pipelines).
- Usability and accessibility repair (as performed in Phase 6F Part 13).
- Security and performance hardening (e.g. the `npm audit` finding and
  the Admin-latency warning documented in Phase 6G Parts 5 and 8).
- Scalability implementation for existing components (e.g. moving
  file-based persistence to a real database later, without changing
  authority ownership or routing logic).
- Approved provider adapters (e.g. a second canonical-Scripture provider
  behind the existing `bibleTextProvider.js` abstraction, not a new
  abstraction).
- Founder feedback response, within the bounds above.
- Data-quality repair (e.g. the `docs/`-embedded runtime-data relocation
  recommended in Phase 6G Part 5 is allowed as a future data/location fix —
  it does not touch authority, routing, or approval logic).
- Test and validator improvement (e.g. `founderAlphaReadinessValidator.js`
  itself may grow more checks).

## 4. Exception process for any proposed architecture change

Any change to a frozen component must be proposed with all of the
following, in writing, before implementation begins:

1. **Proven defect or blocker** — reproducible evidence (failing test,
   production incident, or explicit Founder-blocking limitation), not a
   hypothetical improvement.
2. **Affected production path** — the exact file(s) and request path(s)
   touched.
3. **Alternatives considered** — including why extending the existing
   frozen component was insufficient.
4. **Smallest safe change** — the minimal diff that resolves the proven
   defect, matching the pattern used throughout Phase 6G (e.g. the
   single-lane `conversation_owner_life_decision` fix rather than a new
   routing engine).
5. **Regression plan** — which existing suites must stay green
   (`decisionOwnershipSmoke`, `openAiFirstRegressionTest`,
   `liveRuntimeVerification`, `scriptureFidelitySmoke`,
   `alphaCoreTruthSmoke`, `founder-alpha:validate`, and any suite that
   exercises the affected path).
6. **Rollback plan** — how to revert if the change causes a regression
   after Founder feedback.
7. **Admin/security impact** — whether the change affects Admin
   authorization, data exposure, or privacy.

## 5. Founder Alpha scope

This freeze governs the codebase for the **Founder Alpha testing phase**
only — a small, trusted group of founders/testers validating the
Scripture-first companion core (see `docs/alpha/founder-readiness/` and
the Founder Alpha Testing Package created in Phase 6G Part 7). It is not
a permanent architectural lock: once Founder Alpha feedback is collected
and reviewed, a subsequent, deliberately-scoped batch may propose changes
through the Section 4 exception process.

## 6. Verification at freeze point

At the freeze point above, the following were independently verified
(see `docs/alpha/phase6g-founder-hardening-20260719-102058/` for full
evidence):

- `npm run founder-alpha:validate` → `READY_WITH_DOCUMENTED_WARNINGS`
  (`pass=37 warn=2 fail=0 skip=0`), commit `09626367d1fd`.
- Fresh-environment install (`npm ci` + `.env.sample` + no credentials)
  starts, serves `/health`, and passes all local regressions except one
  explicitly credential-dependent case (Part 5).
- `decisionOwnershipSmoke` 14/14, `openAiFirstRegressionTest` 10/10,
  `liveRuntimeVerification` 6/6, `scriptureFidelitySmoke` 4/4,
  `alphaCoreTruthSmoke` 6/6 (Part 8).
- 110 IOG/ICOJ-sourced relationships and 33 approved book relationships
  verified reachable through production retrieval with lineage (Part 3).
