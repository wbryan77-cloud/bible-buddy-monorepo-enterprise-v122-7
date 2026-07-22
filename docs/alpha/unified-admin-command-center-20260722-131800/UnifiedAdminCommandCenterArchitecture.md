# Unified Admin Command Center — Architecture

Status: describes what was actually implemented in this batch, on top of
the pre-existing Admin surface documented in `AdminSystemInventory.md`.

## 1. Goal

One Admin entry point —
`/admin/bible-authority.html` — that aggregates, summarizes, prioritizes,
and surfaces every existing Admin system, without replacing or
duplicating any of them.

## 2. Layering

```
┌─────────────────────────────────────────────────────────────┐
│  admin/bible-authority.html + admin/js/bible-authority.js   │
│  "★ Command Center" tab (new, now the default landing tab)  │
│  + all pre-existing tabs (Executive Growth, Scripture Review,│
│    Engineering Intelligence, Founder Readiness, Founder      │
│    Intelligence) — UNCHANGED, still fully functional          │
└───────────────────────────┬───────────────────────────────────┘
                            │ fetch() with Authorization: Bearer <token>
┌───────────────────────────▼───────────────────────────────────┐
│  routes/bibleAuthorityAdmin.js                               │
│  /admin/api/bible-authority/unified/*  (NEW, additive)       │
│  every pre-existing route above this block is UNCHANGED       │
└───────────────────────────┬───────────────────────────────────┘
                            │ requires(...)
┌───────────────────────────▼───────────────────────────────────┐
│  NEW aggregation/orchestration services (this batch)         │
│    adminCommandCenterAggregator.js  (Part 2 — composes all)  │
│    adminDecisionQueue.js            (Part 5)                 │
│    adminAlertCenter.js              (Part 12)                │
│    adminAuditTrail.js               (Part 10)                │
│    adminBriefingGenerator.js        (Part 11)                │
│    adminChiefOfStaff.js             (Part 4)                 │
│    adminGlobalSearch.js             (Part 7)                 │
│    adminCapabilities.js             (Part 9)                 │
└───────────────────────────┬───────────────────────────────────┘
                            │ requires(...) — READ ONLY, no forks
┌───────────────────────────▼───────────────────────────────────┐
│  EXISTING, UNCHANGED, AUTHORITATIVE services                  │
│    runtimeHealthMonitor.js                                    │
│    founderAdminConsoleStatus.js                                │
│    knowledgeAnalyticsSnapshotStore.js                          │
│    lessonScriptureAlignmentAnalyzer.js                         │
│    founderOperationalIntelligenceEngine.js                     │
│    founderIntelligenceRecommendationStore.js                   │
│    supportGraphCandidateQueue.js                                │
└─────────────────────────────────────────────────────────────┘
```

No existing service was modified to build this layer, except:

- `routes/bibleAuthorityAdmin.js` — additive routes appended at the
  bottom of the file, behind the same `checkAdminAuth` middleware already
  used by every other route in that file, plus one additional feature
  flag check.
- `admin/bible-authority.html` / `admin/js/bible-authority.js` — additive
  UI (new tab + new section), the existing tabs/sections/JS were not
  removed or rewritten.

## 3. The unified Admin summary contract

`adminCommandCenterAggregator.js` exposes one function,
`buildAdminCommandCenterSummary()`, returning:

```
{
  ok, generatedAt, overallStatus,
  build, systemHealth, usersAndSessions, experienceQuality,
  scriptureAndKnowledge, lessonAlignment, founderIntelligence,
  recommendations, security, alerts, audit,
  executiveSummary
}
```

Every section (except `build` and `executiveSummary`, which are simple
value objects) follows the same envelope:

```
{
  status: "OK" | "DEGRADED" | "ERROR" | "UNAVAILABLE",
  lastUpdated: <ISO timestamp>,
  sourceSystem: "<existing service/module name>",
  dataFreshness: "LIVE" | "CACHED" | "SNAPSHOT",
  errors: [ "<message>", ... ],
  drillDownTarget: "#<existing-section-id>",
  data: { ... section-specific fields ... }
}
```

This is implemented once, in a `buildSection()` helper, and every section
builder wraps its own `try { ... } catch` around one specific existing
service call. If that one service throws or is unavailable, only that
section reports `status: "ERROR"` with the underlying error message in
`errors[]` — the rest of the response, and the whole HTTP request, still
succeeds with `200 OK`. Nothing is fabricated when a source is
unavailable; the caller sees an honest gap instead of a guessed number.

## 4. Where each Part of the batch lives in code

| Part | What | File(s) |
|---|---|---|
| 1 | Discovery | `AdminSystemInventory.md` / `.json` |
| 2 | Aggregation layer | `services/adminCommandCenterAggregator.js` |
| 3 | Executive Overview | `computeExecutiveSummary()` in the aggregator + `#command-center` section in `admin/bible-authority.html` + `renderCCOverview()` in `admin/js/bible-authority.js` |
| 4 | AI Chief of Staff | `services/adminChiefOfStaff.js` + `/unified/assistant` route + `renderCCAssistantAnswer()` |
| 5 | Decision Queue | `services/adminDecisionQueue.js` + `/unified/decision-queue*` routes + `renderCCQueue()` |
| 6 | Drill-down sections | Existing tabs (`Executive Growth`, `Scripture Authority Review`, `Engineering Intelligence`, `Founder Readiness`, `Founder Intelligence`) plus `data-goto` / `link-drill` navigation from the new Command Center tab into them |
| 7 | Global Search | `services/adminGlobalSearch.js` + `/unified/search` route + `renderCCSearchResults()` |
| 8 | One-Admin Mode | Command Center is now the default landing tab; one token entry; one search bar; one queue; one alert list; one audit list; one briefing panel |
| 9 | Role foundation | `services/adminCapabilities.js` + `AdminRoleCapabilityPlan.md` |
| 10 | Audit trail | `services/adminAuditTrail.js` (`data/admin-command-center/unified-audit-trail.jsonl`) |
| 11 | Briefings | `services/adminBriefingGenerator.js` + `/unified/briefing/daily` + `/unified/briefing/weekly` + `renderCCBriefing()` |
| 12 | Alerts | `services/adminAlertCenter.js` + `/unified/alerts` route + `renderCCAlerts()` |
| 13 | Security | Reused `checkAdminAuth`; see `AdminSecurityVerification.md` |
| 14 | Scalability | See `AdminScalabilityAssessment.md` |
| 15 | UX | Plain-language cards, badges, tooltips (`ⓘ` info spans), loading/empty/error states in `admin/js/bible-authority.js` |
| 16 | Testing | `scripts/alpha/unifiedAdminCommandCenterSmoke.js` (`npm run admin-command-center:smoke`) |
| 17 | Deployment safety | `ADMIN_UNIFIED_COMMAND_CENTER_ENABLED` flag; see `AdminDeploymentAndRollback.md` |

## 5. Explicit non-goals honored

- No Scripture text, doctrine content, or governance rule was modified.
- No existing route was deleted, renamed, or had its response shape
  changed.
- No production knowledge mutation happens as a side effect of any
  `/unified/*` route. Approve/Reject on the Decision Queue calls the
  *same* existing `recordAdminDecision` / `recordCandidateDecision`
  functions the legacy Admin UI already called — this layer does not
  invent a new mutation path.
- No second monolithic "do everything" service was created — each Part
  is its own small file with a single responsibility, composed by the
  aggregator.
