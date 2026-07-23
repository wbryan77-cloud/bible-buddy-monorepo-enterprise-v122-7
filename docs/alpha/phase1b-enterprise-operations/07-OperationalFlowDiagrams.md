# Operational Flow Diagrams
### BibleBuddy Enterprise Operations Foundation — Phase 1B, Deliverable 7 of 10

## Flow 1 — User Assistance question lifecycle (AI-2 → AI-4 → Admin)

```
User/Guest                AI-2                        Store                     AI-4                    Admin
    │                       │                            │                        │                       │
    │ POST /api/support/ask │                            │                        │                       │
    ├──────────────────────>│                             │                        │                       │
    │                       │ Bible/doctrine question?    │                        │                       │
    │                       ├─ YES → redirect (no answer) │                        │                       │
    │                       │ NO → score vs Help Center   │                        │                       │
    │                       │                            │                        │                       │
    │              ┌────────┴────────┐                    │                        │                       │
    │              │ confidence high?│                    │                        │                       │
    │              └────────┬────────┘                    │                        │                       │
    │        YES ───────────┤                              │                        │                       │
    │<── answer + articleId ┤                              │                        │                       │
    │                       │        NO                     │                        │                       │
    │                       ├─ enqueueEscalation() ───────>│ escalations.jsonl      │                       │
    │<── "escalated" ───────┤                              │                        │                       │
    │                       │                              │                        │                       │
    │                       │                              │  buildKnowledgeImprovementReport()             │
    │                       │                              │<───── read (recurring? threshold≥2) ──────────┤
    │                       │                              │                        │  recommendation       │
    │                       │                              │                        ├──────────────────────>│
    │                       │                              │                        │   (Decision Queue: "Support
    │                       │                              │                        │    Escalation" + "Knowledge
    │                       │                              │                        │    Improvement" categories)
    │                       │                              │                        │                       │
    │                       │                              │  Admin resolves escalation (reply) ───────────┤
    │<── (future) notification: support_replies category ──────────────────────────────────────────────────┤
```

## Flow 2 — Notification dispatch (category-gated, disabled by default)

```
Admin / trigger event
      │
      │ (manual admin send this batch; category-scheduled events reuse same path)
      ▼
alphaNotificationScheduler.dispatchCategoryNotification(category, body)
      │
      ▼
buildCategoryNotificationQueue(category)
      │
      ├─ for each registered tester:
      │      getCategoryPreferences(testerId)[category] === true ? enqueue : skip
      │      (security_alerts is always true, cannot be skipped)
      │
      ▼
for each queued tester → dispatchNotification()
      │
      ├─ sendEmailResend()  → real dispatch if RESEND_API_KEY set, else safe no-op
      └─ sendSmsTwilio()    → real dispatch if TWILIO_* set, else safe no-op
      │
      ▼
getCategoryDeliveryReport() → surfaced in Command Center "Notifications" section
```

## Flow 3 — Unified Decision Queue (all sources, one queue, one approval gate)

```
Evidence Candidates ─┐
Governance Review ───┤
Scripture Coverage ──┼──> adminDecisionQueue.buildDecisionQueueItems()
Support Escalation ──┤        (read → normalize → overlay, same pattern for every source)
Knowledge Improvement┘        │
                               ▼
                    GET /unified/decision-queue  (paginated, filterable by category/status/severity)
                               │
                               ▼
                    Admin reviews, applies action (resolve/dismiss/investigate)
                               │
                               ▼
                    applyDecisionQueueAction() → audit record written (adminAuditTrail)
                    (Support Escalation & Knowledge Improvement items handled via
                     source-specific resolve/dismiss branches — no bypass of audit)
```

## Flow 4 — Enterprise Search (single query, many providers)

```
Admin: GET /unified/search?q=...
        │
        ▼
adminGlobalSearch.js :: search(query)
        │
        ├─ runtime provider         (pre-existing)
        ├─ audit provider           (pre-existing)
        ├─ lessons provider         (pre-existing)
        ├─ recommendations provider (pre-existing)
        ├─ operations/alerts provider (pre-existing)
        ├─ documentation provider   (NEW)
        ├─ knowledge provider       (NEW)
        ├─ evidence provider        (NEW)
        └─ support provider         (NEW)
        │
        ▼
merge → rank → paginate (limit clamped) → single response
```

## Flow 5b — Operational Observability (v2.0 addition, pure reuse)

```
Admin (Command Center page load, single /overview fetch)
      │
      ▼
adminCommandCenterAggregator.buildAdminCommandCenterSummary()
      │
      ├─ builds all existing sections (systemHealth, recommendations,
      │   knowledgeImprovement, userAssistance, notifications, ...)
      │
      ▼
computeObservabilitySummary(sections, executiveSummary)
      │   (pure reshape — reads already-built section .data, computes NOTHING new)
      ▼
observability: { runtimeMetrics, queueMetrics, recommendationMetrics,
                  userAssistanceMetrics, notificationMetrics, executiveSummary }
      │
      ├─ rendered client-side as the "Operational Observability" card
      │  (no extra network call — same /overview payload already fetched)
      │
      └─ ALSO exposed standalone: GET /unified/metrics
           (calls buildAdminCommandCenterSummary() internally — for future
            external monitoring/API consumers; zero duplicated computation)
```

## Flow 5 — AI Chief of Staff Q&A (grounded, deterministic)

```
Admin: POST /unified/assistant { question }
        │
        ▼
matchIntent(question)  — deterministic keyword matcher, no free-form fact generation
        │
        ├─ existing intents (operational_overview, runtime_health, founder_summary, ...)
        ├─ documentation_recommendations (NEW) → knowledgeImprovementAdvisor (read-only)
        └─ user_assistance_status (NEW)        → helpCenterContentStore + escalationStore (read-only)
        │
        ▼
response { summary, sourceSystems[], confidence, requiredApproval }
   — never claims to have performed an approval itself (verified by smoke test)
```
