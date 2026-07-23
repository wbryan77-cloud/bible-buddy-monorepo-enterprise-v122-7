# Knowledge Improvement Pipeline (AI-4 — Knowledge Improvement AI) — Design
### BibleBuddy Enterprise Operations Foundation — Phase 1B, Deliverable 4 of 10

## 1. Status

**Net new orchestration over existing analytics**, per the Enterprise Architecture Review. AI-4 did not exist as a named system before this batch; it is implemented as a single thin, read-only service that composes signals already available in the system (escalations, Help Center content, audit trail, feedback) rather than building new analytics engines from scratch.

## 2. Component

```
services/knowledgeImprovementAdvisor.js :: buildKnowledgeImprovementReport()
   ├─ detectRecurringQuestionsAndDocGaps()   — reads userAssistanceEscalationStore
   ├─ detectRecurringAdminResponses()        — reads adminAuditTrail
   ├─ detectFeatureConfusion()               — reads Alpha feedback tags
   └─ detectOnboardingFriction()             — reads escalation topics + Help Center coverage
```

Every detector is **read-only** — none of them writes to any content store, knowledge base, or approval queue directly. The report they jointly produce is surfaced through the existing Admin Decision Queue as a new item type (`KNOWLEDGE_IMPROVEMENT`), which already requires administrator action before anything downstream happens.

## 3. Detection logic

| Signal (per batch checklist) | Detector | Method |
|---|---|---|
| Frequently asked questions | `detectRecurringQuestionsAndDocGaps` | Normalizes escalation question text (significant-word topic key), counts recurrence ≥ threshold (2) |
| Failed support interactions | `detectRecurringQuestionsAndDocGaps` | Escalations = interactions where AI-2 confidence was too low to answer |
| Repeated administrator responses | `detectRecurringAdminResponses` | Scans `adminAuditTrail` for repeated resolution text patterns |
| Documentation gaps | `detectRecurringQuestionsAndDocGaps` | Recurring question with no confidently-matching Help Center article → `RECURRING_SUPPORT_QUESTION` / `DOCUMENTATION_GAP` recommendation |
| Missing FAQs | Same detector — recurring questions with zero article match at all |
| Feature confusion | `detectFeatureConfusion` | Alpha feedback tags such as `too_robotic`, `didnt_listen`, `confusing` clustered by frequency |
| Onboarding friction | `detectOnboardingFriction` | Escalation topics matching onboarding-stage keywords, or repeated "Getting Started" article views without resolution |

## 4. Output contract

```json
{
  "id": "doc-gap:<hash>",
  "type": "RECURRING_SUPPORT_QUESTION",
  "title": "Recurring support question, existing article may need improvement: \"...\"",
  "evidence": ["...", "...", "..."],
  "occurrenceCount": 3,
  "confidence": "MEDIUM",
  "suggestedAction": "Review and clarify the closest-matching existing Help Center article.",
  "requiredApproval": true,
  "generatedAt": "..."
}
```

`requiredApproval: true` on every recommendation is a hard invariant — verified by reading the current implementation and by the live test below.

## 5. Hard constraint verification

- **Never modifies production automatically:** confirmed by code inspection — `knowledgeImprovementAdvisor.js` has no write/update/delete calls into `helpCenterContentStore`, doctrine stores, or evidence stores. It only reads and returns recommendation objects.
- **Administrator approval required:** every recommendation flows into the existing Decision Queue overlay (`adminDecisionQueue.js`), which already enforces human action before any resulting state change, per the same two-gate pipeline used for Evidence Candidates and Governance Review items.
- **Recommendations only:** the AI-3 Chief of Staff's new `documentation_recommendations` intent (Deliverable 2) narrates this report's contents but does not act on it either.

## 6. Live verification (this batch)

Before seeding: `totalRecommendations: 0` (empty escalation history in the fresh test run).

After submitting the same low-confidence question three times through AI-2 (`POST /api/support/ask`):

```json
{
  "totalRecommendations": 1,
  "recommendations": [{
    "type": "RECURRING_SUPPORT_QUESTION",
    "title": "Recurring support question, existing article may need improvement: \"why is the app so slow today unexpectedly\"",
    "occurrenceCount": 3,
    "confidence": "MEDIUM",
    "requiredApproval": true
  }]
}
```

This recommendation simultaneously appeared in the Decision Queue's category breakdown (`"Knowledge Improvement": 1`), confirming the full pipeline: **AI-2 escalation → AI-4 detection → Decision Queue → (pending) Administrator approval.** No step in that chain wrote to production knowledge without a human in the loop.

## 7. Explicitly out of scope (per batch mandate)

- No automatic article creation/editing.
- No automatic doctrine or Scripture changes (AI-4 never touches those stores — this was verified by code inspection, not assumed).
- No bypass of the existing approval gate.
