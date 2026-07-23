# Updated Architecture Diagram — Post Phase 1B
### BibleBuddy Enterprise Operations Foundation — Phase 1B, Deliverable 8 of 10

Baseline: `docs/alpha/enterprise-architecture-review-20260722-141700/02-CurrentStateArchitectureDiagram.md` (pre-Phase-1B). This diagram shows only what changed — the deployment topology, file-based persistence model, and single-process nature described in the baseline are **unchanged** by this batch.

## 1. Logical Domain Map — additions highlighted

```
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                              BIBLEBUDDY MONOLITH (server.js)                               │
│                                                                                             │
│  ┌───────────────────────────┐        ┌────────────────────────────────────────────────┐  │
│  │   END-USER DOMAIN          │        │        ADMIN / FOUNDER DOMAIN (checkAdminAuth) │  │
│  │  (public, unauthenticated) │        │                                                  │  │
│  │                             │        │  Executive Operations Center                    │  │
│  │  • Founder Application (/)  │        │  (admin/bible-authority.html — ONE UI)          │  │
│  │  • Buddy Chat (/buddy)      │        │    └─ adminCommandCenterAggregator.js           │  │
│  │  • Companion AI (AI-1)      │        │         ├─ Executive Overview      [existing]   │  │
│  │    — UNCHANGED              │        │         ├─ Operational/Runtime Health[existing] │  │
│  │                             │        │         ├─ Founder Intelligence    [existing]   │  │
│  │  ★ NEW: Help & Support      │        │         ├─ Knowledge Coverage      [existing]   │  │
│  │    modal (public/index.html)│        │         ├─ Lesson Alignment        [existing]   │  │
│  │    └─ POST /api/support/ask │        │         ├─ Review Queue            [existing]   │  │
│  │       (AI-2, public)        │◄───────┼───┐     ├─ Governance                [existing]   │  │
│  │                             │        │   │     ├─ Decision Queue     [existing, +2 srcs]│  │
│  └───────────────────────────┘        │   │     ├─ ★ Notifications          [NEW]         │  │
│                                          │   │     ├─ ★ User Assistance        [NEW]         │  │
│                                          │   │     └─ ★ Knowledge Improvement  [NEW]         │  │
│                                          │   │                                                │  │
│                                          │   │  ★ AI Chief of Staff (AI-3, enhanced)          │  │
│                                          │   │    adminChiefOfStaff.js +2 intents             │  │
│                                          │   │                                                │  │
│                                          │   │  ★ Enterprise Search (enhanced)                │  │
│                                          │   │    adminGlobalSearch.js +4 providers            │  │
│                                          │   └────────────────────────────────────────────────┘  │
│                                                                                             │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

## 2. New/enhanced service map

```
                         ┌──────────────────────────────────┐
                         │  routes/userAssistance.js  [NEW] │
                         │  mounted at /api/support           │
                         └────────────────┬────────────────┘
                                          │
        ┌─────────────────────────────────┼─────────────────────────────────┐
        ▼                                 ▼                                 ▼
┌──────────────────────┐   ┌──────────────────────────────┐   ┌───────────────────────────────┐
│ helpCenterContentStore│   │ userAssistanceEscalationStore │   │  userAssistanceAssistant (AI-2)│
│ [NEW]                 │◄──┤ [NEW]                         │◄──┤  [NEW]                          │
│ data/help-center-      │   │ data/user-assistance-         │   │  answers from Help Center only, │
│ articles.json          │   │ escalations.jsonl (append-only)│  │  escalates on low confidence    │
└──────────────────────┘   └──────────────────────────────┘   └───────────────────────────────┘
                                          ▲
                                          │ reads
                         ┌────────────────┴────────────────┐
                         │ knowledgeImprovementAdvisor.js  │
                         │ (AI-4) [NEW] — read-only         │
                         │ composes: escalations, audit,   │
                         │ feedback, Help Center coverage  │
                         └────────────────┬────────────────┘
                                          │ recommendations (requiredApproval:true)
                                          ▼
                         ┌──────────────────────────────────┐
                         │ adminDecisionQueue.js [ENHANCED] │
                         │ +TYPE.SUPPORT_ESCALATION          │
                         │ +TYPE.KNOWLEDGE_IMPROVEMENT       │
                         └──────────────────────────────────┘
```

## 3. Notification framework (enhanced)

```
alphaTesterManager.js [ENHANCED]              alphaNotificationScheduler.js [ENHANCED]
  +NOTIFICATION_CATEGORIES (9)                   +buildCategoryNotificationQueue()
  +DEFAULT_CATEGORY_PREFERENCES                  +dispatchCategoryNotification()
  +getCategoryPreferences()/setCategoryPreference() +getCategoryDeliveryReport()
                    │                                          │
                    └──────────────────┬───────────────────────┘
                                       ▼
                    lib/providers/email/resend.js  [FIXED: ESM→CJS, real dispatch behind key-gate]
                    lib/providers/sms/twilio.js    [FIXED: ESM→CJS, real dispatch behind key-gate]
```

## 3b. v2.0 execution batch additions (Observability + Role API visibility)

```
adminCommandCenterAggregator.js [ENHANCED, v2.0]
  +computeObservabilitySummary(sections, executiveSummary)   — pure reshape, zero new computation
  +buildOperationalMetricsSummary()                          — standalone reuse of buildAdminCommandCenterSummary()
  └─ exposed as: GET /unified/metrics  [NEW route]
     and as: overview.observability   [NEW field on existing /unified/overview response]

adminCapabilities.js [ENHANCED, v2.0]
  (BATCH_NAMED_ROLE_ALIASES + getCapabilitiesForNamedRole already existed
   from Phase 1B v1 — v2.0 makes them API-visible)
  └─ GET /unified/capabilities now also returns: namedRoleCapabilities
     { FOUNDER, ADMINISTRATOR, REVIEWER, SUPPORT, OPERATIONS, ENGINEERING }
     each resolved to { aliasesTo, capabilities: [...] }
```

## 4. What did NOT change (confirmed by inspection + regression)

- Deployment topology (single Render web service, single Node process, file-based persistence) — unchanged.
- Companion AI (AI-1) orchestration chain — unchanged, zero files touched.
- `checkAdminAuth()` unified authentication middleware from Phase 1A — unchanged; every new route reuses it.
- Governance/Scripture Authority validator stack — unchanged, zero files touched.
- 619+ existing service files — none deleted, none replaced; 10 new files added, 16 existing files enhanced (see Completion Report, Deliverable 10, for the exact list).
