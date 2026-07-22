# Admin Guide — Weekly Review

Where: Admin page → **★ Command Center** tab → "Daily / Weekly Briefing"
panel → click "This Week."

## What the Weekly Briefing shows

- **Week-over-week activity** — computed from runtime-health history if
  a sample from ~7 days ago exists; otherwise reports
  `BASELINE_ESTABLISHING` honestly instead of a made-up percentage.
- **Feature usage delta** — change in witness-retrieval, prayer, lesson
  alignment, original-language, and historical-context usage counts
  over the week (same baseline rule applies).
- **Founder Trends** — from the existing Founder Operational
  Intelligence trend analysis.
- **Recommendation acceptance** — approval rate, breakdown by status and
  type, and how many Admin decisions were recorded this week.
- **Operational Intelligence accuracy** — false positives flagged and
  duplicates collapsed, from the existing effectiveness-metrics engine.
- **Knowledge growth** — from the same engine; reports
  `NOT_TRACKED_THIS_RUN` when no coverage snapshot was supplied, rather
  than fabricating a growth number.
- **Governance activity** — total and this-week decision counts.
- **Runtime reliability this week** — requests/errors/timeouts delta.
- **Priorities for next week** — a short list, prioritizing any
  outstanding Critical/High alerts first, then routine Decision Queue
  review.

## When you'll see "BASELINE_ESTABLISHING"

The very first week after this Command Center is deployed, there is no
7-day-old runtime-health history sample yet, so the week-over-week
activity and feature-usage-delta fields will honestly show
`BASELINE_ESTABLISHING` rather than a fabricated percentage. This is
expected and will resolve itself automatically once a full week of
history has accumulated — no action needed.

## Suggested weekly cadence

1. Read the Weekly Briefing once per week (e.g., Monday morning).
2. Cross-reference "Priorities for next week" against the Decision
   Queue filtered by High/Critical severity.
3. Spot-check Founder Intelligence for any new recurring pattern the
   trend analysis flagged.
4. Note anything you deferred this week — the Decision Queue keeps a
   full audit history per item (see `AdminAuditTrailGuide.md`) so
   nothing gets silently forgotten.
