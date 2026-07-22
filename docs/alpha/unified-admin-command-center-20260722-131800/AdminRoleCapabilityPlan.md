# Admin Role & Capability Plan (Part 9 — Future-Ready Foundation)

Status: foundation implemented (`services/adminCapabilities.js`). No
multi-user login exists today and none was built in this batch — this
document describes the capability vocabulary that a future auth layer
would plug into, and confirms current behavior is unchanged.

## Current behavior (unchanged by this batch)

There is exactly one Admin credential mechanism today:
`BIBLE_AUTHORITY_ADMIN_TOKEN` (with `ALPHA_ADMIN_TOKEN` /
`BETA_REVIEW_TOKEN` as equivalents already accepted by
`checkAdminAuth`). Whoever holds that token has full access to
everything in the Admin surface, exactly as before this batch.
`getCurrentActorCapabilities()` reflects this today by returning every
capability unconditionally — it does not change what anyone can do.

## The capability vocabulary

Defined once, in `services/adminCapabilities.js: CAPABILITIES`:

```
VIEW_EXECUTIVE_OVERVIEW
VIEW_USERS_SESSIONS
VIEW_SCRIPTURE_KNOWLEDGE
VIEW_LESSON_ALIGNMENT
VIEW_FOUNDER_INTELLIGENCE
VIEW_OPERATIONS_HEALTH
VIEW_DECISIONS_AUDIT
VIEW_SECURITY
USE_GLOBAL_SEARCH
USE_AI_CHIEF_OF_STAFF
ACT_ON_DECISION_QUEUE
APPROVE_RECOMMENDATIONS
MANAGE_LESSON_ALIGNMENT
```

No business logic anywhere checks a role name directly — everything is
expressed in terms of these capabilities, so a future auth system only
has to answer "does this actor have capability X," not "which
enumerated role is this."

## Future role → capability mapping (documentation only, not enforced yet)

| Future role | Capabilities |
|---|---|
| Owner / CEO | All capabilities |
| Scripture Governance Administrator | View Executive Overview, View Scripture & Knowledge, View Decisions & Audit, Act on Decision Queue, Approve Recommendations, Use Global Search |
| Technical Administrator | View Executive Overview, View Operations & Health, View Security, Use Global Search, Use AI Chief of Staff |
| User Support | View Executive Overview, View Users & Sessions, Use Global Search |
| Lesson Reviewer | View Lesson Alignment, Manage Lesson Alignment, Act on Decision Queue |
| Content Reviewer | View Scripture & Knowledge, View Founder Intelligence, Act on Decision Queue, Approve Recommendations |
| Security and Compliance | View Security, View Decisions & Audit, View Operations & Health |
| Read-Only Analyst | View Executive Overview, View Users & Sessions, View Scripture & Knowledge, View Founder Intelligence, View Operations & Health, Use Global Search |

## What would change when real multi-user roles are added later

1. Replace the single `getCurrentActorCapabilities()` implementation
   with a real lookup: authenticate the actor, find their assigned
   role(s), and return `FUTURE_ROLE_CAPABILITY_MAP[role]` (or a union
   for multiple roles).
2. The unified audit trail already captures `actorId` on every action
   (see `AdminAuditTrailGuide.md`), so per-actor accountability requires
   no schema change — only a real `actorId` value instead of the
   current default `"admin"`.
3. Frontend navigation/actions can be filtered by calling
   `/unified/capabilities` (already implemented, read-only) and hiding
   tabs/buttons the current actor's capability set does not include.
4. No route, service, or data shape used by capability-gated code needs
   to change — only the seam inside `getCurrentActorCapabilities()`.

## Explicit boundaries honored

- Current token protection is unchanged and unweakened.
- No Admin data was made publicly accessible.
- No multi-user login was implemented — this batch stayed within its
  documented scope ("do not build a large enterprise identity system
  during this batch").
