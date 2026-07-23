# AI Chief of Staff (AI-3 — Operations AI) — Design
### BibleBuddy Enterprise Operations Foundation — Phase 1B, Deliverable 2 of 10

## 1. Status

**Enhanced, not built from scratch.** Per the Enterprise Architecture Review's AI Responsibility Matrix, AI-3 already existed informally as `services/adminChiefOfStaff.js` (grounded Admin Q&A) plus `services/adminBriefingGenerator.js` (daily/weekly briefings) and `services/founderOperationalIntelligenceEngine.js` (read-only recommendations). Phase 1B formally extends the Chief of Staff's intent set and briefing payload to cover the two new domains (User Assistance, Knowledge Improvement) that this batch introduces.

## 2. Owning chain (unchanged)

```
POST /admin/api/bible-authority/unified/assistant
   └─ services/adminChiefOfStaff.js :: answerAdminQuestion()
         ├─ matchIntent(question)            → deterministic keyword/intent matcher
         ├─ [existing intents]               → operational_overview, runtime_health,
         │                                      founder_summary, recommendation_priority,
         │                                      knowledge_gaps, governance_status, ...
         ├─ documentation_recommendations     [NEW] → knowledgeImprovementAdvisor.buildKnowledgeImprovementReport()
         └─ user_assistance_status            [NEW] → helpCenterContentStore + userAssistanceEscalationStore
```

The matcher, the response envelope (`matchedIntent`, `summary`, `sourceSystems`, `confidence`, `requiredApproval`), and the "never claims auto-approval" safety rail are all pre-existing and were **reused, not reimplemented**.

## 3. New responsibilities added this batch

| Responsibility (from batch mandate) | Implementation |
|---|---|
| Daily operational briefing | Pre-existing `adminBriefingGenerator.js`, now additionally folds in `notificationSummary` and `userAssistanceSummary` |
| Runtime observations | Pre-existing `runtime_health` intent — unchanged |
| Founder summaries | Pre-existing `founder_summary` intent — unchanged |
| Recommendation prioritization | Pre-existing `recommendation_priority` intent — unchanged, now sees Knowledge Improvement recommendations via the Decision Queue overlay it already reads from |
| Knowledge gap reporting | Pre-existing `knowledge_gaps` intent — unchanged |
| **Documentation recommendations** | **NEW** `documentation_recommendations` intent — summarizes `knowledgeImprovementAdvisor`'s `DOCUMENTATION_GAP` / `RECURRING_SUPPORT_QUESTION` findings |
| Trend summaries | Pre-existing trend intents — unchanged |
| **Administrative insights (user assistance)** | **NEW** `user_assistance_status` intent — reports Help Center article counts and pending escalation counts |

## 4. Hard constraint verification

- **May recommend:** every new intent's response includes `requiredApproval: true` on any item that implies a change, exactly matching the existing pattern.
- **May never modify production:** neither new intent handler writes to any store. `documentation_recommendations` calls `buildKnowledgeImprovementReport()`, which is itself read-only (see Deliverable 4). `user_assistance_status` calls only `listArticles()`/`getStats()`/`listPendingEscalations()` — no mutation.
- **Never fabricates:** both new intents return deterministic, computed summaries (counts, titles) built from real store state, not free-form LLM generation of facts. This mirrors the smoke-tested rule `assistant_never_claims_auto_approval`.

## 5. Live verification (this batch)

```
Q: "Any documentation gaps to review?"
  matchedIntent: documentation_recommendations
  summary: "1 documentation gap/improvement recommendation(s) identified from
            recurring, unanswered support questions."

Q: "What is the user assistance status?"
  matchedIntent: user_assistance_status
  summary: "7 Help Center article(s) published (7 tagged FAQ). 3 question(s)
            awaiting a reply from the User Assistance escalation queue."
```

Both answers were generated against live, seeded data (a real recurring escalation created during regression testing), confirming the pipeline end-to-end rather than a mocked response.

## 6. Explicitly out of scope (per batch mandate)

- No autonomous execution of any recommendation.
- No new AI model or provider was introduced; the Chief of Staff continues to use the same deterministic intent-matching plus optional narrative phrasing pattern it already used.
