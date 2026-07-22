# Admin Guide — Prioritized Decision Queue

Where: Admin page → **★ Command Center** tab → "Prioritized Decision
Queue" panel.

## What it combines

One queue, merged from three existing sources:

- **Founder Intelligence recommendations** (knowledge gaps, evidence
  correlation, relationship links, original-language/historical
  research suggestions, etc.)
- **Review Queue** (support-graph evidence candidates awaiting Admin
  merge decision)
- **Lesson Alignment submissions** that contain a likely misquote or an
  unresolved Scripture reference

Nothing is duplicated on disk — each item keeps its original identity
(`sourceSystem:nativeId`) and this queue is a read/merge/overlay view on
top of the three existing stores.

## Columns

- **Title / Summary** — plain-language description.
- **Category** — Runtime Bug, Security, User Experience, Response
  Quality, Scripture Coverage, Doctrine Coverage, Original Language,
  Historical Context, Lesson Alignment, Evidence Candidate,
  Relationship Link, Feature Request, or Governance Review.
- **Severity** — Critical / High / Medium / Low.
- **Status** — New, Investigating, Ready for Decision, Approved,
  Rejected, Deferred, or Resolved.
- **Confidence** — how confident the originating system is in this item.
- **Updated** — last time this item's status changed.
- **Actions** — review / approve / reject / defer / investigate /
  resolve buttons, shown per row.

## Filters

Filter by Severity, Category, or Status using the dropdowns above the
table, then click "Apply Filters." Filtering happens on the server —
the browser never has to download every item to filter it.

## What each action actually does

| Action | What happens |
|---|---|
| Approve | If the item came from Founder Intelligence or the Review Queue, calls the **same existing** `recordAdminDecision` / `recordCandidateDecision` function the legacy Admin tabs already use. Lesson Alignment items (which have no underlying approve workflow) are marked Approved in the queue overlay only. |
| Reject | Same as Approve, but records a rejection through the same existing functions. |
| Defer / Investigate / Resolve / Review | Recorded in the Command Center's own status overlay (these richer statuses don't exist in any of the three underlying stores) — never invents a production mutation. |
| Add Admin Note | Attached to the item's overlay entry and audit history; does not change the underlying record. |

Every action — regardless of type — is written to the unified Audit
Trail (see `AdminAuditTrailGuide.md`) with the actor, previous state,
resulting state, and your note.

## Important: this queue never auto-publishes anything

Approving an item here only records the same decision the legacy Admin
review workflow already recorded. If the underlying Governance workflow
requires a further controlled step (e.g., a manual merge into production
knowledge), that step still happens exactly where it already happened
before this batch — this queue does not skip or automate it.
