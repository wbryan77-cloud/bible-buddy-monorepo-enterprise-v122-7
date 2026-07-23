# Enterprise Search — Design
### BibleBuddy Enterprise Operations Foundation — Phase 1B, Deliverable 6 of 10

## 1. Status

**Enhancement of an existing single search surface.** `services/adminGlobalSearch.js` already implemented a bounded, in-process, provider-pattern search reachable via `GET /admin/api/bible-authority/unified/search`. Phase 1B adds four new providers to the same `PROVIDERS` array — it does not create a second search endpoint or a separate index.

## 2. Provider set after this batch

| Provider | Status | Searches |
|---|---|---|
| Runtime / audit / operations providers | Pre-existing | Runtime health events, audit trail, alerts |
| Recommendations / decisions | Pre-existing | Decision Queue items |
| Lessons | Pre-existing | Lesson alignment data |
| **Documentation** | **NEW** | Indexed project markdown files (architecture docs, design docs, this deliverable set included) |
| **Knowledge** | **NEW** | Approved knowledge topics/snapshots and doctrine metadata |
| **Evidence** | **NEW** | Evidence cards and cross-reference modules |
| **Support** | **NEW** | Help Center articles + User Assistance escalations |

## 3. Contract preserved

Every provider — old and new — returns results shaped identically:

```
{ sourceSystem, resultType, title, snippet?, drillDownTarget, ... }
```

This was explicitly verified by the smoke assertion `search_result_shape_has_source_and_drilldown`, which passed across the full merged result set (27 total results in the seeded test run) including the four new providers.

Existing safety properties were preserved and re-verified:

- `search_minimum_query_length_enforced` — single-character queries still correctly return empty.
- `search_pagination_respects_limit` / `scalability_search_limit_clamped` — the new providers participate in the same pagination and hard limit-clamp (requested 999999 → clamped to 100) as pre-existing ones.
- `search_requires_authorization` — the endpoint remains behind Phase 1A's unified `checkAdminAuth()`; unauthenticated requests get 401.

## 4. One search, multiple sources (per batch mandate)

The batch requires search across: Documentation, Knowledge, Runtime, Audit, Lessons, Recommendations, Evidence, Support, Operations. After this batch, all nine are reachable from the single `GET /unified/search?q=...` endpoint:

| Mandated domain | Provider |
|---|---|
| Documentation | NEW `searchDocumentation` |
| Knowledge | NEW `searchKnowledge` |
| Runtime | Pre-existing runtime provider |
| Audit | Pre-existing audit provider |
| Lessons | Pre-existing lesson provider |
| Recommendations | Pre-existing decision/recommendation provider |
| Evidence | NEW `searchEvidence` |
| Support | NEW `searchSupport` |
| Operations | Pre-existing operations/alert provider |

## 5. Live verification (this batch)

```
GET /unified/search?q=notification&limit=20
→ total: 3
  - alphaNotificationScheduler: NOTIFICATION_CATEGORY_DISPATCH   (audit/operations provider — pre-existing)
  - support: How do I control my notifications?                 (NEW support provider)
  - documentation: Notification Framework Design                (NEW documentation provider)
```

A single query surfaced results from three independent providers (one pre-existing, two new) in one ranked, paginated response — confirming "one search, multiple data sources" rather than three separate lookups.

## 6. Explicitly out of scope (per batch mandate)

- No external search engine/index (e.g. Elasticsearch) was introduced; the existing bounded in-process pattern was extended, consistent with "reuse before rebuilding" at current Alpha scale.
- No changes to result ranking algorithm beyond adding new providers into the existing merge/sort step.
