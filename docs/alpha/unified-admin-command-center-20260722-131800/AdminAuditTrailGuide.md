# Admin Guide — Unified Audit Trail

Where: Admin page → **★ Command Center** tab → "Audit History" panel.
Backing service: `services/adminAuditTrail.js`. Storage:
`data/admin-command-center/unified-audit-trail.jsonl` (gitignored,
append-only, rotates at 5MB, keeps the 3 most recent rotated backups —
same policy as every other JSONL log in this codebase, via
`services/safeJsonlWriter.js`).

## What's recorded on every entry

| Field | Meaning |
|---|---|
| `correlationId` | Unique id for this event. |
| `at` | Timestamp. |
| `action` | e.g. `DECISION_QUEUE_APPROVE`, `AI_CHIEF_OF_STAFF_QUERY`. |
| `actionType` | REVIEW / APPROVE / REJECT / DEFER / ASSIGN / INVESTIGATE / RESOLVE / NOTE / QUERY / READ. |
| `target` | The item/resource id acted on. |
| `sourceSystem` | Which underlying system owns that item. |
| `category` | For filtering, e.g. `DECISION_QUEUE`, `AI_ASSISTANT`. |
| `severity` | When applicable. |
| `status` | Outcome, e.g. `COMPLETED`. |
| `previousState` / `resultingState` | Before/after snapshot (secrets stripped — see below). |
| `approvalReasonOrNote` | Your note, if any. |
| `actorId` | Defaults to `"admin"` in today's single-admin mode. |
| `aiRecommendationInvolved` | true when the AI Chief of Staff was involved. |
| `confidenceAtDecision` | Confidence level recorded at decision time, if applicable. |
| `rollbackReference` | Reserved for future use. |

## What is never recorded

- The Admin token, or any value under a key matching
  `/token|password|secret|api[_-]?key|authorization/i` — automatically
  redacted to `"[REDACTED]"` by `stripSecrets()` before the entry is
  ever written to disk.
- Private Founder content (e.g., raw prayer text or full lesson bodies)
  — only references, ids, and counts are stored.

## Filtering

Filter by date range, action, category, status, source system, or
severity — all applied server-side before the page is returned (see
`AdminScalabilityAssessment.md`). Default page size is 100, capped at
500 per request.

## Append-only guarantee

There is no update or delete endpoint for audit records. The only way an
entry is written is through `recordAdminAuditEvent()`, called
automatically whenever a Decision Queue action or an AI Chief of Staff
query happens through the Command Center. Ordinary application use can
only add to this trail, never rewrite history.

## Relationship to the two other existing audit logs

This unified trail is additive and does not replace:

- `services/iogIcojGovernedIngestion.js` (`appendAuditLog` /
  `readKnowledgeAuditLog`) — ingestion/knowledge-candidate decisions.
- `services/founderIntelligenceRecommendationStore.js`
  (`readDecisionsLog`) — Founder Intelligence recommendation decisions.

Those two remain authoritative for their own domains and are unchanged.
The unified trail gives you one consolidated, cross-system view *in
addition to* them, including entries for actions (like Investigate/Defer
on Lesson Alignment items) that had no audit trail of any kind before
this batch.
